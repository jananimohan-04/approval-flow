import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const signUpCompanyFn = createServerFn({ method: "POST" })
    .validator((data: {
        companyName: string;
        gstNumber: string;
        email: string;
        password?: string;
    }) => data)
    .handler(async ({ data }) => {
        try {
            const serviceUrl = process.env["VITE_SUPABASE_URL"] || (import.meta as any).env?.VITE_SUPABASE_URL || "";
            const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || process.env["SUPABASE_SECRET_KEY"] || "";

            if (!serviceUrl || !serviceKey) {
                throw new Error("Missing Supabase service role credentials on server.");
            }

            const supabase = createClient(serviceUrl, serviceKey);

            // 1. Create the user in Supabase Auth
            // We use admin.createUser to bypass email confirmation for this flow, or just signUp if we want them to confirm.
            // Since we are creating a company admin, we'll auto-confirm them.
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: data.email,
                password: data.password || "TempPassword123!",
                email_confirm: true,
            });

            if (authError) {
                throw new Error(`Auth Error: ${authError.message}`);
            }

            const userId = authData.user.id;

            // 2. Create the company
            const { data: companyData, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: data.companyName,
                    code: data.gstNumber, // Using code for GST number
                    description: "Created via Sign Up",
                    status: "active"
                })
                .select()
                .single();

            if (companyError) {
                // Rollback user creation if company creation fails
                await supabase.auth.admin.deleteUser(userId);
                throw new Error(`Company Error: ${companyError.message}`);
            }

            const companyId = companyData.id;

            // 3. Create the app_user profile
            const { error: userError } = await supabase
                .from("app_users")
                .insert({
                    id: userId,
                    auth_user_id: userId,
                    company_id: companyId,
                    name: "Company Admin", // Default name
                    email: data.email,
                    role: "company_admin",
                    active: true
                });

            if (userError) {
                // Rollback
                await supabase.auth.admin.deleteUser(userId);
                await supabase.from("companies").delete().eq("id", companyId);
                throw new Error(`User Profile Error: ${userError.message}`);
            }

            return { success: true, userId, companyId };
        } catch (e: any) {
            console.error("Sign Up Error:", e.message);
            throw new Error(e.message || "Failed to sign up company.");
        }
    });
