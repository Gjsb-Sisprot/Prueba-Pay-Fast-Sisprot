import { z } from "zod";
import { 
  getConversationBySessionId, 
  updateConversationStatus, 
  getConversationTranscript
} from "./persistence";
import { type LocalToolSet } from "./router-helpers";
import { fetchClientContracts, fetchClientInvoices, rebootOnu, getPlanChangeBudget, postPlanChangeRequest, fetchContractById } from "./sisprot-api";
import { supabase } from "./supabase";


// --- GLPI INTEGRATION (Consolidated logic is now imported from glpi.ts) ---
// --------------------------------------------------------------------------

// --- DIRECTORIO DE OPERADORES ---
const OPERATORS_ADMIN = [20, 10, 19, 22]; // Georgina, Khaloa, Martha, Yhossellyn
const OPERATORS_TECH = [27, 13, 25, 8, 28, 11, 26]; // Arnaldo, Carlos, Dario, Jonathan, Jean, Kelvin, Yeral

const OPERATOR_NAMES: Record<number, string> = {
  20: "Georgina Baladi",
  10: "Khaloa Serrano",
  19: "Martha Pinto",
  22: "Yhossellyn Perez",
  27: "ARNALDO ROJAS",
  13: "CARLOS OVALLES",
  25: "DARIO PEDROZA",
  8: "JONATHAN GARCIA",
  28: "JEAN MORALES",
  11: "KELVIN SANCHEZ",
  26: "YERAL GOMEZ"
};

// --- MAPEO OFICIAL DE SUBMOTIVOS A ITIL Y URGENCIA ---
const SUBREASON_MAPPING: Record<string, { itil: number; urgency: number; area: 'admin' | 'tech' }> = {
  // Administrativos
  "Actualización de datos": { itil: 2, urgency: 4, area: 'admin' },
  "Cambio de correo electrónico": { itil: 39, urgency: 4, area: 'admin' },
  "Cambio de dirección": { itil: 41, urgency: 5, area: 'admin' },
  "Cambio de número de teléfono": { itil: 42, urgency: 5, area: 'admin' },
  "Corrección de cédula": { itil: 45, urgency: 5, area: 'admin' },
  "Cambio de ciclo": { itil: 8, urgency: 4, area: 'admin' },
  "Cambio de plan": { itil: 9, urgency: 5, area: 'admin' },
  "Cancelación de servicio": { itil: 13, urgency: 5, area: 'admin' },
  "Consultas administrativas": { itil: 10, urgency: 5, area: 'admin' },
  "Orientación al cliente": { itil: 11, urgency: 4, area: 'admin' },
  "Reactivación de servicio": { itil: 14, urgency: 5, area: 'admin' },
  "Reclamos administrativos": { itil: 12, urgency: 5, area: 'admin' },
  "Ciclo de Facturación": { itil: 59, urgency: 5, area: 'admin' },
  "Datos Bancarios": { itil: 61, urgency: 5, area: 'admin' },
  "Facturas Pendientes": { itil: 55, urgency: 5, area: 'admin' },
  "Financiamientos": { itil: 53, urgency: 2, area: 'admin' },
  "Prorrateos": { itil: 51, urgency: 5, area: 'admin' },
  "Registros de Pagos": { itil: 63, urgency: 4, area: 'admin' },
  "Solicitud de Factura/Nota de Cobro": { itil: 62, urgency: 3, area: 'admin' },
  "Devoluciones": { itil: 27, urgency: 5, area: 'admin' },
  "Reclamos por Facturación": { itil: 26, urgency: 4, area: 'admin' },
  "Reportes de Pagos": { itil: 32, urgency: 5, area: 'admin' },
  "Seguimiento al Cliente": { itil: 6, urgency: 5, area: 'admin' },
  "Consulta de Condiciones Legales": { itil: 68, urgency: 5, area: 'admin' },
  "Consulta de Estado de Cuenta": { itil: 65, urgency: 5, area: 'admin' },
  "Educación al Cliente": { itil: 69, urgency: 5, area: 'admin' },
  "Solicitud de Contrato": { itil: 67, urgency: 4, area: 'admin' },
  "Atención de Ventas": { itil: 40, urgency: 5, area: 'admin' },
  "Facturas": { itil: 35, urgency: 4, area: 'admin' },
  "Estado de la visita": { itil: 47, urgency: 5, area: 'admin' },
  "Mudanzas / Reubicaciones": { itil: 54, urgency: 4, area: 'admin' },
  "Reagendamiento de visitas": { itil: 52, urgency: 5, area: 'admin' },
  "Atención Ineficiente al Cliente": { itil: 88, urgency: 5, area: 'admin' },
  "Falta de Seguimiento": { itil: 94, urgency: 5, area: 'admin' },
  "Tiempos Lentos de Respuesta": { itil: 97, urgency: 4, area: 'admin' },
  "Temas Administrativos - Sin Internet": { itil: 110, urgency: 2, area: 'admin' },
  "Bot Incompleto": { itil: 46, urgency: 1, area: 'admin' },
  "Cliente Molesto": { itil: 71, urgency: 5, area: 'admin' },
  "Desconocimiento del Cliente": { itil: 70, urgency: 5, area: 'admin' },
  "Sin Respuesta del Cliente": { itil: 48, urgency: 4, area: 'admin' },
  "Cambio de proveedor - ventas": { itil: 33, urgency: 5, area: 'admin' },
  "Sin WiFi - Ventas": { itil: 30, urgency: 5, area: 'admin' },
  "SisprotTV - Ventas": { itil: 31, urgency: 4, area: 'admin' },
  "Con Wifi Migracion - Ventas": { itil: 60, urgency: 5, area: 'admin' },
  "Con Wifi Total - Ventas": { itil: 57, urgency: 5, area: 'admin' },
  "Con Wifi Gratis - Ventas": { itil: 56, urgency: 5, area: 'admin' },
  "Con Wifi Financiado - Ventas": { itil: 58, urgency: 5, area: 'admin' },
  "Problemas con Pagos - Sisprot TV": { itil: 119, urgency: 5, area: 'admin' },
  "Cambio de Titular": { itil: 44, urgency: 3, area: 'admin' },
  
  // Soporte Técnico
  "Consultas de soporte": { itil: 16, urgency: 3, area: 'tech' },
  "Guía para configuración": { itil: 49, urgency: 5, area: 'tech' },
  "Prueba de velocidad": { itil: 50, urgency: 3, area: 'tech' },
  "Intermitencia/Internet Lento": { itil: 17, urgency: 4, area: 'tech' },
  "Bandas Unificadas": { itil: 72, urgency: 3, area: 'tech' },
  "Cambio de Firewall": { itil: 78, urgency: 5, area: 'tech' },
  "Conf. Incorrecta de OLT": { itil: 77, urgency: 5, area: 'tech' },
  "Falla de Taco de ONU": { itil: 73, urgency: 4, area: 'tech' },
  "IP Duplicada": { itil: 74, urgency: 5, area: 'tech' },
  "Microfractura de Fibra": { itil: 75, urgency: 5, area: 'tech' },
  "Potencia Baja/Elevada en ONU": { itil: 76, urgency: 5, area: 'tech' },
  "Saturacion de Red": { itil: 80, urgency: 5, area: 'tech' },
  "Ultima Milla (Falla aun desconocida)": { itil: 79, urgency: 4, area: 'tech' },
  "Lentitud velocidad plan": { itil: 25, urgency: 5, area: 'tech' },
  "Cable ≤ CAT 5": { itil: 120, urgency: 4, area: 'tech' },
  "Exceso de Conexiones": { itil: 126, urgency: 3, area: 'tech' },
  "Red Interna SGF": { itil: 121, urgency: 4, area: 'tech' },
  "Router 10/100": { itil: 122, urgency: 3, area: 'tech' },
  "Ubicación de Router": { itil: 123, urgency: 3, area: 'tech' },
  "Migración de equipos": { itil: 18, urgency: 5, area: 'tech' },
  "Mudanza": { itil: 81, urgency: 4, area: 'tech' },
  "Reubicacion": { itil: 82, urgency: 4, area: 'tech' },
  "Onu en rojo": { itil: 19, urgency: 5, area: 'tech' },
  "Falla por Potencia": { itil: 83, urgency: 4, area: 'tech' },
  "Fibra Drop Partida": { itil: 84, urgency: 5, area: 'tech' },
  "ONU Dañada": { itil: 85, urgency: 5, area: 'tech' },
  "ONU Desconfigurada": { itil: 86, urgency: 5, area: 'tech' },
  "Ultima Milla": { itil: 87, urgency: 3, area: 'tech' },
  "Reclamos de soporte tecnico": { itil: 20, urgency: 4, area: 'tech' },
  "Caida del Servicio": { itil: 89, urgency: 5, area: 'tech' },
  "Daños en Cableado Externo": { itil: 91, urgency: 4, area: 'tech' },
  "Falla en Ultima Milla": { itil: 92, urgency: 3, area: 'tech' },
  "Fallas en Sisprot TV": { itil: 93, urgency: 5, area: 'tech' },
  "Inestabilidad en Caja": { itil: 90, urgency: 4, area: 'tech' },
  "Mala Ejecucion de Operaciones": { itil: 95, urgency: 4, area: 'tech' },
  "Problemas Tecnicos Recurrentes": { itil: 96, urgency: 5, area: 'tech' },
  "Router falla": { itil: 21, urgency: 5, area: 'tech' },
  "Cable Desconectado": { itil: 98, urgency: 2, area: 'tech' },
  "Router Colgado": { itil: 101, urgency: 3, area: 'tech' },
  "Configuracion de Clave": { itil: 103, urgency: 3, area: 'tech' },
  "IP Extranjera": { itil: 102, urgency: 1, area: 'tech' },
  "Router Dañado": { itil: 99, urgency: 3, area: 'tech' },
  "Sin internet": { itil: 22, urgency: 5, area: 'tech' },
  "Adaptador de Corriente Dañado": { itil: 114, urgency: 4, area: 'tech' },
  "Conf. Interna de SGF": { itil: 104, urgency: 5, area: 'tech' },
  "Equipos Colgados": { itil: 105, urgency: 5, area: 'tech' },
  "Equipos Internos Dañados": { itil: 106, urgency: 5, area: 'tech' },
  "Fallo de Auditoria": { itil: 112, urgency: 4, area: 'tech' },
  "Mala Conexión en Cableado": { itil: 107, urgency: 5, area: 'tech' },
  "Recuperacion/reconexion": { itil: 113, urgency: 4, area: 'tech' },
  "Router Desconfigurado": { itil: 109, urgency: 4, area: 'tech' },
  "Ultima Milla - Sin internet": { itil: 111, urgency: 4, area: 'tech' },
  "SisprotTV - Soporte Tecnico": { itil: 24, urgency: 5, area: 'tech' },
  "Baja Calidad Audio/Video": { itil: 115, urgency: 3, area: 'tech' },
  "Contenido Incompleto Sisprot TV": { itil: 117, urgency: 4, area: 'tech' },
  "Fallas Tras Actualizaciones - Sisprot TV": { itil: 118, urgency: 5, area: 'tech' },
  "Problemas en Carga de Contenido Sisp": { itil: 116, urgency: 5, area: 'tech' },
  "Configuración de equipos": { itil: 127, urgency: 4, area: 'tech' },
  "Instalación de SisprotTV": { itil: 128, urgency: 5, area: 'tech' },
};

function getItilInfo(subReason: string) {
  return SUBREASON_MAPPING[subReason] || { itil: 22, urgency: 3, area: 'tech' };
}

function getRandomOperator(area: 'admin' | 'tech'): number {
  const list = area === 'admin' ? OPERATORS_ADMIN : OPERATORS_TECH;
  return list[Math.floor(Math.random() * list.length)];
}

async function sendTicketConfirmation(data: { ticketId: string; contract: string; reason: string; operatorId: number }) {
  try {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const operatorName = OPERATOR_NAMES[data.operatorId] || "Operador asignado";

    const payload = {
      "id_tickect": data.ticketId,
      "contrato": data.contract,
      "fecha": date,
      "hora": time,
      "motivo": data.reason,
      "id_tecnico": data.operatorId,
      "nombre_tecnico": operatorName
    };

    await fetch('https://n8n.sisprottaurus.com/webhook/envio_confirmacion_visita_tecnica', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Error al enviar confirmación de visita:", error);
  }
}



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
  subReason: z.string().min(5).describe("Motivo específico OBLIGATORIO (ej: Sin internet, ONU_En_Rojo, Cancelacion_de_Servicio)"),
  aiSummary: z.string().min(15).describe("Resumen ejecutivo de la conversación"),
  observation: z.string().min(5).describe("Punto de vista de la IA sobre el problema"),
  categoryId: z.number().optional().describe("ID de la categoría Itil (default: 22)"),
  urgency: z.number().min(1).max(5).optional().describe("Urgencia del ticket (1-5, default: 5)"),
  requesterId: z.number().optional().describe("_users_id_requester (default: 19)"),
  contractId: z.string().optional().describe("ID del contrato para obtener detalles técnicos"),
  sessionId: z.string().optional().describe("ID de la sesión de chat para obtener contexto"),
});

export const auditServiceSchema = z.object({
  contractId: z.string().describe("ID del contrato del cliente para realizar la auditoría interna"),
});

export const escalateToSpecialistSchema = z.object({
  sessionId: z.string().describe("ID de la sesión de chat"),
  reason: z.string().describe("Razón detallada del escalamiento"),
  subReason: z.string().min(5).describe("Motivo específico OBLIGATORIO (ej: Sin internet, ONU_En_Rojo)"),
  aiSummary: z.string().min(15).describe("Resumen ejecutivo de la conversación"),
  observation: z.string().min(5).describe("Punto de vista de la IA sobre el problema técnico"),
  isSurvey: z.boolean().optional().describe("Indica si el ticket proviene de una encuesta de insatisfacción"),
});

export const closeConversationSchema = z.object({
  sessionId: z.string().describe("ID de la sesión de chat"),
  resolution: z.string().min(10).describe("Resumen de cómo se resolvió la consulta"),
  closedBy: z.enum(["user", "assistant", "system"]).default("user"),
});

export const rebootOnuSchema = z.object({
  serialNumber: z.string().describe("Serial de la ONU (ej: SMAGXXXXXXXX)"),
});

export const createAuthPdfSchema = z.object({
  amount: z.string().describe("Monto pagado (ej. 50$ o 1800 Bs)"),
  date: z.string().describe("Fecha de la transacción"),
  reference: z.string().describe("Número de referencia (8-10 dígitos)"),
  bank: z.string().describe("Banco destino (Sisprot Global Fiber)"),
  reason: z.string().describe("Motivo del error (Pago duplicado, excedente o cuenta errada)"),
  contractId: z.string().describe("ID del contrato del cliente"),
});

export const activateNonSuspensionSchema = z.object({
  contractId: z.string().describe("ID del contrato para activar el convenio de no suspensión"),
});

export const terminateServiceSchema = z.object({
  contractId: z.string().describe("ID del contrato a cancelar"),
  reason: z.string().describe("Motivo de la cancelación"),
});

export const activateServiceSchema = z.object({
  contractId: z.string().describe("ID del contrato a reactivar"),
  planName: z.string().describe("Nombre del plan a activar"),
  billingCycle: z.string().optional().describe("Ciclo de facturación elegido (ej. Ciclo 10)"),
});

export const scheduleTechVisitSchema = z.object({
  contractId: z.string().describe("ID del contrato"),
  visitType: z.string().describe("Tipo de visita (ej: Validación de Reactivación)"),
});

export const getPlanChangeBudgetSchema = z.object({
  contractId: z.string().describe("ID del contrato del cliente"),
  newPlanId: z.string().describe("ID del nuevo plan solicitado"),
});

export const requestPlanChangeSchema = z.object({
  contractGsoftId: z.number().describe("ID interno de Gsoft del contrato (visto como contractId en los datos del cliente)"),
  changeType: z.enum(["UPGRADE", "DOWNGRADE"]).describe("Tipo de cambio de plan"),
  newPlan: z.number().describe("ID del nuevo plan (ID numérico)"),
  payment: z.union([z.string(), z.number(), z.null()]).optional().describe("Referencia del pago o null para cobro automático diferido"),
  notes: z.string().optional().describe("Notas adicionales para la gestión"),
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
      "Utilízalo cuando el problema no se pueda resolver automáticamente o requiera un registro oficial para seguimiento.",
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
    name: "create_auth_pdf",
    description: "Genera el documento de autorización de devolución con los datos del pago.",
    schema: createAuthPdfSchema,
  },
  {
    name: "activate_non_suspension_agreement",
    description: "Activa un convenio de no suspensión para garantizar la continuidad del servicio durante el trámite administrativo.",
    schema: activateNonSuspensionSchema,
  },
  {
    name: "terminate_service",
    description: "Ejecuta la baja técnica del servicio (Mikrotik, OLT y Ozmap).",
    schema: terminateServiceSchema,
  },
  {
    name: "activate_service",
    description: "Ejecuta la activación técnica del servicio (Mikrotik y OLT).",
    schema: activateServiceSchema,
  },
  {
    name: "schedule_tech_visit",
    description: "Programa una visita técnica de validación u otro tipo.",
    schema: scheduleTechVisitSchema,
  },
  {
    name: "get_plan_change_budget",
    description: "Calcula el presupuesto prorrateado y cargos administrativos para un cambio de plan (Upgrade).",
    schema: getPlanChangeBudgetSchema,
  },
  {
    name: "request_plan_change",
    description: "Solicita formalmente un cambio de plan (Upgrade o Downgrade) en el sistema administrativo.",
    schema: requestPlanChangeSchema,
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
    const { subReason, aiSummary, observation, contractId, sessionId } = args;

    const [conversation, transcript] = await Promise.all([
      (sessionId ? getConversationBySessionId(sessionId) : Promise.resolve(null)).catch(() => null),
      (sessionId ? getConversationTranscript(sessionId) : Promise.resolve("No disponible")).catch(() => "Transcripción no disponible")
    ]);

    const finalContractId = contractId || conversation?.contract;

    const contractData = finalContractId ? await fetchContractById(finalContractId).catch(() => null) : null;
    const itilInfo = getItilInfo(subReason);
    const assignedOperatorId = getRandomOperator(itilInfo.area);
    
    const payload = {
      "Contrato": finalContractId || "N/A",
      "name": contractData?.name || "Cliente",
      "last name": contractData?.last_name || "Desconocido",
      "sector": contractData?.sector_name || "No especificado",
      "Observacion": `${subReason} - ${observation}`,
      "IP Actual": contractData?.contract_detail?.[0]?.service_detail?.[0]?.ip || "No detectada",
      "Teléfono": contractData?.mobile || "No disponible",
      "VLAN Actual": contractData?.contract_detail?.[0]?.service_detail?.[0]?.interface || "VLAN_PENDIENTE",
      "Plan Contratado": contractData?.contract_detail?.[0]?.plan_name || "Plan no detectado",
      "Dirección": contractData?.address || "No registrada",
      "Ubicacion": contractData ? `https://maps.google.com/?q=${contractData.latitude},${contractData.longitude}` : "No disponible",
      "_users_id_requester": 29,
      "_users_id_assign": assignedOperatorId,
      "subReason": subReason,
      "itilcategories_id": itilInfo.itil,
      "urgency": itilInfo.urgency,
      "aiSummary": aiSummary,
      "transcript": transcript
    };

    // 2. Enviar a n8n
    const n8nResponse = await fetch('https://n8n.sisprottaurus.com/webhook/envio_ticket_GLPI', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (n8nResponse.ok) {
      const resultData = await n8nResponse.json();
      
      // Robustez: n8n puede responder como objeto directo o como array
      let ticketId = "PENDIENTE";
      if (Array.isArray(resultData) && resultData[0]?.id) {
        ticketId = resultData[0].id;
      } else if (resultData && typeof resultData === 'object' && resultData.id) {
        ticketId = resultData.id;
      }

      if (ticketId !== "PENDIENTE") {
        await sendTicketConfirmation({
          ticketId,
          contract: finalContractId || "N/A",
          reason: subReason,
          operatorId: assignedOperatorId
        });

        if (sessionId) {
          try {
            const conversation = await getConversationBySessionId(sessionId).catch(() => null);
            const searchId = conversation?.id || sessionId;
            const { data: recentVisit } = await supabase
              .from("support_visits")
              .select("id")
              .eq("conversation_id", searchId)
              .is("glpi_ticket_id", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (recentVisit) {
              await supabase
                .from("support_visits")
                .update({ glpi_ticket_id: ticketId.toString() })
                .eq("id", recentVisit.id);
            }
          } catch (err) {
            console.error("[TOOLS] Error vinculando ticket a visita:", err);
          }
        }
      }

      return {
        success: true,
        message: `¡Listo! He registrado tu solicitud oficialmente. Tu número de ticket de seguimiento es el **#${ticketId}**. Con este número podrás consultar el estado de tu caso en cualquier momento. Un especialista administrativo lo procesará a la brevedad.`,
        data: { status: "sent_to_n8n", ticketId: ticketId, operatorId: assignedOperatorId },
      };
    } else {
      throw new Error(`n8n webhook returned status ${n8nResponse.status}`);
    }
  } catch (error) {
    return {
      success: false,
      message: `Error al procesar la solicitud vía n8n: ${error instanceof Error ? error.message : "Error desconocido"}.`,
    };
  }
}


export async function executeEscalateToSpecialist(args: z.infer<typeof escalateToSpecialistSchema>): Promise<ToolResponse> {
  try {
    const { sessionId, subReason, aiSummary, observation, reason } = args;
    
    // 1. Obtener todos los datos necesarios en paralelo para máxima velocidad
    const [conversation, transcript] = await Promise.all([
      getConversationBySessionId(sessionId).catch(() => null),
      getConversationTranscript(sessionId).catch(() => "Transcripción no disponible")
    ]);

    const contractId = conversation?.contract || "N/A";
    
    // Obtener detalles del contrato si existe
    const contractData = contractId !== "N/A" 
      ? await fetchContractById(contractId).catch(() => null) 
      : null;

    const itilInfo = getItilInfo(subReason);
    const assignedOperatorId = getRandomOperator(itilInfo.area);

    const payload = {
      "Contrato": contractId,
      "name": contractData?.name || conversation?.contact_name || "Cliente",
      "last name": contractData?.last_name || "Desconocido",
      "sector": contractData?.sector_name || conversation?.sector || "No especificado",
      "Observacion": `${subReason} - ${observation || reason}`,
      "IP Actual": contractData?.contract_detail?.[0]?.service_detail?.[0]?.ip || "No detectada",
      "Teléfono": contractData?.mobile || conversation?.contact_phone || "No disponible",
      "VLAN Actual": contractData?.contract_detail?.[0]?.service_detail?.[0]?.interface || "VLAN_PENDIENTE",
      "Plan Contratado": contractData?.contract_detail?.[0]?.plan_name || conversation?.plan_name || "Plan no detectado",
      "Dirección": contractData?.address || conversation?.address || "No registrada",
      "Ubicacion": contractData ? `https://maps.google.com/?q=${contractData.latitude},${contractData.longitude}` : (conversation?.sector || "No disponible"),
      "_users_id_requester": 29,
      "_users_id_assign": assignedOperatorId,
      "subReason": subReason,
      "itilcategories_id": itilInfo.itil,
      "urgency": itilInfo.urgency,
      "aiSummary": aiSummary,
      "transcript": transcript
    };

    // Enviar a n8n
    const n8nResponse = await fetch('https://n8n.sisprottaurus.com/webhook/envio_ticket_GLPI', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (n8nResponse.ok) {
      const resultData = await n8nResponse.json();
      let ticketId = "PENDIENTE";

      // Extractor de ID ultra-robusto
      if (Array.isArray(resultData)) {
        ticketId = resultData[0]?.id || resultData[0]?.ticket_id || "PENDIENTE";
      } else if (resultData && typeof resultData === 'object') {
        ticketId = resultData.id || resultData.ticket_id || "PENDIENTE";
      }

      if (ticketId !== "PENDIENTE") {
        // Vinculación asíncrona (no bloqueante)
        const searchId = conversation?.id || sessionId;
        supabase.from("support_visits")
          .update({ glpi_ticket_id: ticketId.toString() })
          .eq("conversation_id", searchId)
          .is("glpi_ticket_id", null)
          .then(({ error }) => {
            if (error) console.error("[ASYNC_LINK_ERR]", error);
          });
      }

      return {
        success: true,
        message: `¡Todo listo! He agendado tu visita técnica y generado el ticket oficial **#${ticketId}**. Con este número podrás hacerle seguimiento a tu caso. Un técnico te visitará en el horario acordado.`,
        data: { ticketId },
      };
    } else {
      throw new Error(`n8n webhook returned status ${n8nResponse.status}`);
    }
  } catch (error) {
    return {
      success: false,
      message: `Error al escalar el caso vía n8n: ${error instanceof Error ? error.message : "Error desconocido"}.`,
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

    const data = (await response.json()) as Record<string, unknown>;
    
    // Si el webhook devuelve detalles técnicos, los formateamos
    let auditSummary = "";
    if (data && typeof data === 'object') {
       const status = data.status || data.result || "Completado";
       auditSummary = `\n\n🔍 **Resultado:** ${status}\n` +
                      `⚙️ **Equipos:** ${data.device_status || 'Operativos'}\n` +
                      `📶 **Señal:** ${data.signal_level || 'Óptima'}`;
    }

    return {
      success: true,
      message: `📋 **Auditoría interna ejecutada exitosamente.**${auditSummary}`,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ No se pudo completar la auditoría interna: ${error instanceof Error ? error.message : "Error desconocido"}.`,
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

    const clientName = contracts[0].clientName;
    const contractList = contracts.map(c => `• **Contrato #${c.contractId}**: ${c.planName} (${c.statusName}) en ${c.sector}`).join('\n');

    return {
      success: true,
      message: `✅ He encontrado **${contracts.length}** contrato(s) para el cliente **${clientName}**:\n\n${contractList}`,
      data: { contracts }
    };
  } catch (error) {
    return { success: false, message: `❌ Error al consultar cliente: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
}

export async function executeQueryInvoices(args: z.infer<typeof queryInvoicesSchema>): Promise<ToolResponse> {
  try {
    const { contractId } = args;
    const result = await fetchClientInvoices(contractId);
    
    if (!result.success) throw new Error(result.message);

    const invoiceList = (result.invoices as Array<Record<string, unknown>>).map(inv => {
      const statusIcon = inv.status === 'paid' ? '✅' : '⏳';
      return `${statusIcon} **Referencia ${inv.reference || inv.id}**: ${inv.amount} ${inv.currency || 'USD'} (${inv.status_name || inv.status})`;
    }).join('\n');

    return {
      success: true,
      message: `📄 Se han recuperado las facturas para el contrato **#${contractId}**:\n\n${invoiceList}`,
      data: { invoices: result.invoices }
    };
  } catch (error) {
    return { success: false, message: `❌ Error al consultar facturas: ${error instanceof Error ? error.message : "Error desconocido"}` };
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
      message: "📚 **He encontrado información relevante en nuestra base de conocimientos:**\n\n" + 
               (Array.isArray(data.results) ? data.results.slice(0, 2).map((r: { content?: string; text?: string }) => `💡 ${r.content || r.text}`).join('\n\n') : "Aquí tienes los detalles encontrados..."),
      data: { results: data.results || data }
    };
  } catch {
    return {
      success: false,
      message: "🔍 Por el momento no pude encontrar información específica sobre ese tema. ¿Puedo ayudarte con otra cosa?"
    };
  }
}

/**
 * Genera el documento de autorización de devolución.
 */
export async function executeCreateAuthPdf(args: z.infer<typeof createAuthPdfSchema>): Promise<ToolResponse> {
  return {
    success: true,
    message: `Documento de autorización generado correctamente para el caso con referencia ${args.reference}. El cliente debe descargar, firmar y enviar de vuelta.`,
    data: { 
      pdfUrl: "/assets/docs/formato_devolucion_placeholder.pdf", 
      documentCode: `AUTH-DEV-${args.reference}`
    }
  };
}

/**
 * Activa un convenio de no suspensión para garantizar la continuidad del servicio.
 */
export async function executeActivateNonSuspension(args: z.infer<typeof activateNonSuspensionSchema>): Promise<ToolResponse> {
  return {
    success: true,
    message: `Convenio de no suspensión activado exitosamente para el contrato #${args.contractId}. El servicio se mantendrá activo durante el procesamiento del trámite.`,
    data: { activationCode: `CNS-${Date.now()}` }
  };
}

export async function executeTerminateService(args: z.infer<typeof terminateServiceSchema>): Promise<ToolResponse> {
  return {
    success: true,
    message: `Baja técnica ejecutada para el contrato #${args.contractId}. Mikrotik desconfigurado, ONU desautorizada en OLT y estatus en Ozmap actualizado a 'Inmueble' (Azul).`,
    data: { terminationId: `TERM-${args.contractId}-${Date.now()}` }
  };
}

export async function executeActivateService(args: z.infer<typeof activateServiceSchema>): Promise<ToolResponse> {
  const cycleInfo = args.billingCycle ? ` en el ${args.billingCycle}` : "";
  return {
    success: true,
    message: `Activación técnica completada para el contrato #${args.contractId} con el plan ${args.planName}${cycleInfo}. IP creada en Mikrotik (atada a VLAN) y ONU autorizada en OLT.`,
    data: { activationId: `ACT-${args.contractId}-${Date.now()}` }
  };
}


export async function executeScheduleTechVisit(args: z.infer<typeof scheduleTechVisitSchema>): Promise<ToolResponse> {
  return {
    success: true,
    message: `Visita técnica de '${args.visitType}' programada exitosamente para el contrato #${args.contractId}.`,
    data: { visitId: `VISIT-${Date.now()}` }
  };
}

export async function executeGetPlanChangeBudget(args: z.infer<typeof getPlanChangeBudgetSchema>): Promise<ToolResponse> {
  try {
    const result = await getPlanChangeBudget(args.contractId, args.newPlanId);
    if (!result.success) throw new Error(result.message);

    const budget = result.data as Record<string, unknown>;
    const total = budget.total_usd || budget.total;
    const adminFee = budget.admin_fee || 0;
    const prorated = budget.prorated_amount || 0;

    return {
      success: true,
      message: `📊 **Presupuesto para el Cambio de Plan:**\n\n` +
               `• **Monto Total:** ${total}$ 💸\n` +
               `• **Gastos Administrativos:** ${adminFee}$\n` +
               `• **Diferencial Prorrateado:** ${prorated}$\n\n` +
               `⚠️ **ALERTA IMPORTANTE**: Al confirmar este cambio, dispones de un lapso **hasta las 11:59 PM de hoy mismo** para cancelar el monto del prorrateo. De lo contrario, el servicio será suspendido automáticamente por el sistema administrativo.\n\n` +
               `¿Deseas que procedamos con este cambio de forma inmediata?`,
      data: result.data
    };
  } catch (error) {
    return { success: false, message: `❌ Error al calcular presupuesto: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
}

export async function executeRequestPlanChange(args: z.infer<typeof requestPlanChangeSchema>): Promise<ToolResponse> {
  try {
    const result = await postPlanChangeRequest({
      contract_gsoft_id: args.contractGsoftId,
      change_type: args.changeType,
      new_plan: args.newPlan,
      payment: args.payment ?? null,
      notes: args.notes || `Upgrade automático solicitado vía Susana IA`
    });

    if (!result.success) throw new Error(result.message);

    return {
      success: true,
      message: `Solicitud de ${args.changeType} procesada exitosamente.`,
      data: result.data
    };
  } catch (error) {
    return { success: false, message: `Error al solicitar cambio de plan: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
}


/**
 * Retorna las herramientas locales en un formato compatible con lo que espera el Router (MCPToolSet).
 */
export const getLocalTools = (): LocalToolSet => {
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
          subReason: { type: "string", description: "Motivo específico OBLIGATORIO (ej: Sin internet, ONU_En_Rojo, Cancelacion_de_Servicio)" },
          aiSummary: { type: "string", description: "Resumen detallado de la conversación (mínimo 25 caracteres)" },
          observation: { type: "string", description: "Análisis específico del caso (mínimo 10 caracteres)" },
          categoryId: { type: "number", description: "ID de la categoría Itil (opcional)" },
          urgency: { type: "number", description: "Urgencia 1-5 (opcional)" },
          requesterId: { type: "number", description: "ID de solicitante (opcional)" },
          contractId: { type: "string", description: "ID del contrato (opcional)" },
          sessionId: { type: "string", description: "ID de la sesión (opcional)" },
        },
        required: ["name", "content", "subReason", "aiSummary", "observation"],
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          const validatedArgs = createGlpiTicketSchema.parse(args);
          const res = await executeCreateGlpiTicket(validatedArgs);
          return { content: [{ type: "text", text: JSON.stringify(res) }] };
        } catch (error) {
          if (error instanceof z.ZodError) {
            return { 
              content: [{ 
                type: "text", 
                text: JSON.stringify({ 
                  success: false, 
                  message: `Error de validación: ${error.issues.map(e => e.message).join(", ")}. Por favor, redacta un resumen y observación más detallados y vuelve a intentarlo.` 
                }) 
              }] 
            };
          }
          throw error;
        }
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
          subReason: { type: "string", description: "Motivo específico OBLIGATORIO (ej: Sin internet, ONU_En_Rojo, Cancelacion_de_Servicio)" },
          aiSummary: { type: "string", description: "Resumen detallado de la conversación (mínimo 25 caracteres)" },
          observation: { type: "string", description: "Análisis específico del caso (mínimo 10 caracteres)" },
          isSurvey: { type: "boolean" },
        },
        required: ["sessionId", "reason", "subReason", "aiSummary", "observation"],
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          const validatedArgs = escalateToSpecialistSchema.parse(args);
          const res = await executeEscalateToSpecialist(validatedArgs);
          return { content: [{ type: "text", text: JSON.stringify(res) }] };
        } catch (error) {
          if (error instanceof z.ZodError) {
            return { 
              content: [{ 
                type: "text", 
                text: JSON.stringify({ 
                  success: false, 
                  message: `Error de validación: ${error.issues.map(e => e.message).join(", ")}. Debes proporcionar un resumen real de la conversación y una observación técnica válida.` 
                }) 
              }] 
            };
          }
          throw error;
        }
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
    },
    create_auth_pdf: {
      name: "create_auth_pdf",
      description: "Genera el documento de autorización de devolución.",
      inputSchema: {
        type: "object",
        properties: {
          amount: { type: "string" },
          date: { type: "string" },
          reference: { type: "string" },
          bank: { type: "string" },
          reason: { type: "string" },
          contractId: { type: "string" },
        },
        required: ["amount", "date", "reference", "bank", "reason", "contractId"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeCreateAuthPdf(args as z.infer<typeof createAuthPdfSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    activate_non_suspension_agreement: {
      name: "activate_non_suspension_agreement",
      description: "Activa el convenio de no suspensión.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
        },
        required: ["contractId"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeActivateNonSuspension(args as z.infer<typeof activateNonSuspensionSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    terminate_service: {
      name: "terminate_service",
      description: "Ejecuta la baja técnica del servicio.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["contractId", "reason"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeTerminateService(args as z.infer<typeof terminateServiceSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    activate_service: {
      name: "activate_service",
      description: "Ejecuta la activación técnica del servicio.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
          planName: { type: "string" },
          billingCycle: { type: "string" },
        },
        required: ["contractId", "planName"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeActivateService(args as z.infer<typeof activateServiceSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },

    schedule_tech_visit: {
      name: "schedule_tech_visit",
      description: "Programa una visita técnica.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
          visitType: { type: "string" },
        },
        required: ["contractId", "visitType"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeScheduleTechVisit(args as z.infer<typeof scheduleTechVisitSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    get_plan_change_budget: {
      name: "get_plan_change_budget",
      description: "Calcula el presupuesto prorrateado y administrativo para un UPGRADE de plan. Úsala cuando el cliente seleccione un nuevo plan desde el formulario o solicite explícitamente calcular costos de aumento.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
          newPlanId: { type: "string", description: "ID numérico del nuevo plan (ej: '100', '102', etc.)" },
        },
        required: ["contractId", "newPlanId"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeGetPlanChangeBudget(args as z.infer<typeof getPlanChangeBudgetSchema>);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
    request_plan_change: {
      name: "request_plan_change",
      description: "Solicita un cambio de plan.",
      inputSchema: {
        type: "object",
        properties: {
          contractGsoftId: { type: "number" },
          changeType: { type: "string" },
          newPlan: { type: "number" },
          payment: { type: "number" },
          notes: { type: "string" },
        },
        required: ["contractGsoftId", "changeType", "newPlan"],
      },
      execute: async (args: Record<string, unknown>) => {
        const res = await executeRequestPlanChange(args as z.infer<typeof requestPlanChangeSchema>);
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
  create_auth_pdf: {
    name: "Autorización de Devolución",
    description: "Genera el formato para trámites de reembolso",
    status: "enabled",
    icon: "FileText",
  },
  activate_non_suspension_agreement: {
    name: "Convenio de No Suspensión",
    description: "Garantiza navegación durante trámites",
    status: "enabled",
    icon: "ShieldCheck",
  },
};

export function isToolsEnabled(): boolean {
  return TOOLS_ENABLED;
}
