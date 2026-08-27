import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rows, error: selErr } = await supabase.from('data_source_rows').select('id');
    if (rows && rows.length > 0) {
        console.log(`Deleting ${rows.length} cached idempotency rows so that they trigger fresh tasks upon next sync...`);
        for (const row of rows) {
            await supabase.from('data_source_rows').delete().eq('id', row.id);
        }
        // Also reset the data_source sync status to pending so it completely re-downloads
        await supabase.from('data_sources').update({ sync_status: 'pending', last_synced_at: null, last_modified_at: null }).neq('id', '0');
    } else {
        console.log("No idempotency rows found.");
    }
}
run();
