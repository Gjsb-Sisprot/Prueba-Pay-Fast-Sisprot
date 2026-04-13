export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getConversationBySessionId } from "@/modules/assistant/lib/persistence";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Se requiere sessionId" },
        { status: 400 }
      );
    }

    const data = await getConversationBySessionId(sessionId);

    if (!data) {
      return NextResponse.json(
        { error: "Conversación no encontrada en Supabase" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      status: data.status || "active",
      closedBy: data.closed_by || null,
      glpiTicketId: data.glpi_ticket_id || null,
      specialistName: data.specialist_name || null,
      reason: data.escalation_reason || data.reason || null,
      updatedAt: data.updated_at,
    });

  } catch (error) {
    console.error("[STATUS_FETCH_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno al consultar Supabase" },
      { status: 500 }
    );
  }
}
