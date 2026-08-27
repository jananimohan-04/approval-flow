import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { executeStructuredQuery } from "./src/lib/services/dataQueryService";

const env = fs.readFileSync(".env", "utf-8");
let supabaseUrl = "";
let supabaseKey = "";
for (const line of env.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim();
    if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) supabaseKey = line.split("=")[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        console.log("Mocking AI structured query...");

        // Mock query from AI
        const query = {
            dataSourceId: "testing",
            sheetName: "Sheet1",
            operation: "count",
            filters: []
        };

        // Let's resolve the file manually to mock getSecureServerSupabase
        let fileData = null;
        const { data: byName } = await supabase
            .from("data_sources")
            .select("file_name, company_id, mime_type, google_file_id")
            .ilike("file_name", `%${query.dataSourceId}%`)
            .limit(1);
        if (byName && byName.length > 0) fileData = byName[0];

        if (!fileData) throw new Error(`Data source not found for reference: ${query.dataSourceId}`);
        console.log("Found fileData:", fileData);

        // Fetch connection credentials bypassing user trust for server-executed Drive stream
        const { data: conns } = await supabase.from('google_drive_connections')
            .select('user_id, encrypted_access_token')
            .limit(1);

        const conn = conns && conns.length > 0 ? conns[0] : null;

        if (!conn || !conn.encrypted_access_token) throw new Error("No connected Drive account for this company.");

        const token = conn.encrypted_access_token;
        console.log("Using Token:", token.substring(0, 10) + "...");

        const downloadUrl = fileData.mime_type === "application/vnd.google-apps.spreadsheet"
            ? `https://www.googleapis.com/drive/v3/files/${fileData.google_file_id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
            : `https://www.googleapis.com/drive/v3/files/${fileData.google_file_id}?alt=media`;

        console.log("Fetching URL:", downloadUrl);
        const dlRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!dlRes.ok) throw new Error(`Failed to read required data from connected Google Drive. Status: ${dlRes.status} ${await dlRes.text()}`);

        const buffer = await dlRes.arrayBuffer();
        console.log("Downloaded buffer size:", buffer.byteLength);

        const XLSX = await import("xlsx");
        const workbook = XLSX.read(buffer, { type: "array" });
        console.log("Sheets:", workbook.SheetNames);
    } catch (e) {
        console.error("ERRORED:", e);
    }
}
run();
