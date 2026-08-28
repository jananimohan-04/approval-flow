import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: tasks, error } = await supabase.from('tasks').select('title, description, created_at, assigned_user_id').order('created_at', { ascending: false });
    console.log("Total tasks:", tasks?.length);
    const { data: users } = await supabase.from('app_users').select('id, email, name');

    tasks?.forEach(t => {
        const user = users?.find(u => u.id === t.assigned_user_id);
        console.log(`- [${user?.name || 'Unassigned'}] ${t.title}`);
    });
}
run();
