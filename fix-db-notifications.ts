import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: users } = await supabase.from('app_users').select('*').limit(1);
    if (!users) return;
    const user = users[0];

    const { data, error } = await supabase.from('notifications').insert({
        company_id: user.company_id,
        user_id: user.id,
        title: 'test',
        message: 'test',
        type: 'test',
        is_read: true,
    }).select();

    if (error) {
        console.log("Error:", error);
    } else {
        console.log("Success! Columns exist.");
        await supabase.from('notifications').delete().eq('id', data[0].id);
    }
}
run();
