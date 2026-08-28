import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: users, error } = await supabase.from('app_users').select('id, email, name');
    if (error || !users) return console.error(error);

    const rolesMap: Record<string, { r: string, rm: string }> = {
        'janummohan44@gmail.com': { r: 'Handles all high-value invoice approvals (Amount > 5000), executive sign-offs, and final legal compliance checks.', rm: 'Only assign CRITICAL or HIGH priority items.' },
        'jananimohan1604@gmail.com': { r: 'Responsible for basic data entry, logging routine expenses, and tracking small paid invoices.', rm: 'Assign low complexity routine tasks.' },
        'argushexadoc2021@gmail.com': { r: 'Manages overdue invoices, client follow-ups, and aggressive debt collection. Handles angry vendors.', rm: 'Assign any overdue or client-facing issues.' },
        'productionargus@gmail.com': { r: 'Performs technical quarterly audits and validates system records.', rm: 'Assign audit-related items only.' },
        'testuser3': { r: 'Handles IT helpdesk and software subscription invoices.', rm: 'Assign IT tasks.' },
        'testuser2': { r: 'Handles internal payroll discrepancies and employee reimbursements.', rm: 'Internal matters.' }
    };

    for (const u of users) {
        let mapping = rolesMap[u.email];
        if (!mapping) {
            mapping = Object.values(rolesMap)[Math.floor(Math.random() * 4)];
        }
        if (u.name.toLowerCase().includes('testuser3')) mapping = rolesMap['testuser3'];
        if (u.name.toLowerCase().includes('testuser2')) mapping = rolesMap['testuser2'];

        await supabase.from('app_users').update({
            roles_responsibilities: mapping.r,
            remarks: mapping.rm
        }).eq('id', u.id);
    }

    console.log("Updated users with AI semantic routing roles!");
}
run();
