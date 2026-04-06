
import { NextRequest, NextResponse } from "next/server";
import { createMCPClient } from "@ai-sdk/mcp";
import {
  SISPROT_NETWORKS_QUERY,
  extractSisprotChannelLines,
  buildCloseConversationMessage,
} from "@/modules/assistant/lib/channel-links";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://mcp-hono-production.up.railway.app";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

function parseMcpToolResult(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as { content?: Array<{ type?: string; text?: string }> };
  const textChunk = candidate.content?.find((c) => c?.type === "text" && typeof c?.text === "string")?.text;
  if (!textChunk) return null;

  try {
    const parsed = JSON.parse(textChunk);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function extractTicketId(parsedResult: Record<string, unknown> | null): number | null {
  if (!parsedResult) return null;

  const direct = parsedResult.glpiTicketId ?? parsedResult.glpi_ticket_id;
  if (typeof direct === "number") return direct;
  if (typeof direct === "string" && /^\d+$/.test(direct)) return Number(direct);

  const ticket = parsedResult.ticket;
  if (ticket && typeof ticket === "object") {
    const nested = ticket as { ticketId?: unknown };
    if (typeof nested.ticketId === "number") return nested.ticketId;
    if (typeof nested.ticketId === "string" && /^\d+$/.test(nested.ticketId)) return Number(nested.ticketId);
  }

  const message = parsedResult.message;
  if (typeof message === "string") {
    const m = message.match(/#(\d+)/);
    if (m?.[1]) return Number(m[1]);
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { action, summary, resolution } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Se requiere sessionId" },
        { status: 400 }
      );
    }

    const mcpClient = await createMCPClient({
      transport: {
        type: "http",
        url: `${MCP_SERVER_URL}/mcp`,
        headers: {
          ...(MCP_API_KEY ? { Authorization: `Bearer ${MCP_API_KEY}` } : {}),
        },
      },
    });

    const tools = await mcpClient.tools();

    let result;

    switch (action) {
      case "close": {
        if (summary) {
          const updateSummaryTool = tools["update_summary"];
          if (updateSummaryTool) {
            const finalSummary = `${summary} | Cerrada por el usuario`;
            await updateSummaryTool.execute(
              { sessionId, summary: finalSummary },
              { messages: [], toolCallId: `close-summary-${Date.now()}` }
            );
          }
        }

        const closeConversationTool = tools["close_conversation"];
        if (closeConversationTool) {
          let closeMessage = buildCloseConversationMessage();

          const closeResult = await closeConversationTool.execute(
            {
              sessionId,
              resolution: resolution || "Conversaci\u00f3n cerrada por el usuario",
              ticketSummary: summary || resolution || "Cierre solicitado por el usuario",
              closedBy: "user",
            },
            { messages: [], toolCallId: `close-conv-${Date.now()}` }
          );
          const parsedCloseResult = parseMcpToolResult(closeResult);
          const closeTicketId = extractTicketId(parsedCloseResult);

          const searchKnowledgeTool = tools["search_knowledge_base"];
          if (searchKnowledgeTool) {
            try {
              const channelsResult = await searchKnowledgeTool.execute(
                { query: SISPROT_NETWORKS_QUERY },
                { messages: [], toolCallId: `close-networks-${Date.now()}` }
              );

              const channelLines = extractSisprotChannelLines(channelsResult);
              closeMessage = buildCloseConversationMessage(channelLines);
            } catch (searchError) {
            }
          }
          
          result = {
            success: true,
            newStatus: "closed",
            closeMessage,
            ticketId: closeTicketId,
            ticketMessage: closeTicketId ? `Tu número de ticket es: #${closeTicketId}` : null,
          };
        } else {
          result = { success: false, error: "Herramienta close_conversation no disponible" };
        }
        break;
      }

      case "resume": {
        result = { 
          success: false, 
          error: "Las conversaciones cerradas no pueden reactivarse. Inicia una nueva conversación." 
        };
        break;
      }

      default:
        await mcpClient.close();
        return NextResponse.json(
          { error: `Acción no soportada: ${action}` },
          { status: 400 }
        );
    }

    await mcpClient.close();

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json(
      { 
        error: "Error al procesar la conversación",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
