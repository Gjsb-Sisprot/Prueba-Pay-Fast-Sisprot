export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/modules/assistant/lib/persistence";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identification = searchParams.get("identification");
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    // Si no hay identificación, permitimos listar las activas/en espera (útil para el admin)
    const conversations = await listConversations({ 
      identification: identification || undefined,
      status,
      limit
    });

    const transformedConversations = conversations.map((conv: any) => ({
      id: conv.id,
      sessionId: conv.session_id,
      status: conv.status,
      summary: conv.summary,
      messageCount: conv.message_count || 0,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      identification: conv.identification,
      contract: conv.contract,
      sector: conv.sector,
      contactName: conv.contact_name,
      contactEmail: conv.contact_email,
      contactPhone: conv.contact_phone,
    }));

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
      count: transformedConversations.length,
    });

  } catch (error) {
    console.error("[CONVERSATIONS_LIST_ERROR]", error);
    return NextResponse.json(
      { 
        error: "Error al obtener conversaciones de Supabase",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
