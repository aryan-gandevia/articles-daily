import { createClient } from "@supabase/supabase-js";

// Browser-side Supabase client — uses the anon key (safe for client)
// Only used for auth operations (sign up, sign in, sign out, get session)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
