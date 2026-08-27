import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: users } = await supabase.from('app_users').select('id, email, role');
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    if (users && authUsers.users) {
        for (const u of users) {
            const authUser = authUsers.users.find(au => au.email === u.email);
            console.log(u.email, "AppUser ID:", u.id, "Auth ID:", authUser?.id);
        }
    }
}
run();
