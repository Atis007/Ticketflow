import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV) {
  if (!supabaseUrl) throw new Error("Missing env var: VITE_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing env var: VITE_SUPABASE_ANON_KEY");
} else {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase env vars are missing — Realtime will not work.");
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});
