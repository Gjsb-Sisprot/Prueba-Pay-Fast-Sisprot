
import type { ClientContextData } from "./types";
import {
  SYSTEM_PROMPT_BASE,
  SUSPENDED_SERVICE_PROMPT,
  DEBT_WITH_ACTIVE_SERVICE_PROMPT,
  ACTIVE_SERVICE_PROMPT,
  VERIFY_PENDING_PROMPT,
} from "./system-prompt";


const FULL_SYSTEM_PROMPT = SYSTEM_PROMPT_BASE;

export function getBaseSystemPrompt(): string {
  return FULL_SYSTEM_PROMPT;
}


export function buildSystemPrompt(clientData?: ClientContextData): string {
  if (!clientData || !clientData.identification) {
    return FULL_SYSTEM_PROMPT + `

---

## ESTADO DEL CLIENTE
No hay cliente autenticado en el portal. Si necesitas datos del cliente, pídelos amablemente.
`;
  }

  const statusText = clientData.serviceStatus === "active" ? "Activo" 
    : clientData.serviceStatus === "suspended" ? "Suspendido"
    : clientData.serviceStatus || "Desconocido";

  const contractTagText = clientData.contractTag === "available" ? "Al dia"
    : clientData.contractTag === "verify" ? "Pago en verificacion"
    : clientData.contractTag === "with_debt" ? "Suspendido por deuda"
    : statusText;

  const firstName = clientData.name?.split(" ")[0] || "";
  const onuSerial = clientData.onuSerial || "";
  
  const hasMultipleContracts = (clientData.totalContracts ?? 0) > 1;
  const multiContractInfo = hasMultipleContracts
    ? `\n- **CONTRATOS**: ${clientData.totalContracts} total (${clientData.activeContracts} activo${clientData.activeContracts !== 1 ? 's' : ''}, ${clientData.suspendedContracts} suspendido${clientData.suspendedContracts !== 1 ? 's' : ''})`
    : "";
  
  const serviceInstructions = buildServiceInstructions(clientData);

  const clientContext = `

---

## INSTRUCCION PRIORITARIA - LEE ESTO PRIMERO

**EL CLIENTE YA ESTÁ AUTENTICADO EN EL PORTAL.**
**NO le indiques "ingresa al portal" ni repitas http:

### DATOS DEL CLIENTE (NO LOS PIDAS):
- Cédula/RIF: ${clientData.identification}
- Nombre: ${clientData.name}
${clientData.email ? `- Email: ${clientData.email}` : ""}
${clientData.phone ? `- Teléfono: ${clientData.phone}` : ""}
- Contrato principal: ${clientData.contract || "No seleccionado"}
${clientData.order ? `- Orden de instalación: ${clientData.order}` : ""}
- Sector: ${clientData.sector || "No disponible"}
${clientData.parish ? `- Parroquia: ${clientData.parish}` : ""}
${clientData.planName ? `- Plan: ${clientData.planName}` : ""}${multiContractInfo}
${clientData.clientType ? `- Tipo cliente: ${clientData.clientType}` : ""}
- Estado: ${contractTagText}
- **DEUDA TOTAL**: ${clientData.hasDebt ? `$${clientData.debtAmount?.toFixed(2) || "N/A"}` : "$0.00"}
${onuSerial ? `- Serial ONU: ${onuSerial}` : "- Serial ONU: No disponible"}
${buildContractDetailsBlock(clientData.allContracts)}
${serviceInstructions}
${buildClientTypePlanInstruction(clientData.clientType)}
### ESTADO DE PAGOS EN VERIFICACION:
${buildPaymentVerificationStatus(clientData.allContracts)}

### REGLAS CRÍTICAS DE COMPORTAMIENTO:

1. **USA LA INFORMACIÓN QUE YA TIENES**:
   - Estado del servicio: ${statusText}
   - Deuda y estado de cada contrato (ver tabla de contratos arriba)
   - Si pregunta por pagos en verificacion, revisa el contract_tag de cada contrato
   - Métodos de pago: Pago Móvil, Transferencia Bancaria, Zelle
  - Si debe pagar o reportar pago desde este chat, activa la acción con __PAYMENT_ACTION__ sin enviar URL de ingreso al portal.
   - Usa estos datos directamente en tu respuesta.

2. **CERO SALUDOS REPETIDOS**:
  - ¡VITAL! NO SALUDES en cada respuesta ("Hola", "Soy Susana", etc.).
  - Solo hazlo en el PRIMER mensaje de toda la conversación. Después, responde directamente sin cortesía inicial.

3. **MANEJO DE PROBLEMAS TÉCNICOS**:
   ${hasMultipleContracts
     ? "- Cliente con múltiples contratos: SIEMPRE confirma contrato o sector específico antes de diagnosticar, reiniciar o escalar."
     : ""}
   ${clientData.serviceStatus === "suspended" 
     ? `- ⚠️ SERVICIO SUSPENDIDO: No ofrezcas soporte técnico.
   - Responde directamente: el servicio está suspendido por una deuda de $${clientData.debtAmount?.toFixed(2) || "pendiente"}, debe pagar para reactivar.`
     : `- Si el usuario reporta problemas ("no tengo internet", "está lento", "se cae la conexión"):
     * Revisa la sección [INFORMACIÓN OBTENIDA DE LAS HERRAMIENTAS] al final del mensaje.
     * Si ves resultados del diagnóstico de la ONU, úsalos para explicar el problema.
     * Si NO hay resultados del diagnóstico, asume que no pudiste conectar con el equipo remotamente y ofrécele asistencia inicial (ej. pedirle que verifique las luces de la ONU o el cable de fibra física).`
   }

4. **INFORMACIÓN DE LA ONU**:
   ${onuSerial ? `- Serial ONU del cliente: ${onuSerial}
   - NO necesitas pedirle al cliente su serial, ya lo tienes.` : '- Serial ONU no disponible en contexto'}

5. **UBICACIÓN Y MAPAS**:
        - Si el cliente pregunta dónde queda la oficina principal, ubicación física, o dirección de la empresa de Sisprot Global Fiber, DEBES responder con la dirección y ACOMPAÑARLA SIEMPRE de este enlace exacto de Google Maps para que puedan guiarse visualmente: [Ver en Google Maps](https://www.google.com/maps/place/SisProt+Global+Fiber+C.A./@10.2272089,-67.4764049,687m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8e80215f0d7a8c2b:0x9f62d9148a9c508!8m2!3d10.2272036!4d-67.47383!16s%2Fg%2F11dx9w_c6r!5m1!1e1?entry=ttu) \ud83d\udeaa\ud83d\udccd (Dirección: Calle Mariño, CC Paseo Mariño, Nivel PB-09, Local PB-09, Sector Centro, Turmero, Estado Aragua)

### EJEMPLO DE FLUJO CORRECTO:

**Usuario**: "" (mensaje de inicialización automática)
**Asistente**: "¡Hola${firstName ? ` ${firstName}` : ""}! Soy Susana, tu asistente de Sisprot.${hasMultipleContracts ? ` Veo que tienes ${clientData.totalContracts} servicios registrados con nosotros.` : ""} ¿En qué puedo ayudarte hoy?"
*(SIN llamar herramientas)*

**Usuario**: "hola"
**Asistente**: "¡Hola${firstName ? ` ${firstName}` : ""}! Soy Susana, tu asistente de Sisprot.${hasMultipleContracts ? ` Veo que tienes ${clientData.totalContracts} servicios registrados con nosotros.` : ""} ¿En qué puedo ayudarte hoy?"
*(SIN llamar herramientas)*

**Usuario**: "cuánto debo?" o "tengo deuda?"
${hasMultipleContracts 
  ? `**Asistente**: "Tienes ${clientData.totalContracts} contratos. Te detallo la deuda de cada uno:" [muestra la tabla de contratos con su deuda individual] "Si necesitas pagar alguno, puedes hacerlo por Pago Móvil, Transferencia o Zelle."`
  : clientData.serviceStatus === "suspended" 
    ? `**Asistente**: "Tu contrato #${clientData.contract} tiene una deuda de **$${clientData.debtAmount?.toFixed(2)}**. Como tu servicio está suspendido, te recomiendo realizar el pago para reactivarlo. Puedes pagar por Pago Móvil, Transferencia Bancaria o Zelle. ¿Necesitas las cuentas bancarias?"`
    : `**Asistente**: "Tu contrato #${clientData.contract} tiene un saldo pendiente de **$${clientData.debtAmount?.toFixed(2)}**. Puedes pagarlo por Pago Móvil, Transferencia Bancaria o Zelle."`
}
*(SIN llamar herramientas - ya tienes la info)*

**Usuario**: "no tengo internet"
${clientData.serviceStatus === "suspended" 
  ? `**Asistente**: "Tu servicio está suspendido por un saldo de $${clientData.debtAmount?.toFixed(2)}. Una vez realices el pago, el servicio se reactivará automáticamente."`
  : hasMultipleContracts
    ? `**Asistente**: "Para revisarte la falla necesito confirmar a cuál contrato te refieres. ¿Me indicas el número de contrato o el sector?"`
    : `**Asistente**: "Déjame revisar el estado de tu conexión..."`
}

---
`;

  return clientContext + FULL_SYSTEM_PROMPT;
}


function buildServiceInstructions(clientData: ClientContextData): string {
  const hasMultipleContracts = (clientData.totalContracts ?? 0) > 1;
  const multiContractWarning = hasMultipleContracts 
    ? `\n**ATENCION - MULTIPLES CONTRATOS**: Este cliente tiene ${clientData.totalContracts} contratos. Cada contrato tiene su deuda INDEPENDIENTE. Consulta la tabla de contratos para dar informacion precisa por contrato.\n`
    : "";

  if (clientData.contractTag === "with_debt" || clientData.serviceStatus === "suspended") {
    return SUSPENDED_SERVICE_PROMPT + multiContractWarning;
  }

  if (clientData.contractTag === "verify") {
    return VERIFY_PENDING_PROMPT + multiContractWarning;
  }

  if (clientData.hasDebt) {
    return DEBT_WITH_ACTIVE_SERVICE_PROMPT + multiContractWarning;
  }

  return ACTIVE_SERVICE_PROMPT;
}


function buildContractDetailsBlock(allContracts?: ClientContextData["allContracts"]): string {
  if (!allContracts || allContracts.length === 0) return "";

  const contractLines = allContracts.map((c) => {
    const tagText =
      c.contractTag === "available"
        ? "Al dia"
        : c.contractTag === "verify"
          ? "Pago en verificacion"
          : c.contractTag === "with_debt"
            ? "Suspendido por deuda"
            : c.status || "Desconocido";
    return `  - Contrato #${c.contractId} | ${c.sector} | ${c.planName || "Sin plan"} | ${tagText} | Deuda: $${c.debt.toFixed(2)}`;
  });

  const header = allContracts.length > 1
    ? `\n### DETALLE POR CONTRATO (deudas INDEPENDIENTES):\n`
    : `\n### DETALLE DEL CONTRATO:\n`;

  const footer = allContracts.length > 1
    ? `\n**IMPORTANTE**: La deuda de cada contrato es INDEPENDIENTE. Cuando el cliente pregunte por su deuda, muestra la de CADA contrato por separado. No sumes a menos que pregunte el total.\n`
    : "";

  return header + contractLines.join("\n") + footer;
}

function buildPaymentVerificationStatus(allContracts?: ClientContextData["allContracts"]): string {
  if (!allContracts || allContracts.length === 0) {
    return "No hay informacion de contratos disponible.";
  }

  const verifyContracts = allContracts.filter((c) => c.contractTag === "verify");
  const inferredVerifyContracts = allContracts.filter((c) => {
    const log = c.nextInvoiceValidationLog;
    if (!log) return false;

    const notFound = log.notFound || 0;
    const used = log.used || 0;
    const error = log.error || 0;
    const payment = log.payment || 0;
    const definitelyNotFound = log.definitelyNotFound || 0;

    return c.contractTag !== "with_debt" && notFound > 0 && used === 0 && payment === 0 && definitelyNotFound === 0 && error >= 0;
  });

  const allVerificationContracts = [
    ...verifyContracts,
    ...inferredVerifyContracts.filter((candidate) => !verifyContracts.some((existing) => existing.contractId === candidate.contractId)),
  ];

  if (allVerificationContracts.length === 0) {
    return "**NINGUNO de los contratos tiene pagos en verificacion.** Todos los contratos tienen su estado al dia o con deuda. Si el cliente pregunta si tiene pagos en verificacion, responde que NO tiene pagos pendientes de verificacion.";
  }

  const lines = allVerificationContracts.map((c) => {
    const notFound = c.nextInvoiceValidationLog?.notFound || 0;
    const inferredHint = c.contractTag === "verify"
      ? ""
      : ` | señal por next_invoice_validation_log.not_found=${notFound}`;
    return `- Contrato #${c.contractId} (${c.sector}): Pago en verificacion${inferredHint}`;
  });
  return `Los siguientes contratos tienen pagos en proceso de verificacion (24-48 horas habiles):\n${lines.join("\n")}`;
}

function buildClientTypePlanInstruction(clientType?: string): string {
  if (!clientType) return "";

  const isResidential = clientType.toUpperCase().includes("RESIDENCIAL");

  return `
### TIPO DE CLIENTE: ${clientType}
Cuando pregunte por planes de internet:
- Muestra los planes ${isResidential ? "RESIDENCIALES" : "COMERCIALES/PYMES"} (su tipo)
- Si pregunta explicitamente por ${isResidential ? "planes PYMES/comerciales" : "planes residenciales"}, tambien muestralos
`;
}


export function getSystemPromptLength(clientData?: ClientContextData): number {
  return buildSystemPrompt(clientData).length;
}
