import { createClient } from "@supabase/supabase-js";
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const companyId = '539b5209-2ba8-4b43-a473-cec916655a81';

    const { data: users } = await supabase.from('app_users').select('*').eq('company_id', companyId).limit(1);
    const { data: depts } = await supabase.from('departments').select('*').eq('company_id', companyId).limit(1);
    const user = users?.[0];
    const dept = depts?.[0];

    const { data, error } = await supabase.from('tasks').insert({
        company_id: companyId,
        department_id: dept?.id || null,
        assigned_user_id: user?.id || null,
        title: 'Test Generated Drive Task',
        description: 'This is a test task to ensure the UI can display tasks correctly for your company.',
        priority: 'high',
        status: 'unassigned',
        classification_source: 'ai',
        ai_rule_id: null,
        created_by: user?.id || null,
        source_file_name: 'Accounts.xlsx'
    }).select();

    if (error) {
        console.log("Error inserting task:", error);
    } else {
        console.log("Inserted task successfully:", data);
    }
}
run();
