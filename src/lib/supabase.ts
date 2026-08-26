import { createClient } from "@supabase/supabase-js";

// Ensure you set these in your .env or .env.local file.
// The frontend only needs the anon key. 
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
