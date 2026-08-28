import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: sources } = await supabase.from('data_sources').select('id, company_id');
    const companyId = sources?.[0]?.company_id;
    console.log("Sources company Id:", companyId);
    const { data: users } = await supabase.from('app_users').select('id, email, company_id').eq('company_id', companyId);
    console.log("Users in company:", users);
    for (const user of users || []) {
        const { data: conns } = await supabase.from('google_drive_connections').select('id, email:google_account_email, token:encrypted_access_token').eq('user_id', user.id);
        console.log(`User ${user.email} conns:`, conns?.map(c => ({ id: c.id, email: c.email, token: !!c.token })));
    }
}
run();
