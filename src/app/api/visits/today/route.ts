import { NextResponse } from "next/server";
import { supabase } from "@/modules/assistant/lib/supabase";

export const dynamic = 'force-dynamic';

/**
 * GET /api/visits/today
 * Retorna las visitas programadas para el día de hoy (Zona Horaria Venezuela UTC-4)
 * para que n8n pueda procesar recordatorios.
 */
export async function GET(request: Request) {
  try {
    // 1. Verificación de Seguridad (Opcional pero Recomendada)
    const authHeader = request.headers.get("x-n8n-secret");
    const secret = process.env.N8N_API_SECRET || "sisprot-n8n-2026";
    
    if (authHeader && authHeader !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Calcular el rango de "Hoy" en Venezuela (UTC-4)
    // Obtenemos la hora actual y ajustamos el desplazamiento
    const now = new Date();
    const VET_OFFSET = -4; // Venezuela UTC-4
    
    // Crear objeto de fecha para el inicio y fin del día en VET
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(startOfDay.getUTCHours() + VET_OFFSET); // Ajuste temporal para cálculo
    startOfDay.setHours(0, 0, 0, 0);
    // Revertir ajuste para obtener el equivalente en UTC
    startOfDay.setUTCHours(startOfDay.getUTCHours() - VET_OFFSET);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(endOfDay.getUTCHours() + 23, 59, 59, 999);

    console.log(`[API_VISITS] Consultando rango UTC: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

    // 3. Consultar Supabase con JOIN a conversations para datos de contacto
    const { data, error } = await supabase
      .from("support_visits")
      .select(`
        id,
        visit_date,
        reason,
        status,
        client_name,
        contract_number,
        client_identification,
        category,
        glpi_ticket_id,
        metadata,
        conversations:conversation_id (
          contact_phone,
          contact_email,
          contact_name
        )
      `)
      .gte("visit_date", startOfDay.toISOString())
      .lte("visit_date", endOfDay.toISOString())
      .eq("status", "scheduled")
      .order("visit_date", { ascending: true });

    if (error) {
      console.error("[API_VISITS_DB_ERROR]", error);
      throw error;
    }

    // 4. Formatear la respuesta para n8n
    const formattedVisits = data?.map(visit => {
      // Manejo del tipado del join (supabase-js puede devolver objeto o array según relación)
      const conv = Array.isArray(visit.conversations) ? visit.conversations[0] : visit.conversations;
      
      return {
        id: visit.id,
        fecha: visit.visit_date,
        hora: new Date(visit.visit_date).toLocaleTimeString('es-VE', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true,
          timeZone: 'America/Caracas' 
        }),
        motivo: visit.reason,
        cliente: visit.client_name,
        identificacion: visit.client_identification,
        contrato: visit.contract_number,
        ticket_glpi: visit.glpi_ticket_id,
        contacto: {
          telefono: conv?.contact_phone || "No disponible",
          email: conv?.contact_email || "No disponible",
          nombre: conv?.contact_name || visit.client_name
        }
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedVisits?.length || 0,
      timestamp: new Date().toISOString(),
      timezone: "America/Caracas",
      data: formattedVisits || []
    });

  } catch (error) {
    console.error("[API_VISITS_TODAY_CRITICAL]", error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Error interno del servidor" 
    }, { status: 500 });
  }
}
