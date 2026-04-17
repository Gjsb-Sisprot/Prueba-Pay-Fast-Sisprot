import { z } from "zod";
import { getConversationBySessionId, updateConversationStatus, syncConversationMetadata } from "./persistence";
import { createTicket as createGlpiTicketInternal } from "./glpi";

// --- GLPI INTEGRATION (Consolidated logic is now imported from glpi.ts) ---
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

export const auditServiceSchema = z.object({
  contractId: z.string().describe("ID del contrato del cliente para realizar la auditoría interna"),
});

export const escalateToSpecialistSchema = z.object({
  sessionId: z.string().describe("ID de la sesión de chat"),
  reason: z.string().describe("Razón detallada del escalamiento"),
});

export const closeConversationSchema = z.object({
  sessionId: z.string().describe("ID de la sesión de chat"),
  resolution: z.string().min(10).describe("Resumen de cómo se resolvió la consulta"),
  closedBy: z.enum(["user", "assistant", "system"]).default("user"),
});

export const rebootOnuSchema = z.object({
  serialNumber: z.string().describe("Serial de la ONU (ej: SMAGXXXXXXXX)"),
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
  {
    name: "audit_service",
    description:
      "Ejecuta una auditoría interna del servicio de un cliente. " +
      "Debe usarse ANTES de pedir videos de la ONU en casos de falla total o intermitencia.",
    schema: auditServiceSchema,
  },
  {
    name: "reboot_onu",
    description: "Reinicia la ONU de forma remota para intentar solucionar problemas de conexión.",
    schema: rebootOnuSchema,
  },
  {
    name: "queryInvoices",
    description: "Consulta las facturas de un contrato específico para verificar deudas o pagos.",
    schema: queryInvoicesSchema,
  },
  {
    name: "queryClient",
    description: "Consulta información detallada del cliente por su identificación (Cedula/RIF).",
    schema: queryClientSchema,
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
      // Sincronizar ID de ticket con Supabase de forma asíncrona
      // Nota: executeCreateGlpiTicket no recibe sessionId directamente en los args estándar, 
      // pero si está disponible en el contexto global o si lo añadimos al esquema.
      // Por ahora, priorizamos executeEscalateToSpecialist que sí tiene sessionId.
      
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


export async function executeEscalateToSpecialist(args: z.infer<typeof escalateToSpecialistSchema>): Promise<ToolResponse> {
  try {
    const { sessionId, reason } = args;
    
    // 1. Obtener contexto del cliente desde la DB
    const conversation = await getConversationBySessionId(sessionId).catch(() => null);
    
    const clientName = conversation?.contact_name || "Cliente Desconocido";
    const identification = conversation?.identification || "N/A";
    
    // 2. Crear ticket en GLPI con fecha y hora si existen
    const visitInfo = conversation?.visit_date 
      ? `\nAGENDAMIENTO: Visita programada para el ${conversation.visit_date} a las ${conversation.visit_time || 'Hora por confirmar'}`
      : "";

    const ticketResult = await createGlpiTicketInternal({
      name: `Escalamiento: ${reason.substring(0, 50)}...`,
      content: `
ASUNTO: Escalamiento solicitado desde el Asistente AI.
CLIENTE: ${clientName}
ID/RIF: ${identification}${visitInfo}
RAZÓN: ${reason}
SESSION_ID: ${sessionId}
      `.trim(),
      urgency: 5, // Alta urgencia para escalamientos
    });

    if (ticketResult.success) {
      // 3. Cambiar estado y guardar ticket ID en la base de datos
      await Promise.all([
        updateConversationStatus(sessionId, "waiting_specialist"),
        syncConversationMetadata(sessionId, { glpiTicketId: ticketResult.ticketId })
      ]).catch(err => {
        console.error("[TOOLS_ERROR] Falló actualización de metadata al escalar:", err);
      });

      return {
        success: true,
        message: `¡Listo! He registrado tu solicitud exitosamente. Tu número de ticket en GLPI es el **#${ticketResult.ticketId}**. 📝

A partir de este momento, un especialista humano revisará tu caso y se pondrá en contacto contigo a la brevedad posible. Esta conversación ha sido transferida al área técnica. ¡Que tengas un excelente día! 🤖👋`,
        data: { 
          glpiTicketId: ticketResult.ticketId,
          ticketId: ticketResult.ticketId,
          status: "waiting_specialist"
        },
      };
    } else {
      throw new Error(ticketResult.error || ticketResult.message);
    }
  } catch (error) {
    return {
      success: false,
      message: `Tuve un problema al intentar escalar tu caso: ${error instanceof Error ? error.message : "Error desconocido"}.`,
    };
  }
}

export async function executeCloseConversation(args: z.infer<typeof closeConversationSchema>): Promise<ToolResponse> {
  try {
    const { sessionId, resolution } = args;
    
    await updateConversationStatus(sessionId, "closed");
    
    return {
      success: true,
      message: "La conversación ha sido cerrada exitosamente. ¡Gracias por contactarnos!",
      data: { status: "closed", resolution },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al cerrar la conversación: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}

export async function executeAuditService(args: z.infer<typeof auditServiceSchema>): Promise<ToolResponse> {
  try {
    const { contractId } = args;
    const response = await fetch("https://n8n.sisprottaurus.com/webhook/bfd2bf8bd443", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contractId }),
    });

    if (!response.ok) {
      throw new Error(`Error en el webhook de auditoría: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: "Auditoría interna ejecutada exitosamente.",
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      message: `No se pudo completar la auditoría interna: ${error instanceof Error ? error.message : "Error desconocido"}.`,
    };
  }
}


export async function executeQueryClient(args: z.infer<typeof queryClientSchema>): Promise<ToolResponse> {
  try {
    const { identification } = args;
    const { contracts } = await fetchClientContracts(identification);
    
    if (contracts.length === 0) {
      return { success: false, message: `No se encontraron contratos para la identificación: ${identification}` };
    }

    return {
      success: true,
      message: `He encontrado ${contracts.length} contrato(s) para el cliente ${contracts[0].clientName}.`,
      data: { contracts }
    };
  } catch (error) {
    return { success: false, message: `Error al consultar cliente: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
}

export async function executeQueryInvoices(args: z.infer<typeof queryInvoicesSchema>): Promise<ToolResponse> {
  try {
    const { contractId } = args;
    const result = await fetchClientInvoices(contractId);
    
    if (!result.success) throw new Error(result.message);

    return {
      success: true,
      message: `Se han recuperado las facturas para el contrato #${contractId}.`,
      data: { invoices: result.invoices }
    };
  } catch (error) {
    return { success: false, message: `Error al consultar facturas: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
}

export async function executeRebootOnu(args: z.infer<typeof rebootOnuSchema>): Promise<ToolResponse> {
  try {
    const { serialNumber } = args;
    const result = await rebootOnu(serialNumber);
    return {
      success: result.success,
      message: result.message
    };
  } catch (error) {
    return { success: false, message: `Error al intentar reiniciar la ONU: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
}

export async function executeSearchKnowledge(args: z.infer<typeof searchKnowledgeSchema>): Promise<ToolResponse> {
  try {
    const { query } = args;
    // Búsqueda vía webhook de n8n o similar
    const response = await fetch("https://n8n.sisprottaurus.com/webhook/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) throw new Error("Base de conocimientos no disponible.");
    const data = await response.json();
    
    return {
      success: true,
      message: "Resultados encontrados en la base de conocimientos.",
      data: { results: data.results || data }
    };
  } catch {
    return {
      success: false,
      message: "Por el momento no pude encontrar información específica sobre ese tema. ¿Puedo ayudarte con otra cosa?"
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
      execute: async (args: Record<string, unknown>) => {
        const res = await executeCreateGlpiTicket(args as z.infer<typeof createGlpiTicketSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    escalate_to_specialist: {
      name: "escalate_to_specialist",
      description: "Escala la conversación a un especialista humano.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["sessionId", "reason"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeEscalateToSpecialist(args as z.infer<typeof escalateToSpecialistSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    close_conversation: {
      name: "close_conversation",
      description: "Cierra la conversación.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          resolution: { type: "string" },
        },
        required: ["sessionId", "resolution"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeCloseConversation(args as z.infer<typeof closeConversationSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    audit_service: {
      name: "audit_service",
      description: "Ejecuta una auditoría interna del servicio.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
        },
        required: ["contractId"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeAuditService(args as z.infer<typeof auditServiceSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    reboot_onu: {
      name: "reboot_onu",
      description: "Reinicia la ONU remotamente.",
      inputSchema: {
        type: "object",
        properties: {
          serialNumber: { type: "string" },
        },
        required: ["serialNumber"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeRebootOnu(args as z.infer<typeof rebootOnuSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    queryClient: {
      name: "queryClient",
      description: "Consulta información del cliente por ID.",
      inputSchema: {
        type: "object",
        properties: {
          identification: { type: "string" },
        },
        required: ["identification"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeQueryClient(args as z.infer<typeof queryClientSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    queryInvoices: {
      name: "queryInvoices",
      description: "Consulta facturas de un contrato.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
        },
        required: ["contractId"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeQueryInvoices(args as z.infer<typeof queryInvoicesSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    searchKnowledge: {
      name: "searchKnowledge",
      description: "Busca en la base de conocimientos.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeSearchKnowledge(args as z.infer<typeof searchKnowledgeSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    }
  };
};

export function getPlaceholderResponse(toolName: string): ToolResponse {
  return {
    success: false,
    message: `La herramienta "${toolName}" estará disponible próximamente cuando se complete la integración con los servidores internos.`,
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
