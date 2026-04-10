
import type { MCPClient } from "@ai-sdk/mcp";
import type { MCPToolSet } from "@/modules/assistant/lib/mcp-services";
import { buildCloseConversationMessage } from "@/modules/assistant/lib/channel-links";
import { saveInteraction } from "@/modules/assistant/lib/mcp-services";

interface TerminalToolResult {
  toolName: string;
  result: unknown;
  error?: string;
}

interface TerminalResponseOptions {
  channelLines?: string[];
}

function toolExecutionFailed(terminalResult: TerminalToolResult): boolean {
  if (terminalResult.error) return true;
  const result = terminalResult.result;
  if (!result || typeof result !== "object") return false;

  if (Object.prototype.hasOwnProperty.call(result, "success")) {
    const success = (result as { success?: unknown }).success;
    if (success === false) return true;
  }

  return false;
}

export function buildTerminalToolResponse(
  terminalResult: TerminalToolResult,
  options: TerminalResponseOptions = {}
): string {
  const failed = toolExecutionFailed(terminalResult);
  const channelLines = (options.channelLines || []).filter(Boolean);

  if (terminalResult.toolName === "escalate_to_specialist") {
    if (failed) {
      return "Intenté escalar tu caso, pero ocurrió un inconveniente técnico al registrarlo. Nuestro equipo revisará tu solicitud y te contactará por los canales habituales.";
    }

    return "Tu caso ya fue escalado con un especialista. El equipo de atención continuará contigo en breve por los canales de contacto registrados.";
  }

  if (terminalResult.toolName === "close_conversation") {
    if (failed) {
      return "Recibí tu solicitud de cierre, pero no pude completar el cierre automáticamente en este momento. De todos modos, no se ejecutarán más acciones sobre este caso hasta un nuevo mensaje tuyo.";
    }

    return buildCloseConversationMessage(channelLines);
  }

  return "La gestión solicitada fue procesada.";
}


export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}


interface RetriedHeaders {
  retried: boolean;
  model?: string;
}

export function createTextStreamResponse(
  content: string,
  retriedHeaders?: RetriedHeaders
): Response {
  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue(content);
      controller.close();
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      ...(retriedHeaders?.retried
        ? { "X-Retried": "true", "X-Retried-Model": retriedHeaders.model ?? "" }
        : {}),
    },
  });
}


interface BufferedRecoveryResult {
  text: string;
  model?: string;
}

interface ResilientStreamParams {
  originalStream: AsyncIterable<string>;
  hasToolContext: boolean;
  truncationThreshold: number;
  emptyFallback: string;
  retriedModel?: string;
  suffix?: string;
  recoverBuffered: () => Promise<BufferedRecoveryResult>;
}

interface ResilientStreamResponse {
  response: Response;
  streamDone: Promise<void>;
  getContentSent: () => string;
}

export function createResilientStreamResponse({
  originalStream,
  hasToolContext,
  truncationThreshold,
  emptyFallback,
  retriedModel,
  suffix = "",
  recoverBuffered,
}: ResilientStreamParams): ResilientStreamResponse {
  let contentSent = "";
  let resolveStreamDone: (() => void) | undefined;
  const streamDone = new Promise<void>((resolve) => {
    resolveStreamDone = resolve;
  });

  const wrappedStream = new ReadableStream<string>({
    async start(controller) {
      const enqueue = (text: string) => {
        controller.enqueue(text);
        contentSent += text;
      };

      let streamedContent = "";
      let clientReceived = false;

      try {
        for await (const chunk of originalStream) {
          streamedContent += chunk;

          if (hasToolContext && !clientReceived && streamedContent.length < truncationThreshold) {
            continue;
          }

          if (!clientReceived) {
            enqueue(streamedContent);
            clientReceived = true;
          } else {
            enqueue(chunk);
          }
        }

        if (!clientReceived) {
          const trimmed = streamedContent.trim();

          if (!hasToolContext && trimmed.length > 0) {
            enqueue(streamedContent);
          } else if (hasToolContext && trimmed.length > 0 && trimmed.length < truncationThreshold) {
            try {
              const recovery = await recoverBuffered();
              const recoveryText = recovery.text?.trim() || "";
              if (recoveryText.length > trimmed.length) {
                enqueue(recovery.text);
              } else {
                enqueue(streamedContent || emptyFallback);
              }
            } catch {
              enqueue(streamedContent || emptyFallback);
            }
          } else if (!trimmed) {
            try {
              const recovery = await recoverBuffered();
              enqueue(recovery.text || emptyFallback);
            } catch {
              enqueue(emptyFallback);
            }
          } else {
            enqueue(streamedContent);
          }
        }

        if (suffix) {
          enqueue(suffix);
        }
        controller.close();
      } catch {
        if (!clientReceived) {
          try {
            const recovery = await recoverBuffered();
            enqueue(recovery.text || emptyFallback);
          } catch {
            enqueue(streamedContent || emptyFallback);
          }
        } else {
        }
        if (suffix) {
          enqueue(suffix);
        }
        controller.close();
      } finally {
        resolveStreamDone?.();
      }
    },
  });

  const response = new Response(wrappedStream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      ...(retriedModel ? { "X-Retried": "true", "X-Retried-Model": retriedModel } : {}),
    },
  });

  return {
    response,
    streamDone,
    getContentSent: () => contentSent,
  };
}


interface SaveAndCleanupParams {
  tools: MCPToolSet;
  sessionId: string;
  content: string;
  identification?: string;
  contract?: string;
  summaryPromise: Promise<void> | null;
  mcpClient: MCPClient | null;
  silent?: boolean;
}

export async function saveModelAndCleanup({
  tools,
  sessionId,
  content,
  identification,
  contract,
  summaryPromise,
  mcpClient,
}: SaveAndCleanupParams): Promise<void> {
  try {
    if (Object.keys(tools).length > 0) {
      await saveInteraction({
        tools,
        sessionId,
        role: "model",
        content,
        identification,
        contract,
        silent: params.silent,
      });
    }
    if (summaryPromise) await summaryPromise;
    if (mcpClient) {
      await mcpClient.close();
    }
  } catch {
  }
}
