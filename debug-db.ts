import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
    console.log("Tasks in DB:", tasks?.length, "Error:", tasksError);

    const { data: sources, error: sourcesError } = await supabase.from('data_sources').select('id, file_name, sync_status, updated_at');
    console.log("Data sources:", sources, "Error:", sourcesError);
}
run();
