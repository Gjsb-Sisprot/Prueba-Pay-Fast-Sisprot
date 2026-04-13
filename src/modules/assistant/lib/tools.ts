import { z } from "zod";

// --- GLPI INTEGRATION (Consolidated to avoid build resolution issues) ---
const GLPI_BASE_URL = process.env.NEXT_PUBLIC_GLPI_BASE_URL || 'http://137.184.87.234/glpi/apirest.php';
const GLPI_APP_TOKEN_INIT = process.env.GLPI_APP_TOKEN_INIT || 'ytIQci5MfhFE33ribqFzM40CPJyGPaeIr4sscvBp';
const GLPI_APP_TOKEN_TICKET = process.env.GLPI_APP_TOKEN_TICKET || 'RycGNOH0qetlfv0nCLgPY693WfW4nr3UR4ClvtJG';
const GLPI_AUTH_BASIC = process.env.GLPI_AUTH_BASIC || 'Basic Z2xwaTo5UVpRU0d1SGZGckJhNnk=';
const GLPI_TIMEOUT = 15000;

interface GLPITicketInput {
  name: string;
  content: string;
  itilcategories_id?: number;
  type?: number;
  urgency?: number;
  _users_id_requester?: number;
}

interface GLPITicketResult {
  success: boolean;
  ticketId?: number;
  message: string;
  error?: string;
}

async function initGlpiSession(): Promise<string> {
  const response = await fetch(`${GLPI_BASE_URL}/initSession`, {
    method: 'POST',
    headers: {
      'App-Token': GLPI_APP_TOKEN_INIT,
      'Authorization': GLPI_AUTH_BASIC,
    },
    signal: AbortSignal.timeout(GLPI_TIMEOUT),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`GLPI initSession failed: ${response.status} ${text}`);
  }

  const data = await response.json() as { session_token: string };
  return data.session_token;
}

async function killGlpiSession(sessionToken: string): Promise<void> {
  try {
    await fetch(`${GLPI_BASE_URL}/killSession`, {
      method: 'GET',
      headers: {
        'App-Token': GLPI_APP_TOKEN_TICKET,
        'Session-Token': sessionToken,
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silently ignore session termination errors
  }
}

async function createGlpiTicketInternal(input: GLPITicketInput): Promise<GLPITicketResult> {
  let sessionToken: string | null = null;
  try {
    sessionToken = await initGlpiSession();

    const body = {
      input: {
        name: input.name,
        content: input.content,
        itilcategories_id: input.itilcategories_id || 22,
        type: input.type || 1,
        urgency: input.urgency || 5,
        _users_id_requester: input._users_id_requester || 19,
      },
    };

    const response = await fetch(`${GLPI_BASE_URL}/Ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'App-Token': GLPI_APP_TOKEN_TICKET,
        'Session-Token': sessionToken,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GLPI_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`GLPI createTicket failed: ${response.status} ${text}`);
    }

    const data = await response.json() as { id: number; message: string };
    
    killGlpiSession(sessionToken).catch(() => {});

    return {
      success: true,
      ticketId: data.id,
      message: `Ticket #${data.id} creado exitosamente`,
    };
  } catch (error) {
    if (sessionToken) killGlpiSession(sessionToken).catch(() => {});
    return {
      success: false,
      message: 'Error al crear ticket en GLPI',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
// --------------------------------------------------------------------------


export const TOOLS_ENABLED =
  process.env.NEXT_PUBLIC_ASSISTANT_TOOLS_ENABLED === "true";


export const queryClientSchema = z.object({
  identification: z
    .string()
    .describe("Cédula o RIF del cliente (ej: V-12345678, J-12345678-9)"),
});

export const queryInvoicesSchema = z.object({
  contractId: z.string().describe("ID del contrato a consultar"),
  status: z
    .enum(["pending", "paid", "overdue", "all"])
    .optional()
    .default("all")
    .describe("Filtro por estado de factura"),
});

export const searchKnowledgeSchema = z.object({
  query: z.string().describe("Pregunta o tema a buscar en lenguaje natural"),
  category: z
    .enum(["faq", "guide", "policy", "service", "general"])
    .optional()
    .describe("Categoría para filtrar la búsqueda"),
  maxResults: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .default(3)
    .describe("Número máximo de resultados relevantes"),
});

export const getCurrencyRateSchema = z.object({});

export const checkPaymentStatusSchema = z.object({
  reference: z.string().describe("Número de referencia del pago"),
  paymentMethod: z
    .enum(["pago_movil", "transferencia", "zelle"])
    .optional()
    .describe("Método de pago utilizado"),
});

export const createGlpiTicketSchema = z.object({
  name: z.string().describe("Título corto y descriptivo del ticket"),
  content: z.string().describe("Contenido detallado del problema u observación"),
  categoryId: z.number().optional().describe("ID de la categoría Itil (default: 22)"),
  urgency: z.number().min(1).max(5).optional().describe("Urgencia del ticket (1-5, default: 5)"),
  requesterId: z.number().optional().describe("_users_id_requester (default: 19)"),
});


export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "queryClient",
    description:
      "Consulta información de un cliente de Sisprot por su cédula o RIF. " +
      "Retorna datos básicos del cliente como nombre, contratos activos y estado.",
    schema: queryClientSchema,
  },
  {
    name: "queryInvoices",
    description:
      "Consulta las facturas de un contrato específico. " +
      "Puede filtrar por estado (pendiente, pagada, vencida).",
    schema: queryInvoicesSchema,
  },
  {
    name: "searchKnowledge",
    description:
      "Busca información en la base de conocimientos de Sisprot. " +
      "Útil para responder preguntas sobre servicios, políticas, procedimientos y FAQs.",
    schema: searchKnowledgeSchema,
  },
  {
    name: "getCurrencyRate",
    description:
      "Obtiene la tasa de cambio actual del BCV (Banco Central de Venezuela). " +
      "Útil cuando el cliente pregunta sobre precios en dólares o bolívares.",
    schema: getCurrencyRateSchema,
  },
  {
    name: "checkPaymentStatus",
    description:
      "Verifica el estado de un pago reportado. " +
      "Útil para confirmar si un pago fue procesado correctamente.",
    schema: checkPaymentStatusSchema,
  },
  {
    name: "create_glpi_ticket",
    description:
      "Crea un ticket de soporte en GLPI para seguimiento técnico o administrativo. " +
      "Utilízalo cuando el problema no se pueda resolver automáticamente o requiera atención humana.",
    schema: createGlpiTicketSchema,
  },
];


interface ToolResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export async function executeCurrencyRate(): Promise<ToolResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const response = await fetch(`${baseUrl}/api/currency-rate`);

    if (!response.ok) {
      throw new Error("Error al obtener tasa de cambio");
    }

    const data = await response.json();
    const rate = data.rate || data.valor;

    return {
      success: true,
      message: `La tasa de cambio actual es de ${rate} Bs por dólar.`,
      data: { rate, source: "BCV" },
    };
  } catch {
    return {
      success: false,
      message:
        "No pude obtener la tasa de cambio en este momento. " +
        "Por favor, consulta la página del BCV o intenta más tarde.",
    };
  }
}

export async function executeCreateGlpiTicket(args: z.infer<typeof createGlpiTicketSchema>): Promise<ToolResponse> {
  try {
    const result = await createGlpiTicketInternal({
      name: args.name,
      content: args.content,
      itilcategories_id: args.categoryId,
      urgency: args.urgency,
      _users_id_requester: args.requesterId,
    });

    if (result.success) {
      return {
        success: true,
        message: `¡Listo! He creado el ticket de soporte en GLPI con el ID #${result.ticketId}. Un especialista revisará tu caso pronto.`,
        data: { ticketId: result.ticketId },
      };
    } else {
      throw new Error(result.error || result.message);
    }
  } catch (error) {
    return {
      success: false,
      message: `Tuve un problema al intentar crear el ticket en GLPI: ${error instanceof Error ? error.message : "Error desconocido"}.`,
    };
  }
}

/**
 * Retorna las herramientas locales en un formato compatible con lo que espera el Router (MCPToolSet).
 */
export const getLocalTools = (): Record<string, any> => {
  return {
    getCurrencyRate: {
      name: "getCurrencyRate",
      description: "Obtiene la tasa de cambio actual del BCV.",
      inputSchema: { type: "object", properties: {}, required: [] },
      execute: async () => {
        const res = await executeCurrencyRate();
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    create_glpi_ticket: {
      name: "create_glpi_ticket",
      description: "Crea un ticket de soporte en GLPI.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Título del ticket" },
          content: { type: "string", description: "Contenido detallado" },
          categoryId: { type: "number", description: "ID de categoría (opcional)" },
          urgency: { type: "number", description: "Urgencia 1-5 (opcional)" },
          requesterId: { type: "number", description: "ID de solicitante (opcional)" },
        },
        required: ["name", "content"],
      },
      execute: async (args: Record<string, any>) => {
        const res = await executeCreateGlpiTicket(args);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    }
  };
};

export function getPlaceholderResponse(toolName: string): ToolResponse {
  return {
    success: false,
    message: `La herramienta "${toolName}" estará disponible próximamente cuando se conecte el servidor MCP.`,
  };
}


export type ToolStatus = "enabled" | "disabled" | "coming_soon" | "partial";

export interface ToolInfo {
  name: string;
  description: string;
  status: ToolStatus;
  icon: string;
}

export const toolsInfo: Record<string, ToolInfo> = {
  queryClient: {
    name: "Consulta de Clientes",
    description: "Busca información de clientes por cédula",
    status: "coming_soon",
    icon: "User",
  },
  queryInvoices: {
    name: "Consulta de Facturas",
    description: "Revisa facturas pendientes y pagadas",
    status: "coming_soon",
    icon: "Receipt",
  },
  searchKnowledge: {
    name: "Base de Conocimientos",
    description: "Busca en documentos y guías de Sisprot",
    status: "coming_soon",
    icon: "BookOpen",
  },
  getCurrencyRate: {
    name: "Tasa de Cambio",
    description: "Consulta la tasa BCV actual",
    status: "partial",
    icon: "DollarSign",
  },
  checkPaymentStatus: {
    name: "Estado de Pagos",
    description: "Verifica si un pago fue procesado",
    status: "coming_soon",
    icon: "CheckCircle",
  },
};

export function isToolsEnabled(): boolean {
  return TOOLS_ENABLED;
}
