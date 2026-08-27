import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf-8");
const vars: Record<string, string> = {};
for (const line of env.split("\n")) {
    const clean = line.replace(/\r$/, "").trim();
    const idx = clean.indexOf("=");
    if (idx > 0 && !clean.startsWith("#")) vars[clean.substring(0, idx)] = clean.substring(idx + 1);
}

const supabase = createClient(vars.VITE_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: conns } = await supabase.from("google_drive_connections")
        .select("id, encrypted_access_token, encrypted_refresh_token, google_account_email")
        .not("encrypted_access_token", "is", null);

    for (const c of (conns || [])) {
        console.log(`Testing token for ${c.google_account_email}...`);
        const res = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
            headers: { Authorization: `Bearer ${c.encrypted_access_token}` }
        });
        console.log("Status:", res.status, res.statusText);
        if (!res.ok) {
            const text = await res.text();
            console.log("Error body:", text);
            console.log("Has refresh token?", !!c.encrypted_refresh_token);
        }
    }
}
run();
