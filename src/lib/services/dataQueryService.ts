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
    const { data: fileData } = await supabase
        .from("data_sources")
        .select("file_name")
        .eq("id", query.dataSourceId)
        .single();

    const fileName = fileData?.file_name || "Unknown File";

    // 2. Fetch absolutely ALL rows for this file/sheet to bypass limits correctly
    // Notice we don't apply limit here so we can do accurate server-side aggregations across 1000s of rows.
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: rows, error } = await supabase
            .from("data_source_rows")
            .select("row_data")
            .eq("data_source_id", query.dataSourceId)
            .eq("sheet_name", query.sheetName)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Supabase Query Error:", error);
            break;
        }

        if (rows && rows.length > 0) {
            allRows = allRows.concat(rows.map(r => r.row_data));
            page++;
            if (rows.length < pageSize) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    // 3. Apply deterministic filtering in application code
    const filtered = allRows.filter(row => {
        for (const f of query.filters) {
            const val = row[f.column];
            if (val === undefined || val === null) return false;

            const strVal = String(val).toLowerCase();
            const strFilter = String(f.value).toLowerCase();
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
            const targetCol = query.targetColumn; // explicit bound 
            const nums = filtered.map((r: any) => {
                const v = parseFloat(String(r[targetCol]).replace(/[^0-9.-]+/g, ""));
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
