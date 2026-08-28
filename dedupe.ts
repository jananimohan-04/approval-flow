import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: tasks, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error(error);
        return;
    }

    const seenTitles = new Set<string>();
    const idsToDelete: string[] = [];

    for (const t of tasks || []) {
        if (seenTitles.has(t.title)) {
            idsToDelete.push(t.id);
        } else {
            seenTitles.add(t.title);
        }
    }

    console.log(`Found ${idsToDelete.length} duplicate tasks to delete.`);

    if (idsToDelete.length > 0) {
        // Chunk deletions to avoid URL length limits if there are many
        for (let i = 0; i < idsToDelete.length; i += 50) {
            const chunk = idsToDelete.slice(i, i + 50);
            const { error: delErr } = await supabase.from('tasks').delete().in('id', chunk);
            if (delErr) {
                console.error("Error deleting chunk:", delErr);
            } else {
                console.log(`Deleted chunk of ${chunk.length} tasks.`);
            }
        }
    }

    // Also clear duplicates in notifications?
    const { data: notifs } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    const seenNotifs = new Set<string>();
    const notifIdsToDelete: string[] = [];

    for (const n of notifs || []) {
        const key = `${n.title}-${n.user_id}`;
        if (seenNotifs.has(key)) {
            notifIdsToDelete.push(n.id);
        } else {
            seenNotifs.add(key);
        }
    }

    if (notifIdsToDelete.length > 0) {
        for (let i = 0; i < notifIdsToDelete.length; i += 50) {
            const chunk = notifIdsToDelete.slice(i, i + 50);
            await supabase.from('notifications').delete().in('id', chunk);
        }
        console.log(`Deleted ${notifIdsToDelete.length} duplicate notifications.`);
    }

    console.log("Cleanup complete!");
}
run();
