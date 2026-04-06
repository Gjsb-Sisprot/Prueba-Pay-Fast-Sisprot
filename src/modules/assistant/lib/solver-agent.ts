import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import type { ClientContextData, AssistantConfig } from "./types";
import { buildSystemPrompt } from "./prompt-builder";
import type { ToolResult } from "./router-agent";

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const DEFAULT_SOLVER_MODEL = process.env.SOLVER_PRIMARY_MODEL?.trim() || "gemini-2.5-flash";
const SOLVER_FALLBACK_MODELS = ["gemini-2.5-flash-lite"] as const;
const MODEL_CHAIN = [
    DEFAULT_SOLVER_MODEL,
    ...SOLVER_FALLBACK_MODELS.filter((model) => model !== DEFAULT_SOLVER_MODEL),
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorDetail(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).substring(0, 300);
}

const TRUNCATION_THRESHOLD = 200;

function buildSolverSystemPrompt(clientData: ClientContextData | undefined, hasHistory: boolean = false): string {
    const portalChannelRule = clientData?.identification
        ? `

### REGLA DE PORTAL AUTENTICADO:
El cliente ya esta dentro del portal autenticado.
- NO le indiques "ingresa al portal" ni compartas la URL http://portal.sisprotgf.com.
- Si debe pagar o reportar pago, inicia con __PAYMENT_ACTION__ y guialo usando los accesos de pago visibles en esta misma interfaz.`
        : `

### REGLA DE PORTAL NO AUTENTICADO:
Si no hay cliente autenticado y el usuario pide pagar o reportar pago, puedes compartir la URL oficial http://portal.sisprotgf.com.`;

    const noGreetingRule = hasHistory ? `

### ⛔ REGLA MÁXIMA ANTI-SALUDOS (CRÍTICA):
ESTÁ TOTALMENTE PROHIBIDO SALUDAR EN ESTE RESPUESTA.
Como la conversación ya está en curso (ya hay historial), TU RESPUESTA DEBE IR DIRECTAMENTE AL GRANO.
NO DIGAS "Hola", NO DIGAS "Soy Susana", NO des los buenos días/tardes.
IGNORA la cortesía inicial y RESPONDE DIRECTAMENTE OBRANDO SEGÚN LA SOLICITUD DEL USUARIO.` : "";

    return buildSystemPrompt(clientData) + portalChannelRule + noGreetingRule + `
    
### REGLA SUPREMA DE SEGURIDAD:
BAJO NINGUNA CIRCUNSTANCIA generes una respuesta vacía o en blanco.
Si no sabes qué responder, di: "Disculpa, no entendí tu consulta. ¿Podrías darme más detalles?"
Si hay un error técnico, di: "Tuve un problema técnico momentáneo. ¿Me repites la pregunta?"
SIEMPRE ESCRIBE ALGO.

### FORMATO DE RESPUESTA:
- Responde DIRECTAMENTE al usuario.
- NO incluyas bloques de pensamiento, "Wait...", "Analysis:", ni etiquetas XML de thinking.
- Tu salida es lo que el usuario final leerá en su chat.

### REGLA DE COHERENCIA CONVERSACIONAL:
Analiza el historial de la conversación ANTES de responder:
1. Si el usuario dice "no respondiste", "incompleto", "faltó" → Completa la información ANTERIOR
2. Si el usuario hace una pregunta NUEVA → Respóndela directamente
3. NUNCA cambies de tema sin que el usuario lo pida
4. Si estabas dando información y el usuario pide más → CONTINÚA con esa información

### REGLA DE NO USAR HERRAMIENTAS DIAGNÓSTICAS SIN CONTEXTO:
Si el usuario NO ha reportado un problema técnico de internet:
- NO diagnostiques la ONU
- NO menciones deuda si no preguntó
- NO inventes problemas que el usuario no reportó
Responde SOLO a lo que el usuario preguntó.

### REGLA DE VERIFICACIÓN DE ESCALAMIENTO Y CIERRE:
- Solo afirma "ya escalé el caso" si en [INFORMACIÓN OBTENIDA DE LAS HERRAMIENTAS] existe un resultado de "escalate_to_specialist".
- Solo afirma "conversación cerrada" si existe un resultado de "close_conversation".
- Si esos resultados no están presentes, NO afirmes acciones ya ejecutadas; pide confirmación o indica el siguiente paso.`;
}

export interface SolverOptions {
    config?: Partial<AssistantConfig>;
    sessionId?: string;
    conversationHistory?: SolverMessage[];
}

interface SolverMessage {
    role: "user" | "assistant";
    content: string;
}

export function generateResponse(
    message: string,
    clientData: ClientContextData | undefined,
    toolResults: ToolResult[] = [],
    options: SolverOptions = {}
) {
    const { config, conversationHistory = [] } = options;

    const assistantConfig = {
        model: MODEL_CHAIN[0],
        temperature: 0.7,
        ...config
    };

    const systemPrompt = buildSolverSystemPrompt(clientData, conversationHistory.length > 0);

    const messages = buildSolverMessages(message, toolResults, conversationHistory);

    const result = streamText({
        model: google(assistantConfig.model),
        system: systemPrompt,
        messages,
        temperature: assistantConfig.temperature,
        maxRetries: 0,
        maxOutputTokens: 8192,
    });

    return result;
}

export interface BufferedResponse {
    text: string;
    finishReason: string;
    model: string;
    retried: boolean;
}

export async function generateResponseBuffered(
    message: string,
    clientData: ClientContextData | undefined,
    toolResults: ToolResult[] = [],
    options: SolverOptions = {}
): Promise<BufferedResponse> {
    const { config, conversationHistory = [] } = options;

    const primaryModel = config?.model || MODEL_CHAIN[0];
    const temperature = config?.temperature ?? 0.7;

    const chain = primaryModel === MODEL_CHAIN[0]
        ? MODEL_CHAIN
        : [primaryModel, ...MODEL_CHAIN.filter(m => m !== primaryModel)];

    const systemPrompt = buildSolverSystemPrompt(clientData, conversationHistory.length > 0);
    const messages = buildSolverMessages(message, toolResults, conversationHistory);

    for (let i = 0; i < chain.length; i++) {
        const modelName = chain[i];
        const isLast = i === chain.length - 1;

        try {
            const result = await generateText({
                model: google(modelName),
                system: systemPrompt,
                messages,
                temperature,
                maxOutputTokens: 8192,
                maxRetries: isLast ? 2 : 0,
            });

            const text = result.text?.trim() || "";
            const reason = result.finishReason || "unknown";

            if (reason === "stop" && text.length >= TRUNCATION_THRESHOLD) {
                return { text: result.text, finishReason: reason, model: modelName, retried: i > 0 };
            }

            if (reason === "stop" && toolResults.length === 0) {
                return { text: result.text, finishReason: reason, model: modelName, retried: i > 0 };
            }

            if (!isLast) {
                continue;
            }

            return { text: result.text || "", finishReason: reason, model: modelName, retried: i > 0 };
        } catch (_err) {
            // const isAbort = errorDetail(err).includes("abort") || (err instanceof Error && err.name === "AbortError");
            if (!isLast) {
                continue;
            }
        }
    }

    return {
        text: "",
        finishReason: "error",
        model: chain[chain.length - 1],
        retried: true,
    }
}

function buildSolverMessages(
    userMessage: string,
    toolResults: ToolResult[],
    conversationHistory: SolverMessage[]
): SolverMessage[] {
    const messages: SolverMessage[] = [...conversationHistory];
    const hasCloseConversationResult = toolResults.some((tr) => tr.toolName === "close_conversation");
    const closeConversationInstruction = hasCloseConversationResult
        ? `

8. **CIERRE CON RECORDATORIO DE CANALES**:
   - Como este mensaje cerrará la conversación, despídete de forma cordial y breve.
   - Incluye un recordatorio para visitar las redes oficiales de Sisprot, su canal de YouTube y WhatsApp.
   - Si ya tienes enlaces concretos en el contexto disponible, compártelos; si no, deja el recordatorio en formato general.`
        : "";

    const followUpPatterns = /no respond|incompleto|falt[óa]|continúa|más información|explica mejor|no entendí/i;
    const isFollowUp = followUpPatterns.test(userMessage);

    if (toolResults.length > 0) {
        const toolContext = formatToolResults(toolResults, userMessage);
        messages.push({
            role: "user",
            content: `${userMessage}

---
[INFORMACIÓN OBTENIDA DE LAS HERRAMIENTAS]
${toolContext}
---

INSTRUCCIONES CRÍTICAS PARA EL AGENTE:

1. **PRIORIDAD AL RAG (Knowledge Base)**:
   - Si los resultados incluyen información corporativa o planes desde el Knowledge Base, **USA TODA la información disponible**.
   - Si devolvió un PROCEDIMIENTO técnico, **SIGUE SUS PASOS EXACTOS**.
   - **NO omitas datos** - el usuario quiere información completa.

2. **RESPUESTA COMPLETA**:
   - Si la información viene del KB, incluye TODOS los puntos relevantes.
   - Formatea con listas si hay múltiples elementos.
   - Si hay dirección, teléfono, horarios, etc., inclúyelos.

3. **MANEJO DE ERRORES DE HERRAMIENTAS**:
   - Si una herramienta técnica falla (success: false, error 401/Not Found):
     * NO inventes datos.
     * Informa al usuario que no pudiste obtener la información.

4. **REGLA DE ORO**:
   - SIEMPRE genera una respuesta útil que responda la pregunta del usuario.
    - NO cambies de tema ni diagnostiques cosas que el usuario no pidió.

5. **ESCALAMIENTO VERIFICABLE**:
    - Solo digas que "el caso fue escalado" si en los resultados aparece la herramienta "escalate_to_specialist".
    - Si no aparece esa herramienta, pide confirmación antes de sugerir escalar.

6. **REDES Y CANALES DIGITALES**:
   - Si el usuario pregunta por Instagram, YouTube, Facebook, WhatsApp o redes de Sisprot:
   - Usa preferentemente el bloque [ENLACES_Y_CANALES_DETECTADOS] del contexto de herramientas.
    - Comparte enlaces/handles exactos, en líneas separadas, sin omitirlos ni resumirlos como texto genérico.

7. **PORTAL AUTENTICADO Y PAGOS**:
    - Si en el contexto aparece que el cliente ya esta autenticado en el portal, NO le indiques entrar al portal ni compartas la URL http://portal.sisprotgf.com.
    - Para acciones de pago o reporte, guia al cliente dentro de la interfaz actual y usa __PAYMENT_ACTION__ cuando aplique.${closeConversationInstruction}`,
        });
    } else if (isFollowUp && conversationHistory.length > 0) {
        messages.push({
            role: "user",
            content: `${userMessage}

INSTRUCCIÓN IMPORTANTE: El usuario indica que tu respuesta anterior fue incompleta o insuficiente.
- NO cambies de tema
- NO uses nuevas herramientas (no tienes nuevos datos)
- COMPLETA la información que estabas dando antes
- Si ya diste toda la información disponible, díselo amablemente`,
        });
    } else {
        messages.push({
            role: "user",
            content: `${userMessage}

IMPORTANTE: SIEMPRE genera una respuesta. Si no tienes suficiente información, pide al usuario que describa mejor su situación o pregúntale en qué puedes ayudarle. NUNCA dejes la respuesta en blanco. Responde SOLO a lo que el usuario preguntó. Además, en este turno no tienes evidencia de herramientas terminales: NO afirmes que el caso ya fue escalado o cerrado.`,
        });
    }

    return messages;
}

function formatToolResults(toolResults: ToolResult[], userMessage: string): string {
    const preserveLinksSummary = shouldPreserveLinksSummary(userMessage);

    return toolResults
        .map((tr, index) => {
            let resultText: string;

            if (tr.error) {
                resultText = `⚠️ Error en herramienta: ${tr.error}`;
            } else {
                // Limpieza inteligente según la herramienta
                resultText = cleanToolResult(tr.toolName, tr.result);
            }

            const linksSummary = preserveLinksSummary ? buildLinksSummary(resultText) : "";

            // Truncado inteligente: Si hay enlaces, dejamos menos espacio para el contenido
            const maxContentLength = linksSummary ? 2500 : 3000;
            if (resultText.length > maxContentLength) {
                resultText = resultText.substring(0, maxContentLength) + "... [CONTENIDO TRUNCADO POR BREVEDAD]";
            }

            const finalText = linksSummary
                ? `${linksSummary}\n\n[RESUMEN DE CONTENIDO]\n${resultText}`
                : resultText;

            return `[HERRAMIENTA ${index + 1}: ${tr.toolName}]\n${finalText}`;
        })
        .join("\n\n---\n\n");
}

/**
 * Limpia y resume el resultado de una herramienta específica para el Solver
 */
function cleanToolResult(toolName: string, result: unknown): string {
    if (!result) return "Sin datos devueltos.";

    try {
        switch (toolName) {
            case "search_knowledge_base":
                return cleanKnowledgeBaseResult(result);
            case "get_onu_diagnostic":
                return cleanOnuDiagnosticResult(result);
            case "get_client_status":
                return cleanClientStatusResult(result);
            case "sisprot": // Si viene del módulo completo
                return cleanClientStatusResult(result);
            default:
                // Para otras herramientas, devolvemos un JSON compacto si es objeto
                return typeof result === "object" 
                    ? JSON.stringify(result, null, 1) 
                    : String(result);
        }
    } catch {
        return typeof result === "object" ? JSON.stringify(result) : String(result);
    }
}

function cleanKnowledgeBaseResult(result: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = result as any;
    const documents = Array.isArray(res) ? res : res.documents || res.results || [];
    if (documents.length === 0) return "No se encontró información relevante en la base de conocimientos.";

    return documents
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((doc: any, i: number) => {
            const title = doc.title || doc.metadata?.title || `Documento ${i + 1}`;
            const content = doc.content || doc.text || "";
            // Limpiar saltos de línea excesivos y espacios
            const cleanContent = content.replace(/\s+/g, " ").trim().substring(0, 800);
            return `DOC: ${title}\nCONTENIDO: ${cleanContent}`;
        })
        .join("\n\n");
}

function cleanOnuDiagnosticResult(result: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = result as any;
    const data = res.data || res;
    if (!data || data.error) return `Error de diagnóstico: ${data.error || "Datos no encontrados"}`;

    const status = data.status || data.state || "Desconocido";
    const signal = data.signal || data.rxPower || "N/A";
    const cause = data.offlineCause || data.lastDyingGasp || "Ninguna";
    const uptime = data.uptime || "N/A";
    const sn = data.serialNumber || data.sn || "N/A";

    return [
        `ESTADO: ${status}`,
        `SEÑAL (RX): ${signal} dBm`,
        `CAUSA_OFFLINE: ${cause}`,
        `TIEMPO_LINEA: ${uptime}`,
        `SERIAL_ONU: ${sn}`,
        data.oltContext ? `CONTEXTO_OLT: ${data.oltContext}` : ""
    ].filter(Boolean).join("\n");
}

function cleanClientStatusResult(result: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = result as any;
    const data = res.client || res.data || res;
    if (!data) return "Datos de cliente inaccesibles.";

    return [
        `CLIENTE: ${data.name || "N/A"} (${data.identification || "N/A"})`,
        `SERVICIO: ${data.serviceStatus || "N/A"}`,
        `DEUDA_PENDIENTE: ${data.debtAmount ?? "0"} USD`,
        `CONTRATOS: ${data.totalContracts || "1"}`,
        `PLAN: ${data.planName || "N/A"}`,
        `SECTOR: ${data.sector || "N/A"}`
    ].join("\n");
}


function shouldPreserveLinksSummary(userMessage: string): boolean {
    const normalized = userMessage.toLowerCase();
    return /(red(es|es\s*sociales?)|instagram|youtube|whatsapp|facebook|canales?|enlaces?|links?|contacto\s*digital|rrss)/i.test(normalized);
}

function buildLinksSummary(text: string): string {
    const urls = extractUrls(text);
    const instagramHandles = extractInstagramHandles(text);

    const normalizedInstagramUrls = instagramHandles.map((handle) => `https://www.instagram.com/${handle}`);

    const uniqueLines = Array.from(new Set([
        ...urls,
        ...instagramHandles.map((handle) => `@${handle}`),
        ...normalizedInstagramUrls,
    ]));

    if (uniqueLines.length === 0) return "";

    const lines = uniqueLines.map((line) => `- ${line}`).join("\n");
    return `[ENLACES_Y_CANALES_DETECTADOS]\n${lines}`;
}

function extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s)\]"'`]+/gi;
    const matches = text.match(urlRegex) ?? [];

    return matches
        .map((url) => url.replace(/[.,;:!?]+$/g, ""))
        .filter(Boolean);
}

function extractInstagramHandles(text: string): string[] {
    const handleRegex = /(^|[^\w.])@([a-z0-9._]{3,30})\b/gi;
    const handles = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = handleRegex.exec(text)) !== null) {
        const handle = (match[2] || "").toLowerCase();
        if (!handle) continue;
        if (handle.includes(".com") || handle.includes(".net")) continue;
        handles.add(handle);
    }

    return Array.from(handles);
}

export async function generateResponseSync(
    message: string,
    clientData: ClientContextData | undefined,
    toolResults: ToolResult[] = [],
    options: SolverOptions = {}
): Promise<string> {
    const stream = generateResponse(message, clientData, toolResults, options);

    let fullText = "";
    for await (const chunk of stream.textStream) {
        fullText += chunk;
    }

    return fullText;
}
