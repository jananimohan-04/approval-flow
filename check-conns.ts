import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: conns, error } = await supabase.from('google_drive_connections').select('*');
    console.log("Connections:", conns?.length);
    conns?.forEach(c => {
        console.log(`- ID: ${c.id}, Email: ${c.google_account_email}, Has Refresh Token: ${!!c.encrypted_refresh_token}`);
    });
}
run();
