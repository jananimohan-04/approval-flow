import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: conns } = await supabase.from('google_drive_connections').select('*');
    console.log(conns.map(c => ({ id: c.id, email: c.google_account_email, token: !!c.encrypted_access_token })));
}
run();
