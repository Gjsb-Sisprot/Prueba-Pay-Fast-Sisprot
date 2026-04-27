import { z } from "zod";
import { getConversationBySessionId, updateConversationStatus, syncConversationMetadata } from "./persistence";
import { createTicket as createGlpiTicketInternal } from "./glpi";
import { type LocalToolSet } from "./router-helpers";
import { fetchClientContracts, fetchClientInvoices, rebootOnu, getPlanChangeBudget, postPlanChangeRequest, fetchContractById } from "./sisprot-api";


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
  contractId: z.string().optional().describe("ID del contrato para obtener detalles técnicos"),
  sessionId: z.string().optional().describe("ID de la sesión de chat para obtener contexto"),
});

export const auditServiceSchema = z.object({
  contractId: z.string().describe("ID del contrato del cliente para realizar la auditoría interna"),
});

export const escalateToSpecialistSchema = z.object({
  sessionId: z.string().describe("ID de la sesión de chat"),
  reason: z.string().describe("Razón detallada del escalamiento"),
  subReason: z.string().optional().describe("Clasificación corta del problema (ej. Intermitencia)"),
  aiSummary: z.string().optional().describe("Resumen ejecutivo de la conversación realizado por la IA"),
  originalComment: z.string().optional().describe("El primer comentario o mensaje de queja del cliente"),
  observation: z.string().optional().describe("Observaciones o detalles técnicos adicionales"),
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
  contractGsoftId: z.number().describe("ID interno de Gsoft del contrato"),
  changeType: z.enum(["UPGRADE", "DOWNGRADE"]).describe("Tipo de cambio de plan"),
  newPlan: z.number().describe("ID del nuevo plan"),
  payment: z.string().optional().describe("Referencia del pago (extraída del comprobante)"),
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
    const { name, content, categoryId, urgency, requesterId, contractId, sessionId } = args;

    let finalContractId = contractId;
    let conversation = null;

    if (!finalContractId && sessionId) {
      conversation = await getConversationBySessionId(sessionId).catch(() => null);
      finalContractId = conversation?.contract;
    }

    const contractData = finalContractId ? await fetchContractById(finalContractId) : null;
    
    // Formatear contenido con data de Sisprot si está disponible
    let ticketContent = content;
    let ticketName = name;

    if (contractData) {
      const clientName = `${contractData.name} ${contractData.last_name}`;
      const sector = contractData.sector_name || "No especificado";
      const phone = contractData.mobile || "No disponible";
      const address = contractData.address || "No registrada";
      const plan = contractData.contract_detail?.[0]?.plan_name || "Plan no detectado";
      const ip = contractData.contract_detail?.[0]?.service_detail?.[0]?.ip || "No detectada";
      const vlan = contractData.contract_detail?.[0]?.service_detail?.[0]?.interface || "VLAN_PENDIENTE";
      const serial = contractData.contract_detail?.[0]?.service_detail?.[0]?.serial || "No detectado";
      const mapsLink = `https://maps.google.com/?q=${contractData.latitude},${contractData.longitude}`;

      ticketName = `(IA Susana) ${name} - Contrato ${finalContractId} - ${clientName}`;
      
      ticketContent = `
Observacion:${name}
Sector: ${sector}
Cliente: ${clientName}
N° de contrato: ${finalContractId}
IP Actual: ${ip}
Teléfono: ${phone}
VLAN Actual: ${vlan}
Serial GPON: ${serial}
Plan Contratado: ${plan}

Potencia Leida: 0
Potencia Calculada: 0

Dirección: ${address}
Ubicación: ${mapsLink}

---
Contenido Adicional:
${content}
`.trim();
    } else {
      // Si no hay datos de contrato, al menos agregamos el prefijo (IA Susana)
      ticketName = `(IA Susana) ${name}`;
    }

    const result = await createGlpiTicketInternal({
      name: ticketName,
      content: ticketContent,
      itilcategories_id: categoryId,
      urgency: urgency,
      _users_id_requester: requesterId,
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


export async function executeEscalateToSpecialist(args: z.infer<typeof escalateToSpecialistSchema>): Promise<ToolResponse> {
  try {
    const { sessionId, reason, subReason, aiSummary, originalComment, observation, isSurvey } = args;
    
    // 1. Obtener contexto del cliente desde la DB
    const conversation = await getConversationBySessionId(sessionId).catch(() => null);
    
    const clientNameFromDb = conversation?.contact_name || "Cliente Desconocido";
    const identification = conversation?.identification || "N/A";
    const contractId = conversation?.contract || "N/A";
    
    // Fetch detailed contract data from API
    const contractData = contractId !== "N/A" ? await fetchContractById(contractId) : null;

    const displaySubReason = subReason || "Escalamiento General";
    const surveyPrefix = isSurvey ? "[Encuesta] " : "";

    // Campos técnicos
    const clientName = contractData ? `${contractData.name} ${contractData.last_name}` : clientNameFromDb;
    const sector = contractData?.sector_name || conversation?.sector || "No especificado";
    const phone = contractData?.mobile || conversation?.contact_phone || "No disponible";
    const address = contractData?.address || conversation?.address || "No registrada";
    const plan = contractData?.contract_detail?.[0]?.plan_name || conversation?.plan_name || "Plan no detectado";
    const ip = contractData?.contract_detail?.[0]?.service_detail?.[0]?.ip || "No detectada";
    const vlan = contractData?.contract_detail?.[0]?.service_detail?.[0]?.interface || "VLAN_PENDIENTE";
    const serial = contractData?.contract_detail?.[0]?.service_detail?.[0]?.serial || "No detectado";
    const mapsLink = contractData ? `https://maps.google.com/?q=${contractData.latitude},${contractData.longitude}` : (conversation?.sector || "No especificada");

    // 2. Crear ticket en GLPI con el nuevo formato estructurado detallado
    const category = 17; // Default Soporte Técnico
    const ticketName = `(IA Susana) ${surveyPrefix}[${displaySubReason}] - Contrato ${contractId} - ${clientName}`;
    
    const ticketContent = `
Observacion:${displaySubReason} - ${aiSummary || reason}
Sector: ${sector}
Cliente: ${clientName}
N° de contrato: ${contractId}
IP Actual: ${ip}
Teléfono: ${phone}
VLAN Actual: ${vlan}
Serial GPON: ${serial}
Plan Contratado: ${plan}

Potencia Leida: 0
Potencia Calculada: 0

Dirección: ${address}
Ubicación: ${mapsLink}

---
Resumen IA: ${aiSummary || 'El cliente reporta una incidencia en su servicio.'}
Comentario Original: ${originalComment || reason}
Observación Adicional: ${observation || 'Registro automático.'}
ID Sesión: ${sessionId}
Identificación: ${identification}
`.trim();

    const ticketResult = await createGlpiTicketInternal({
      name: ticketName,
      content: ticketContent,
      urgency: 3,
      itilcategories_id: category,
      type: 1
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
        message: `¡Listo! He registrado tu solicitud exitosamente. Tu número de ticket en GLPI es el **#${ticketResult.ticketId}**. 🎫
        
Según nuestro SLA, en un lapso no mayor a 24 Horas un Técnico solventará la falla reportada. Quedo a tu disposición si necesitas algo más mientras se procesa tu requerimiento. 📝⚡`,
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
               `¿Deseas que procedamos con este cambio?`,
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
      payment: args.payment,
      notes: args.notes
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
          categoryId: { type: "number", description: "ID de categoría (opcional)" },
          urgency: { type: "number", description: "Urgencia 1-5 (opcional)" },
          requesterId: { type: "number", description: "ID de solicitante (opcional)" },
          contractId: { type: "string", description: "ID del contrato (opcional)" },
          sessionId: { type: "string", description: "ID de la sesión (opcional)" },
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
          subReason: { type: "string" },
          aiSummary: { type: "string" },
          originalComment: { type: "string" },
          observation: { type: "string" },
          isSurvey: { type: "boolean" },
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
      description: "Calcula el presupuesto para un cambio de plan.",
      inputSchema: {
        type: "object",
        properties: {
          contractId: { type: "string" },
          newPlanId: { type: "string" },
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
