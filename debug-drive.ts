import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: connections } = await supabase.from('google_drive_connections').select('*');
    const { data: sources } = await supabase.from('data_sources').select('*');
    console.log("Connections length:", connections?.length);
    if (connections && connections.length > 0) {
        console.log("Connection 0 email:", connections[0].google_account_email);
    }
    console.log("Sources length:", sources?.length);
    if (sources && sources.length > 0) {
        console.log("Source 0 status:", sources[0].sync_status, "file_name:", sources[0].file_name);
    }
}
run();
