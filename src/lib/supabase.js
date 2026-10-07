import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const placeholder = (v) => !v || v.startsWith("YOUR_");

export const isConfigured = !placeholder(url) && !placeholder(key);

// Fallback values only keep the app from crashing when env vars are missing;
// App.jsx shows a setup message in that case.
export const supabase = createClient(
  isConfigured ? url : "http://localhost:54321",
  isConfigured ? key : "missing-key"
);
