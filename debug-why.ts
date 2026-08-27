import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rows, error: rErr } = await supabase.from('data_source_rows').select('id, row_hash');
    console.log("Data source rows:", rows?.length, "Error:", rErr);

    const { data: sources, error: sErr } = await supabase.from('data_sources').select('id, sync_status, file_name');
    console.log("Data sources:", sources, "Error:", sErr);

    const { data: tasks, error: tErr } = await supabase.from('tasks').select('id, title, status, classification_source, company_id');
    console.log("Tasks:", tasks, "Error:", tErr);
}
run();
