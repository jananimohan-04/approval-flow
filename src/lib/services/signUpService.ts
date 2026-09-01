import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const signUpCompanyFn = createServerFn({ method: "POST" })
    .validator((data: {
        companyName: string;
        gstNumber: string;
        email: string;
        password?: string;
        gstDetails?: any;
    }) => data)
    .handler(async ({ data }) => {
        try {
            const serviceUrl = process.env["VITE_SUPABASE_URL"] || (import.meta as any).env?.VITE_SUPABASE_URL || "";
            const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || process.env["SUPABASE_SECRET_KEY"] || "";

            if (!serviceUrl || !serviceKey) {
                throw new Error("Missing Supabase service role credentials on server.");
            }

            const supabase = createClient(serviceUrl, serviceKey);

            // 1. Check if user already exists in app_users
            const { data: existingUser } = await supabase
                .from("app_users")
                .select("id")
                .eq("email", data.email)
                .maybeSingle();

            let userId = existingUser?.id;

            if (!userId) {
                // We use admin.createUser to bypass email confirmation for this flow
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: data.email,
                    password: data.password || "TempPassword123!",
                    email_confirm: true,
                });

                if (authError) {
                    throw new Error(`Auth Error: ${authError.message}`);
                }

                userId = authData.user.id;
            }

            // 2. Create the company
            const { data: companyData, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: data.companyName,
                    code: data.gstNumber, // Using code for GST number
                    description: "Created via Sign Up",
                    status: "active",
                    trade_name: data.gstDetails?.trade_name || null,
                    gstin_status: data.gstDetails?.gstin_status || null,
                    taxpayer_type: data.gstDetails?.taxpayer_type || null,
                    constitution_of_business: data.gstDetails?.constitution_of_business || null,
                    date_of_registration: data.gstDetails?.date_of_registration || null,
                    address: data.gstDetails?.address || null
                })
                .select()
                .single();

            if (companyError) {
                // Rollback user creation if company creation fails
                await supabase.auth.admin.deleteUser(userId);
                throw new Error(`Company Error: ${companyError.message}`);
            }

            const companyId = companyData.id;

            // 3. Create or update the app_user profile
            if (!existingUser) {
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
            } else {
                // Update existing user to be company admin of the new company
                const { error: userError } = await supabase
                    .from("app_users")
                    .update({
                        company_id: companyId,
                        role: "company_admin"
                    })
                    .eq("id", userId);

                if (userError) {
                    await supabase.from("companies").delete().eq("id", companyId);
                    throw new Error(`User Profile Update Error: ${userError.message}`);
                }
            }

            return { success: true, userId, companyId };
        } catch (e: any) {
            console.error("Sign Up Error:", e.message);
            throw new Error(e.message || "Failed to sign up company.");
        }
    });
