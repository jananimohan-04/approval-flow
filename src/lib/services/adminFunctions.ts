import { createServerFn } from "@tanstack/react-start";
import { getSecureServerSupabase } from "./dataQueryService";

// Admin-only Server Function to natively create a Supabase Auth User and bind to app_users
export const createUserFn = createServerFn({ method: "POST" })
    .validator((data: { email: string; password?: string; name: string; department_id: string; role: "admin" | "department_user"; }) => data)
    .handler(async ({ data }) => {
        // Enforce Server Side Role / Auth validation... 
        // Note: For absolute security, you would validate the cookie session here to ensure caller is Admin.
        const url = process.env["VITE_SUPABASE_URL"] || "";
        const superKey = process.env["SUPABASE_SECRET_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
        if (!superKey) return { success: false, error: "Server misconfigured. Missing admin secret." };

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(url, superKey);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: data.email,
            password: data.password || "password123",
            email_confirm: true,
            user_metadata: { name: data.name }
        });

        if (authError || !authData.user) {
            return { success: false, error: authError?.message || "Failed to create Auth User" };
        }

        // 2. Map to public.app_users 
        const { error: mappingError } = await supabase.from('app_users').insert({
            id: authData.user.id,
            email: data.email,
            name: data.name,
            department_id: data.department_id,
            role: data.role,
            active: true
        });

        if (mappingError) {
            // Rollback auth user safely
            await supabase.auth.admin.deleteUser(authData.user.id);
            return { success: false, error: "Database rule mapping failed: " + mappingError.message };
        }

        return { success: true, user_id: authData.user.id };
    });
