import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rows, error } = await supabase.from('data_source_rows').select('row_key, updated_at').order('updated_at', { ascending: false }).limit(20);
    console.log("Rows parsed:", rows?.length);
    console.log(rows);
}
run();
