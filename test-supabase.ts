require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("--- Diagnóstico de Supabase (Server-side) ---");
  console.log("URL Presente:", !!supabaseUrl);
  console.log("Key Presente:", !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Faltan variables de entorno.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Probando conexión...");
  const { data, error } = await supabase.from('conversations').select('*').limit(1);

  if (error) {
    console.error("FALLO DE CONEXIÓN:");
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    console.error("Detalles:", error.details);
    console.error("Sugerencia:", error.hint);
  } else {
    console.log("¡CONEXIÓN EXITOSA!");
    console.log("Datos recibidos:", data);
  }
}

testSupabase();
