import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Endpoint de Salud Simplificado
 * Propósito: Verificar conectividad básica y presencia de variables de entorno.
 */
export async function GET() {
  const envCheck = {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Health check simple moved to root api. If you see this, routing is working.",
    diagnostics: {
      is_configured: envCheck.url && envCheck.key,
      env: envCheck,
      node_version: process.version,
    }
  });
}
