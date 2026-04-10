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

  return NextResponse.json({
    status: "ok",
    version: "v2-stabilized",
    deployment_timestamp: "2026-04-10 11:32 AM", 
    message: "Si ves este mensaje, la ruta /api/health ha sido desplegada con éxito.",
    diagnostics: {
      ready: envCheck.url && envCheck.service_key,
      checks: envCheck,
      node: process.version,
    }
  });
}
