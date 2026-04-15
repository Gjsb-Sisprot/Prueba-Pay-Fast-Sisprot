export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { 
  updateConversationStatus, 
  syncConversationMetadata,
  saveInteraction
} from "@/modules/assistant/lib/persistence";
import {
  buildCloseConversationMessage,
} from "@/modules/assistant/lib/channel-links";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { action, summary, role, content, attachments, specialistName } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Se requiere sessionId" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "close": {
        const finalSummary = summary ? `${summary} | Cerrada por el agente` : "Cerrada por el agente";
        
        // 1. Actualizar estado en Supabase
        await updateConversationStatus(sessionId, "closed");
        
        // 2. Sincronizar resumen
        await syncConversationMetadata(sessionId, { 
          summary: finalSummary 
        });

        // 3. Guardar mensaje de cierre en el historial
        const closeMessage = buildCloseConversationMessage();
        await saveInteraction({
          sessionId,
          role: "assistant",
          content: closeMessage
        });

        result = {
          success: true,
          newStatus: "closed",
          closeMessage,
        };
        break;
      }

      case "message": {
        // Permitir que un agente envíe un mensaje
        if (!content && (!attachments || attachments.length === 0)) {
          return NextResponse.json({ error: "Contenido de mensaje requerido" }, { status: 400 });
        }

        const msgRole = role === "user" ? "user" : "assistant"; // Solo permitimos user o assistant (agente)
        
        await saveInteraction({
          sessionId,
          role: msgRole,
          content: content || "",
          attachments
        });
        
        result = { success: true };
        break;
      }

      case "takeover": {
        // El especialista toma control
        await updateConversationStatus(sessionId, "handed_over");
        if (specialistName) {
          await syncConversationMetadata(sessionId, { specialistName });
        }
        
        // Guardar mensaje de sistema opcional indicando que un agente tomó el control
        const message = specialistName 
          ? `La conversación ha sido tomada por el especialista: ${specialistName}.`
          : "Un especialista se ha unido a la conversación.";
          
        await saveInteraction({
          sessionId,
          role: "assistant",
          content: message
        });

        result = { success: true, newStatus: "handed_over" };
        break;
      }

      case "escalate": {
        // Escalar a especialista (por si el dashboard lo requiere)
        await updateConversationStatus(sessionId, "waiting_specialist");
        const reason = body.reason || "Escalado manual desde el panel";
        
        await syncConversationMetadata(sessionId, { reason });
        
        await saveInteraction({
          sessionId,
          role: "assistant",
          content: "Tu caso ha sido escalado a un especialista humano. Por favor espera un momento."
        });

        result = { success: true, newStatus: "waiting_specialist" };
        break;
      }

      case "update_metadata": {
        const { metadata } = body;
        if (!metadata) {
          return NextResponse.json({ error: "Se requieren metadatos" }, { status: 400 });
        }
        await syncConversationMetadata(sessionId, metadata);
        result = { success: true };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Acción no soportada: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[SESSION_ACTION_ERROR]", error);
    return NextResponse.json(
      { 
        error: "Error al procesar la acción en Supabase",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
