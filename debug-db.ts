import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf-8");
const vars: Record<string, string> = {};
for (const line of env.split("\n")) {
    const clean = line.replace(/\r$/, "").trim();
    const idx = clean.indexOf("=");
    if (idx > 0 && !clean.startsWith("#")) {
        vars[clean.substring(0, idx)] = clean.substring(idx + 1);
    }
}

const supabase = createClient(vars.VITE_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check auth user details
    const { data: { user } } = await supabase.auth.admin.getUserById("ea8772a8-101e-4654-907c-7f6ad12e5293");
    console.log("Auth user:", user?.email, user?.id);

    // Check users table for company_id
    const { data: appUsers } = await supabase.from("users").select("id, email, company_id, name");
    console.log("\n=== APP USERS ===");
    for (const u of (appUsers || [])) {
        console.log(`  ${u.name} | ${u.email} | company: ${u.company_id}`);
    }

    // Check all connections with tokens
    const { data: conns } = await supabase.from("google_drive_connections")
        .select("id, user_id, google_account_email, company_id, status, encrypted_access_token")
        .not("encrypted_access_token", "is", null);
    console.log("\n=== CONNECTIONS WITH TOKENS ===");
    for (const c of (conns || [])) {
        console.log(`  email: ${c.google_account_email} | user: ${c.user_id} | company: ${c.company_id} | status: ${c.status}`);
    }
}

run();
