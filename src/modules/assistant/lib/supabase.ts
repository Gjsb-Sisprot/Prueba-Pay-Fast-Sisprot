import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey);

if (!isSupabaseConfigured) {
  console.warn("[SUPABASE_WARNING] Las variables de entorno para Supabase no están completas.");
}

// Inicialización segura para evitar crashes en build si falta la URL
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseServiceKey || "placeholder", 
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
