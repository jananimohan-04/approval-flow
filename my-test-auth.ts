import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf-8");
let supabaseUrl = "";
let supabaseKey = "";
for (const line of env.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim();
    if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) supabaseKey = line.split("=")[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: policies } = await supabase.from("pg_policies").select("*");
    console.log(policies);
}
run();
