/* eslint-disable @typescript-eslint/no-unused-vars */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://mcp-hono-production.up.railway.app";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

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

    const response = await fetch(
      `${MCP_SERVER_URL}/api/tools/get_conversation_status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(MCP_API_KEY ? { Authorization: `Bearer ${MCP_API_KEY}` } : {}),
        },
        body: JSON.stringify({ sessionId }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Error consultando estado" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: data.status || "active",
      closedBy: data.closedBy || null,
      glpiTicketId: data.glpiTicketId || null,
      specialistName: data.specialistName || null,
      reason: data.escalationReason || data.reason || null,
    });

  } catch {
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
