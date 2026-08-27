import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
    const url = process.env["VITE_SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"] || "";
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"] || "";
    if (!url || !key) return null;
    return createClient(url, key);
}

export const createDatabaseAuthUserFn = createServerFn({ method: "POST" })
    .validator((data: { email: string; password?: string }) => data)
    .handler(async ({ data }) => {
        const supabase = getServiceSupabase();
        if (!supabase) return { success: false, error: "Missing Supabase Service Key." };

        const { data: user, error } = await supabase.auth.admin.createUser({
            email: data.email,
            password: data.password || "password123",
            email_confirm: true
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, userId: user.user.id };
    });
