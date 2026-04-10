export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { createMCPClient } from "@ai-sdk/mcp";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://mcp-hono-production.up.railway.app";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identification = searchParams.get("identification");
    const includeAll = searchParams.get("includeAll") === "true";

    if (!identification) {
      return NextResponse.json(
        { error: "Se requiere el parámetro identification" },
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

    const listConversationsTool = tools["list_conversations"];
    if (!listConversationsTool) {
      await mcpClient.close();
      return NextResponse.json(
        { error: "Herramienta list_conversations no disponible" },
        { status: 503 }
      );
    }

    const result = await listConversationsTool.execute(
      { 
        identification,
        includeAll 
      },
      { messages: [], toolCallId: `list-conv-${Date.now()}` }
    );

    let conversations = [];
    
    if (result && typeof result === "object" && "content" in result) {
      const content = (result as { content: Array<{ type: string; text?: string }> }).content;
      if (content && content[0] && content[0].text) {
        const parsed = JSON.parse(content[0].text);
        conversations = parsed.data?.conversations || parsed.conversations || [];
      }
    }
    else if (typeof result === "string") {
      const parsed = JSON.parse(result);
      conversations = parsed.data?.conversations || parsed.conversations || [];
    }
    else if (result && typeof result === "object") {
      const data = result as { data?: { conversations?: unknown[] }; conversations?: unknown[] };
      conversations = data.data?.conversations || data.conversations || [];
    }

    interface MCPConversation {
      id: string;
      sessionId: string;
      status: string;
      summary?: string;
      messageCount?: number;
      timestamps?: {
        createdAt?: string;
        updatedAt?: string;
      };
      client?: {
        name?: string;
        identification?: string;
        contract?: string;
        sector?: string;
        email?: string;
        phone?: string;
      };
      createdAt?: string;
      updatedAt?: string;
    }

    const transformedConversations = conversations.map((conv: MCPConversation) => ({
      id: conv.id,
      sessionId: conv.sessionId,
      status: conv.status,
      summary: conv.summary,
      messageCount: conv.messageCount,
      createdAt: conv.timestamps?.createdAt || conv.createdAt || new Date().toISOString(),
      updatedAt: conv.timestamps?.updatedAt || conv.updatedAt || new Date().toISOString(),
      identification: conv.client?.identification,
      contract: conv.client?.contract,
      sector: conv.client?.sector,
      contactName: conv.client?.name,
      contactEmail: conv.client?.email,
      contactPhone: conv.client?.phone,
    }));

    await mcpClient.close();

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
      count: transformedConversations.length,
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: "Error al obtener conversaciones",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
