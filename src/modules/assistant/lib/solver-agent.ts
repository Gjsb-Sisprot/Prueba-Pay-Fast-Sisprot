import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import type { ClientContextData, AssistantConfig, MediaAttachment } from "./types";
import { buildSystemPrompt } from "./prompt-builder";
import type { ToolResult } from "./router-agent";

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const DEFAULT_SOLVER_MODEL = process.env.SOLVER_PRIMARY_MODEL?.trim() || "gemini-1.5-flash";
const SOLVER_FALLBACK_MODELS = ["gemini-1.5-flash-8b"] as const;
const MODEL_CHAIN = [
    DEFAULT_SOLVER_MODEL,
    ...SOLVER_FALLBACK_MODELS.filter((model) => model !== DEFAULT_SOLVER_MODEL),
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorDetail(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).substring(0, 300);
}

const TRUNCATION_THRESHOLD = 1000;

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

    // Buscamos si el contrato SELECCIONADO específicamente es el cancelado
    const selectedContractData = clientData?.allContracts?.find(c => c.contractId.toString() === clientData?.contract?.toString());
    const isSelectedCancelled = selectedContractData?.statusName?.toLowerCase().includes("cancel") || 
                               selectedContractData?.status?.toString().toLowerCase().includes("cancel");

    const statusInterceptor = isSelectedCancelled
        ? `
### 🚨 INTERCEPTOR DE SEGURIDAD (CONTRATO SELECCIONADO CANCELADO):
EL CONTRATO #${clientData?.contract} ESTÁ CANCELADO.
- **PROHIBICIÓN TOTAL**: NO uses el saludo "¡Genial! Actualmente no tienes deudas...". NO uses el token __SELECT_ISSUE_TYPE__.
- **INSTRUCCIÓN**: Informa directamente: "Tu servicio para el contrato #${clientData?.contract} se encuentra actualmente **Cancelado**. Debes pagar tus facturas pendientes para procesar una **Reactivación** y recuperar la navegación."
- **PRÓXIMO PASO**: Pregunta si desea que generes el reporte de reactivación.
- **ESTRICTO**: Ignora cualquier protocolo técnico o saludo de cliente activo que veas en el resto del prompt.` : "";

    const uiTokenEnforcement = `
### 🚨 REGLA DE CUMPLIMIENTO TÉCNICO (UI TOKENS):
- Si el prompt incluye tokens como __SELECT_ISSUE_TYPE__, __PAYMENT_ACTION__, __CALENDAR_ACTION__ o __SELECT_CONTRACT__, DEBES USARLOS EXACTAMENTE.
- **PROHIBICIÓN**: No parafrasees las opciones descritas por los tokens. El token ES el comando que genera los botones. Si escribes el texto por tu cuenta, el sistema fallará.
- REVISA tu salida: Si debías saludar a un cliente activo, asegúrate de haber incluido __SELECT_ISSUE_TYPE__.`;

    return buildSystemPrompt(clientData) + portalChannelRule + noGreetingRule + statusInterceptor + uiTokenEnforcement + `
    
### REGLA SUPREMA DE SEGURIDAD:
BAJO NINGUNA CIRCUNSTANCIA generes una respuesta vacía o en blanco.
Si no sabes qué responder o hay un error técnico, di: "Disculpa, no entendí tu consulta o tuve un problema técnico momentáneo. ¿Podrías darme más detalles para ayudarte mejor o consultar nuestra web oficial www.sisprotgf.com?"
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

### REGLA DE COORDINACIÓN — VISITA Y TICKET (CRÍTICO):

1. **FLUJO TÉCNICO (Requiere Visita)**:
   - Si detectas una falla que requiere visita (luz roja, falla persistente), **PRIMERO** debes mostrar el calendario iniciando tu respuesta con **__CALENDAR_ACTION__**.
   - **PROHIBICIÓN**: NO afirmes haber registrado un ticket ni des un número ID hasta que el usuario haya seleccionado su cita.
   - Solo cuando el resultado de la herramienta \`escalate_to_specialist\` esté presente en [INFORMACIÓN OBTENIDA DE LAS HERRAMIENTAS], entrega el ID del ticket **#12345** y confirma la cita.

2. **FLUJO ADMINISTRATIVO / CANCELADOS (Sin Visita)**:
   - Si el contrato está **CANCELADO** o es un reclamo administrativo, la prioridad es la inmediatez.
   - **DEBES** entregar el número de ticket **#ID** en tu primera respuesta de confirmación si la herramienta ya fue ejecutada.
   - NO pidas calendario ni bloquees al usuario con agendamientos.

3. **VERIFICACIÓN FINAL**:
   - Solo afirma "ya registré tu ticket/reporte" si ves el resultado exitoso en el contexto técnico.
   - Si el ticket es técnico exitoso, recuerda incluir la frase de SLA (24 horas).
   - Solo afirma "conversación cerrada" si existe un resultado de "close_conversation".`;
}

export interface SolverOptions {
    config?: Partial<AssistantConfig>;
    sessionId?: string;
    conversationHistory?: SolverMessage[];
    attachments?: MediaAttachment[];
}

interface SolverMessage {
    role: "user" | "assistant";
    content: string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }>;
}

export function generateResponse(
    message: string,
    clientData: ClientContextData | undefined,
    toolResults: ToolResult[] = [],
    options: SolverOptions = {}
) {
    const { config, conversationHistory = [], attachments = [] } = options;

    const assistantConfig = {
        model: MODEL_CHAIN[0],
        temperature: 0.7,
        ...config
    };

    const systemPrompt = buildSolverSystemPrompt(clientData, conversationHistory.length > 0);

    // Truncamos historial de forma agresiva (últimos 8 mensajes previos)
    const truncatedHistory = conversationHistory.slice(-15);
    const messages = buildSolverMessages(message, toolResults, truncatedHistory, attachments);

    const result = streamText({
        model: google(assistantConfig.model),
        system: systemPrompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
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
    const { config, conversationHistory = [], attachments = [] } = options;

    const primaryModel = config?.model || MODEL_CHAIN[0];
    const temperature = config?.temperature ?? 0.7;

    const chain = primaryModel === MODEL_CHAIN[0]
        ? MODEL_CHAIN
        : [primaryModel, ...MODEL_CHAIN.filter(m => m !== primaryModel)];

    const systemPrompt = buildSolverSystemPrompt(clientData, conversationHistory.length > 0);
    const truncatedHistory = conversationHistory.slice(-8);
    const messages = buildSolverMessages(message, toolResults, truncatedHistory, attachments);

    for (let i = 0; i < chain.length; i++) {
        const modelName = chain[i];
        const isLast = i === chain.length - 1;

        try {
            const result = await generateText({
                model: google(modelName),
                system: systemPrompt,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                messages: messages as any,
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
        } catch {
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
    conversationHistory: SolverMessage[],
    attachments?: MediaAttachment[]
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

    const toolContext = toolResults.length > 0 ? formatToolResults(toolResults, userMessage) : "";

    const content: SolverMessage['content'] = [];
    
    // 1. Agregar texto principal
    let promptSuffix = "";
    if (toolResults.length > 0) {
        promptSuffix = `\n\n---\n[INFORMACIÓN OBTENIDA DE LAS HERRAMIENTAS]\n${toolContext}\n---\n\nINSTRUCCIONES CRÍTICAS PARA EL AGENTE:\n\n1. **PRIORIDAD AL RAG (Knowledge Base)**:\n   - Si los resultados incluyen información corporativa o planes desde el Knowledge Base, **USA TODA la información disponible**.\n   - Si devolvió un PROCEDIMIENTO técnico, **SIGUE SUS PASOS EXACTOS**.\n   - **NO omitas datos** - el usuario quiere información completa.\n\n2. **RESPUESTA COMPLETA**:\n   - Si la información viene del KB, incluye TODOS los puntos relevantes.\n   - Formatea con listas si hay múltiples elementos.\n   - Si hay dirección, teléfono, horarios, etc., inclúyelos.\n\n3. **MANEJO DE ERRORES DE HERRAMIENTAS**:\n   - Si una herramienta técnica falla (success: false, error 401/Not Found):\n     * NO inventes datos.\n     * Informa al usuario que no pudiste obtener la información.\n\n4. **REGLA DE ORO**:\n   - SIEMPRE genera una respuesta útil que responda la pregunta del usuario.\n    - NO cambies de tema ni diagnostiques cosas que el usuario no pidió.\n\n5. **REPORTE VERIFICABLE**:\n     - Solo di que "el reporte fue registrado" o "el ticket fue creado" si en los resultados aparece la herramienta "escalate_to_specialist" o "create_glpi_ticket".\n     - Si no aparecen esas herramientas, pide confirmación antes de sugerir el registro oficial del caso.\n\n6. **REDES Y CANALES DIGITALES**:\n   - Si el usuario pregunta por Instagram, YouTube, Facebook, WhatsApp o redes de Sisprot:\n   - Usa preferentemente el bloque [ENLACES_Y_CANALES_DETECTADOS] del contexto de herramientas.\n    - Comparte enlaces/handles exactos, en líneas separadas, sin omitirlos ni resumirlos como texto genérico.\n\n7. **PORTAL AUTENTICADO Y PAGOS**:\n    - Si en el contexto aparece que el cliente ya esta autenticado en el portal, NO le indiques entrar al portal ni compartas la URL http://portal.sisprotgf.com.\n    - Para acciones de pago o reporte, guia al cliente dentro de la interfaz actual y usa __PAYMENT_ACTION__ cuando aplique.${closeConversationInstruction}`;
    } else if (isFollowUp && conversationHistory.length > 0) {
        promptSuffix = `\n\nINSTRUCCIÓN IMPORTANTE: El usuario indica que tu respuesta anterior fue incompleta o insuficiente.\n- NO cambies de tema\n- NO uses nuevas herramientas (no tienes nuevos datos)\n- COMPLETA la información que estabas dando antes\n- Si ya diste toda la información disponible, díselo amablemente`;
    } else {
        promptSuffix = `\n\nIMPORTANTE: SIEMPRE genera una respuesta. Si no tienes suficiente información, pide al usuario que describa mejor su situación o pregúntale en qué puedes ayudarle. NUNCA dejes la respuesta en blanco. Responde SOLO a lo que el usuario preguntó. Además, en este turno no tienes evidencia de herramientas terminales: NO afirmes que el reporte ya fue registrado o el ticket cerrado.`;
    }

    content.push({ type: 'text', text: userMessage + promptSuffix });

    // 2. Integrar imágenes si existen en este turno
    if (attachments && attachments.length > 0) {
        attachments.forEach(att => {
            if (att.type === 'image' && att.url) {
                // Extraer base64 si es data URL o usar URL si es pública
                const base64Match = att.url.match(/^data:image\/\w+;base64,(.+)$/);
                if (base64Match) {
                    content.push({ 
                        type: 'image', 
                        image: base64Match[1],
                        mimeType: att.mimeType || 'image/png'
                    });
                }
            } else if (att.type === 'video' && att.frames && att.frames.length > 0) {
                att.frames.forEach((frame: string) => {
                    const b64 = frame.match(/^data:image\/\w+;base64,(.+)$/);
                    if (b64) {
                        content.push({ 
                            type: 'image', 
                            image: b64[1],
                            mimeType: 'image/png'
                        });
                    }
                });
            }
        });
    }

    messages.push({
        role: "user",
        content: content as SolverMessage['content']
    });

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
            case "create_glpi_ticket":
            case "escalate_to_specialist":
                return cleanTicketResult(result);
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

function cleanTicketResult(result: unknown): string {
    try {
        const res = result as { message?: string; success?: boolean; data?: { ticketId?: number } };
        if (res.message) return res.message;
        const text = (result as { content?: Array<{ type: string; text: string }> })?.content?.[0]?.text;
        if (text) {
            const parsed = JSON.parse(text);
            return parsed.message || JSON.stringify(parsed);
        }
        return JSON.stringify(result);
    } catch {
        return String(result);
    }
}

function cleanKnowledgeBaseResult(result: unknown): string {
    interface KBDocument {
        title?: string;
        content?: string;
        text?: string;
        metadata?: { title?: string };
    }
    interface KBResult {
        documents?: KBDocument[];
        results?: KBDocument[];
    }

    const res = result as (KBDocument[] | KBResult);
    const documents = Array.isArray(res) ? res : (res.documents || res.results || []);
    if (documents.length === 0) return "No se encontró información relevante en la base de conocimientos.";

    return documents
        .slice(0, 3) // Solo los 3 documentos más relevantes
        .map((doc, i) => {
            const title = doc.title || doc.metadata?.title || `Documento ${i + 1}`;
            const content = doc.content || doc.text || "";
            // Limpiar saltos de línea excesivos y espacios, y reducir drásticamente a 800 chars
            const cleanContent = content.replace(/\s+/g, " ").trim().substring(0, 800);
            return `DOC: ${title}\nCONTENIDO: ${cleanContent}`;
        })
        .join("\n\n");
}

function cleanOnuDiagnosticResult(result: unknown): string {
    interface OnuData {
        status?: string;
        state?: string;
        signal?: string;
        rxPower?: string;
        offlineCause?: string;
        lastDyingGasp?: string;
        uptime?: string;
        serialNumber?: string;
        sn?: string;
        error?: string;
        oltContext?: string;
    }
    const res = result as { data?: OnuData } | OnuData;
    const data = ('data' in res && res.data) ? res.data : (res as OnuData);
    if (!data || data.error) return `Error de diagnóstico: ${data?.error || "Datos no encontrados"}`;

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
    interface ContractMini {
        contractId: number | string;
        status: string;
        isActive: boolean;
        debt: number | string;
        planName?: string;
    }
    interface ClientStatusData {
        name?: string;
        identification?: string;
        serviceStatus?: string;
        debtAmount?: number | string;
        totalContracts?: number | string;
        allContracts?: ContractMini[];
        planName?: string;
        sector?: string;
    }
    const res = result as { client?: ClientStatusData, data?: ClientStatusData } | ClientStatusData;
    const data = ('client' in res && res.client) ? res.client : (('data' in res && res.data) ? res.data : (res as ClientStatusData));
    
    if (!data) return "Datos de cliente inaccesibles.";

    const header = [
        `CLIENTE: ${data.name || "N/A"} (${data.identification || "N/A"})`,
        `SERVICIO GLOBAL: ${data.serviceStatus === 'active' ? 'ACTIVO' : 'SUSPENDIDO/OTRO'}`,
        `DEUDA TOTAL: ${data.debtAmount ?? "0"} USD`,
        `TOTAL CONTRATOS: ${data.totalContracts || "1"}`
    ];

    if (data.allContracts && Array.isArray(data.allContracts) && data.allContracts.length > 0) {
        const contractsList = data.allContracts.map(c => 
            `- Contrato #${c.contractId}: ${c.status} (${c.isActive ? 'Activo' : 'No Activo'}) | Plan: ${c.planName || 'N/A'} | Deuda: $${c.debt}`
        );
        return [...header, "DETALLE DE CONTRATOS:", ...contractsList].join("\n");
    }

    return [
        ...header,
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
