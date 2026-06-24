import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || "https://missing.supabase.co", supabaseAnonKey || "missing-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function getSupabaseConfigError() {
  if (isSupabaseConfigured) return "";
  return "Supabase Environment Variables fehlen: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY";
}
