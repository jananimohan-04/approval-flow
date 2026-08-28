import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: tasks, error } = await supabase.from('tasks').select('*');
    const idsToDelete: string[] = [];

    for (const t of tasks || []) {
        // Mock tasks identify by title or description containing "INV-100" or random hashes I injected
        if (
            t.title.includes("Test Generated Drive Task") ||
            t.title.includes("manual task") ||
            t.description.includes("INV-1001") ||
            t.description.includes("INV-1002") ||
            t.description.includes("INV-1003") ||
            t.description.includes("INV-1004") ||
            t.description.includes("INV-1005") ||
            t.description.includes("INV-1006") ||
            t.description.includes("INV-1007") ||
            t.description.includes("INV-1008") ||
            t.description.includes("INV-1009") ||
            t.description.includes("INV-uphkyc") || // random hash
            t.description.includes("INV-0mjngq")    // random hash
        ) {
            idsToDelete.push(t.id);
        }
    }

    if (idsToDelete.length > 0) {
        await supabase.from('tasks').delete().in('id', idsToDelete);
        console.log(`Deleted ${idsToDelete.length} legacy mock tasks.`);
    } else {
        console.log("No mock tasks left.");
    }
}
run();
