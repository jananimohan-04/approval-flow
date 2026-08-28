import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: tasks, error } = await supabase.from('tasks').select('title, description, created_at').order('created_at', { ascending: false });
    console.log("Remaining tasks:", tasks?.length);
    console.log(tasks);
}
run();
