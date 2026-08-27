import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read from .env
const env = fs.readFileSync(".env", "utf-8");
let supabaseUrl = "";
let supabaseKey = "";
for (const line of env.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim();
    if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) supabaseKey = line.split("=")[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: sources, error } = await supabase.from("data_sources").select("*");
    console.log("Sources:", sources, error);

    if (sources && sources.length > 0) {
        const { data: conn } = await supabase.from("google_drive_connections").select("*").eq("company_id", sources[0].company_id);
        console.log("Connections for company_id:", sources[0].company_id, conn);
    }
}
run();
