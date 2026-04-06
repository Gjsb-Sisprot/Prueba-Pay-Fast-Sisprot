
import type { MCPClient } from "@ai-sdk/mcp";
import type { MCPToolSet } from "@/modules/assistant/lib/mcp-types";
import type { ClientContextData } from "@/modules/assistant/lib/types";
import { saveInteraction } from "@/modules/assistant/lib/mcp-conversation";


export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function singleChunkStream(text: string): ReadableStream<Uint8Array> {
  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
  return stream.pipeThrough(new TextEncoderStream());
}

export function streamHeaders(retriedModel?: string): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    ...(retriedModel ? { "X-Retried": "true", "X-Retried-Model": retriedModel } : {}),
  };
}


interface SaveContext {
  tools: MCPToolSet;
  sessionId: string;
  clientData?: ClientContextData;
}

export async function saveModelResponse(
  ctx: SaveContext,
  content: string
): Promise<void> {
  if (Object.keys(ctx.tools).length === 0) return;

  await saveInteraction({
    tools: ctx.tools,
    sessionId: ctx.sessionId,
    role: "model",
    content,
    identification: ctx.clientData?.identification,
    contract: ctx.clientData?.contract,
  });
}

export async function cleanupMCP(
  mcpClient: MCPClient | null,
  ...promises: (Promise<void> | null)[]
): Promise<void> {
  for (const p of promises) {
    if (p) await p;
  }
  if (mcpClient) {
    await mcpClient.close();
  }
}
