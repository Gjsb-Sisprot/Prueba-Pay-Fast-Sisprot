
import { z } from "zod";


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
  } catch (error) {
    return {
      success: false,
      message:
        "No pude obtener la tasa de cambio en este momento. " +
        "Por favor, consulta la página del BCV o intenta más tarde.",
    };
  }
}

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
