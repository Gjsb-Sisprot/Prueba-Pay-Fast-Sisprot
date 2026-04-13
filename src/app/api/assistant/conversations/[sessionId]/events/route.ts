
import { NextRequest } from "next/server";
import { getConversationEvents } from "@/modules/assistant/lib/persistence";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return new Response("sessionId requerido", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let aborted = false;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let pollingInterval: NodeJS.Timeout | null = null;

      // Marcadores para detectar cambios
      let lastSeenMessageDate = new Date(Date.now() - 5000).toISOString(); // 5 seg de margen inicial
      let lastSeenStatus: string | null = null;
      let lastSeenTicketId: string | number | null = null;

      const cleanup = () => {
        if (aborted) return;
        aborted = true;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (pollingInterval) clearInterval(pollingInterval);
        try {
          controller.close();
        } catch {
          // Ya cerrado o error ignorado
        }
      };

      request.signal.addEventListener("abort", cleanup);

      // 1. Heartbeat cada 25s para mantener la conexión viva en Vercel
      heartbeatInterval = setInterval(() => {
        if (aborted) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, 25_000);

      // 2. Loop de Polling a Supabase cada 3s
      // Se usa polling en lugar de Realtime SDK dentro de Edge Runtime 
      // por ligereza y estabilidad en funciones serverless de corta duración.
      pollingInterval = setInterval(async () => {
        if (aborted) return;

        try {
          const events = await getConversationEvents(sessionId, lastSeenMessageDate);

          // A. Notificar nuevos mensajes (especialmente del asistente/agente)
          if (events.messages.length > 0) {
            for (const msg of events.messages) {
              // Solo enviamos mensajes que no hayamos visto (basado en timestamp)
              if (msg.timestamp > lastSeenMessageDate) {
                const eventData = JSON.stringify({
                  role: msg.role,
                  content: msg.content,
                  attachments: msg.attachments,
                  timestamp: msg.timestamp
                });
                
                controller.enqueue(encoder.encode(`event: new_message\ndata: ${eventData}\n\n`));
                lastSeenMessageDate = msg.timestamp;
              }
            }
          }

          // B. Notificar cambios de estado o metadatos críticos
          const hasStatusChanged = events.status !== lastSeenStatus;
          const hasTicketChanged = events.glpiTicketId !== lastSeenTicketId;

          if (hasStatusChanged || hasTicketChanged) {
            const statusData = JSON.stringify({
              status: events.status,
              glpiTicketId: events.glpiTicketId,
              specialistName: events.specialistName,
              reason: events.reason,
              updatedAt: events.updatedAt
            });
            
            controller.enqueue(encoder.encode(`event: status_changed\ndata: ${statusData}\n\n`));
            
            lastSeenStatus = events.status;
            lastSeenTicketId = events.glpiTicketId;
          }

        } catch (err) {
          console.error("[SSE_SUPABASE_POLLING_ERROR]", err);
          // Opcional: enviar evento de error al cliente
        }
      }, 3000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
