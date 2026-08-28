import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: sources, error: sErr } = await supabase.from('data_sources').select('*').limit(2);
    const { data: rows, error: rErr } = await supabase.from('data_source_rows').select('id, row_hash, updated_at').order('updated_at', { ascending: false }).limit(5);
    const { data: tasks, error: tErr } = await supabase.from('tasks').select('id, title, created_at').order('created_at', { ascending: false }).limit(5);
    const { data: notifs, error: nErr } = await supabase.from('notifications').select('id, title, created_at').order('created_at', { ascending: false }).limit(5);
    console.log("Sources:", sources?.map(s => ({ file_name: s.file_name, sync: s.sync_status, last_synced: s.last_synced_at, modified: s.last_modified_at })));
    console.log("Rows:", rows);
    console.log("Tasks:", tasks);
    console.log("Notifs:", notifs);
}
run();
