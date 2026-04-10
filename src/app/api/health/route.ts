import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Endpoint de Salud Definitivo
 * Build Timestamp: 2026-04-10T15:32:00Z (Referencia para confirmar despliegue)
 */
export async function GET() {
  const envCheck = {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    google_ai: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  };

  const dbTests: Record<string, any> = {
    connection: "pending",
    write_test: "pending",
  };

  try {
    // Test 1: Conexión Básica
    const { count, error: connError } = await supabase
      .from("conversations")
      .select("*", { count: 'exact', head: true });
    
    if (connError) {
      dbTests.connection = { status: "error", code: connError.code, message: connError.message };
    } else {
      dbTests.connection = { status: "ok", count };
    }

    // Test 2: Intento de Inserción (Prueba de Escritura)
    const testSessionId = `health-check-${Date.now()}`;
    const { data: writeData, error: writeError } = await supabase
      .from("conversations")
      .insert([{ 
        session_id: testSessionId,
        status: "active" 
      }])
      .select("id")
      .maybeSingle();

    if (writeError) {
      dbTests.write_test = { status: "error", code: writeError.code, message: writeError.message };
    } else {
      dbTests.write_test = { status: "ok", id: writeData?.id };
      // Limpieza (opcional, borramos el test)
      if (writeData?.id) {
        await supabase.from("conversations").delete().eq("id", writeData.id);
      }
    }

  } catch (err: any) {
    dbTests.connection = { status: "critical_crash", message: err.message };
  }

  return NextResponse.json({
    status: "ok",
    version: "v2-stabilized",
    deployment_timestamp: "2026-04-10 11:42 AM", 
    message: "Si ves este mensaje, la ruta /api/health ha sido desplegada con éxito.",
    diagnostics: {
      ready: envCheck.url && envCheck.service_key,
      checks: envCheck,
      db_tests: dbTests,
      node: process.version,
    }
  });
}
