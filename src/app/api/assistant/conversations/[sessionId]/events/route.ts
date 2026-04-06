
import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL || "https://mcp-hono-production.up.railway.app";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return new Response("sessionId requerido", { status: 400 });
  }

  const upstreamUrl = `${MCP_SERVER_URL}/api/conversations/${encodeURIComponent(
    sessionId
  )}/events`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      let aborted = false;

      request.signal.addEventListener("abort", () => {
        aborted = true;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        try { controller.close(); } catch { }
      });

      heartbeatInterval = setInterval(() => {
        if (aborted) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 25_000);

      try {
        const upstreamRes = await fetch(upstreamUrl, {
          headers: {
            Accept: "text/event-stream",
            ...(MCP_API_KEY ? { Authorization: `Bearer ${MCP_API_KEY}` } : {}),
          },
          cache: "no-store",
          signal: request.signal,
        });

        if (!upstreamRes.ok || !upstreamRes.body) {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          controller.enqueue(
            encoder.encode("event: error\ndata: {\"error\":\"upstream_unavailable\"}\n\n")
          );
          controller.close();
          return;
        }

        const reader = upstreamRes.body.getReader();

        while (!aborted) {
          try {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          } catch {
            break;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
        }
      } finally {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (!aborted) {
          try { controller.close(); } catch { }
        }
      }
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
