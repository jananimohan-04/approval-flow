import { createClient } from "@supabase/supabase-js";

// Uses anon key + user token to ensure RLS is strictly enforced!
export function getSecureServerSupabase(accessToken: string) {
    const url = process.env["VITE_SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"] || "";
    const key = process.env["VITE_SUPABASE_ANON_KEY"] || process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "";

    if (!url || !key) {
        throw new Error("Missing Supabase environment variables on server.");
    }

    return createClient(url, key, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}

export type QueryOperator = "eq" | "contains" | "gt" | "lt";
export type QueryOperation = "count" | "sum" | "avg" | "min" | "max" | "list";

export interface StructuredQuery {
    dataSourceId: string;
    sheetName: string;
    filters: {
        column: string;
        operator: QueryOperator;
        value: string | number;
    }[];
    operation: QueryOperation;
    targetColumn?: string;
    limit?: number;
}

export interface QueryResult {
    query: StructuredQuery;
    result: any;
    recordsAnalyzed: number;
    fileName?: string;
}

export async function executeStructuredQuery(query: StructuredQuery, accessToken: string): Promise<QueryResult> {
    const supabase = getSecureServerSupabase(accessToken);

    // 1. Resolve file name for context
    let fileData = null;
    const { data: byId } = await supabase
        .from("data_sources")
        .select("file_name, company_id, mime_type, google_file_id")
        .eq("id", query.dataSourceId)
        .maybeSingle();

    if (byId) {
        fileData = byId;
    } else {
        const { data: byName } = await supabase
            .from("data_sources")
            .select("file_name, company_id, mime_type, google_file_id")
            .ilike("file_name", `%${query.dataSourceId}%`)
            .limit(1);
        if (byName && byName.length > 0) fileData = byName[0];
    }

    if (!fileData) throw new Error(`Data source not found for reference: ${query.dataSourceId}`);
    const fileName = fileData.file_name || "Unknown File";

    // 2. Fetch connection credentials bypassing user trust for server-executed Drive stream
    const { data: conn } = await supabase.from('google_drive_connections')
        .select('user_id')
        .eq('company_id', fileData.company_id)
        .single();

    if (!conn) throw new Error("No connected Drive account for this company.");

    const { getValidToken } = await import("./driveFunctions");
    const token = await getValidToken(conn.user_id);

    const downloadUrl = fileData.mime_type === "application/vnd.google-apps.spreadsheet"
        ? `https://www.googleapis.com/drive/v3/files/${fileData.google_file_id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
        : `https://www.googleapis.com/drive/v3/files/${fileData.google_file_id}?alt=media`;

    const dlRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!dlRes.ok) throw new Error("Failed to read required data from connected Google Drive.");

    const buffer = await dlRes.arrayBuffer();
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array" });

    // Case-insensitive sheet matching to handle AI hallucinated casings
    const sheetKey = Object.keys(workbook.Sheets).find(
        k => k.trim().toLowerCase() === query.sheetName.trim().toLowerCase()
    );
    const sheet = sheetKey ? workbook.Sheets[sheetKey] : null;

    let allRows: any[] = [];
    if (sheet) {
        allRows = XLSX.utils.sheet_to_json(sheet, { blankrows: false, defval: "" });
    }

    // 3. Apply deterministic filtering in application code
    const filtered = allRows.filter(row => {
        const lowerRow: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
            lowerRow[k.trim().toLowerCase()] = v;
        }

        for (const f of query.filters) {
            const searchCol = f.column.trim().toLowerCase();
            const val = lowerRow[searchCol];
            if (val === undefined || val === null) return false;

            const strVal = String(val).toLowerCase().trim();
            const strFilter = String(f.value).toLowerCase().trim();
            const numVal = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
            const numFilter = parseFloat(String(f.value));

            if (f.operator === "eq" && strVal !== strFilter) return false;
            if (f.operator === "contains" && !strVal.includes(strFilter)) return false;

            if (f.operator === "gt") {
                if (isNaN(numVal) || isNaN(numFilter) || numVal <= numFilter) return false;
            }
            if (f.operator === "lt") {
                if (isNaN(numVal) || isNaN(numFilter) || numVal >= numFilter) return false;
            }
        }
        return true;
    });

    // 4. Perform requested exact operation
    let finalResult: any = null;

    if (query.operation === "count") {
        finalResult = filtered.length;
    }
    else if (query.operation === "list") {
        finalResult = query.limit ? filtered.slice(0, query.limit) : filtered.slice(0, 100);
    }
    else {
        // Math operations
        if (!query.targetColumn) {
            finalResult = "Error: targetColumn required for math operations.";
        } else {
            const targetCol = query.targetColumn.trim().toLowerCase();
            const nums = filtered.map((r: any) => {
                const lowerR: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(r)) {
                    lowerR[k.trim().toLowerCase()] = v;
                }
                const v = parseFloat(String(lowerR[targetCol]).replace(/[^0-9.-]+/g, ""));
                return isNaN(v) ? 0 : v;
            });

            if (nums.length === 0) finalResult = 0;
            else if (query.operation === "sum") finalResult = nums.reduce((a, b) => a + b, 0);
            else if (query.operation === "avg") finalResult = nums.reduce((a, b) => a + b, 0) / nums.length;
            else if (query.operation === "max") finalResult = Math.max(...nums);
            else if (query.operation === "min") finalResult = Math.min(...nums);
        }
    }

    return {
        query,
        result: finalResult,
        recordsAnalyzed: allRows.length,
        fileName
    };
}
