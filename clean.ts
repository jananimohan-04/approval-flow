import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    await supabase.from('tasks').delete().like('description', '%dynamically generated row%');
    console.log("Deleted dynamic mock tasks.");
}
run();
