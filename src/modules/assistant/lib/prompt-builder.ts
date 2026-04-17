
import type { ClientContextData } from "./types";
import {
  SYSTEM_PROMPT_BASE,
  SUSPENDED_SERVICE_PROMPT,
  DEBT_WITH_ACTIVE_SERVICE_PROMPT,
  ACTIVE_SERVICE_PROMPT,
  VERIFY_PENDING_PROMPT,
} from "./system-prompt";

const PLANES_RESIDENCIALES = `
- **300 Megas**: $27.60
- **450 Megas**: $34.50
- **600 Megas**: $40.25
- **650 Megas**: $46.00
- **750 Megas**: $49.50
- **800 Megas**: $55.00
- **1 Giga**: $74.70
`;

const PLANES_PYMES = `
- **150 Megas**: $27.60
- **300 Megas**: $39.09
- **400 Megas**: $51.74
- **650 Megas**: $70.18
- **800 Megas**: $110.40
- **1 Giga**: $161.00
`;

const INFO_INSTALACION = `
- **Instalación Sin WiFi**: $88 (Puede financiarse con el 30% inicial)
- **Instalación Con WiFi 6**: $130 (Puede financiarse con el 30% inicial)
- **Súper Promo**: 1er mes con 70% de descuento y 2do mes con 30% de descuento.
`;

const IMG_PLAN_RESIDENCIAL = '![Planes Residenciales](https://github.com/Gjsb-Sisprot/Prueba-Pay-Fast-Sisprot/blob/main/public/assets/images/plan/residenciales.png)';
const IMG_PLAN_PYME = '![Planes PYMES](https://github.com/Gjsb-Sisprot/Prueba-Pay-Fast-Sisprot/blob/main/public/assets/images/plan/pymes.png)';


const FULL_SYSTEM_PROMPT = SYSTEM_PROMPT_BASE;

export function getBaseSystemPrompt(): string {
  return FULL_SYSTEM_PROMPT;
}


export function buildSystemPrompt(clientData?: ClientContextData, hasHistory: boolean = false): string {
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
    ? `\n- **CONTRATOS**: ${clientData.totalContracts} total (${clientData.activeContracts} activo${clientData.activeContracts !== 1 ? 's' : ''}, ${clientData.suspendedContracts} suspendido${clientData.suspendedContracts !== 1 ? 's' : ''}${clientData.cancelledContracts ? `, ${clientData.cancelledContracts} cancelado${clientData.cancelledContracts !== 1 ? 's' : ''}` : ''})`
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
- Estado: ${contractTagText}
- **DEUDA TOTAL**: ${clientData.hasDebt ? `$${clientData.debtAmount?.toFixed(2) || "N/A"}` : "$0.00"}
${onuSerial ? `- Serial ONU: ${onuSerial}` : "- Serial ONU: No disponible"}

${hasHistory && !hasMultipleContracts ? `
> [!NOTE]
> Como hay historial de conversación, NO repitas el detalle completo del servicio a menos que sea necesario.
` : `
${buildContractDetailsBlock(clientData.allContracts)}
${buildPaymentVerificationStatus(clientData.allContracts)}
`}

${serviceInstructions}
${buildClientTypePlanInstruction(clientData.clientType)}

### REGLAS CRÍTICAS DE COMPORTAMIENTO:

1. **USA LA INFORMACIÓN QUE YA TIENES**:
   - Estado del servicio: ${statusText}
   - Deuda y estado de cada contrato (ver tabla de contratos arriba)
   - Si pregunta por pagos en verificacion, revisa el contract_tag de cada contrato
   - Métodos de pago: Pago Móvil, Transferencia Bancaria, Zelle
  - Si debe pagar o reportar pago desde este chat, activa la acción con __PAYMENT_ACTION__ sin enviar URL de ingreso al portal.
  - **TELÉFONO DEL CLIENTE**: Si necesitas confirmar el número de contacto para una visita técnica, NO lo pidas desde cero. Di: "**Actualmente tenemos registrado el número ${clientData.phone || "[SIN TELÉFONO]"}. ¿Es correcto o deseas modificarlo? Puedes validarlo o modificarlo en el portal: Mi Cuenta > Configuración > Datos Personales.**"
   - Usa estos datos directamente en tu respuesta.

2. **CERO SALUDOS REPETIDOS**:
  - ¡VITAL! NO SALUDES en cada respuesta ("Hola", "Soy Susana", etc.).
  - Solo hazlo en el PRIMER mensaje de toda la conversación. Después, responde directamente sin cortesía inicial.

3. **MANEJO DE PROBLEMAS TÉCNICOS Y MULTICONTRATO**:
   ${hasMultipleContracts
     ? `
- **POLÍTICA DE MULTI-CONTRATO (OBLIGATORIA)**: El cliente tiene ${clientData.totalContracts} servicios. SIEMPRE debes iniciar el primer mensaje con el token \`__SELECT_CONTRACT__\` para que el usuario elija su contrato. Es PROHIBIDO asumir un sector.
- **VALIDACIÓN DE SECTOR (ESTRICTA)**: Si el usuario menciona un sector que NO existe en sus registros, DEBES detenerte y usar \`__SELECT_CONTRACT__\`. Actualmente tiene servicios en: **${clientData.allContracts?.map(c => c.sector).join(" y ")}**.`
     : ""}
   ${clientData.serviceStatus === "suspended" 
     ? `- ⚠️ SERVICIO SUSPENDIDO: No ofrezcas soporte técnico.
   - Responde directamente: el servicio está suspendido por una deuda de $${clientData.debtAmount?.toFixed(2) || "pendiente"}, debe pagar para reactivar.`
     : `- Si el usuario reporta problemas ("no tengo internet", "está lento", "se cae la conexión"):
     * **REGLA DE ORO**: Antes de diagnosticar, asegúrate de que el sector mencionado coincida con los datos del cliente.
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

**Usuario**: "hola" (con 2 contratos en el sistema)
**Asistente**: "\`__SELECT_CONTRACT__\` ¡Hola${firstName ? ` ${firstName}` : ""}! Soy Susana, tu **Operador de Soporte Inteligente** de Sisprot. He notado que tienes **2 servicios** registrados. ¿Con cuál de ellos desea continuar?"

**Usuario**: (selecciona un contrato)
**Asistente**: "\`__SELECT_ISSUE_TYPE__\` ¡Perfecto! He seleccionado tu contrato. ¿Qué deseas realizar hoy para este servicio?"

---
`;

  const finalReminder = `
---
### 🚨 RECORDATORIO FINAL DE FLUJO (CRÍTICO)
1. Si el cliente tiene > 1 contrato y no ha elegido: Usa \`__SELECT_CONTRACT__\` inmediatamente.
2. Si el cliente ya eligió contrato (o solo tiene uno) y no ha elegido gestión: Usa \`__SELECT_ISSUE_TYPE__\` inmediatamente.
3. NUNCA repitas saludos.
4. NUNCA menciones JSON ni IDs internos.
`;

  return clientContext + FULL_SYSTEM_PROMPT + finalReminder;
}


function buildServiceInstructions(clientData: ClientContextData): string {
  const hasMultipleContracts = (clientData.totalContracts ?? 0) > 1;
  const hasAtLeastOneActive = (clientData.activeContracts ?? 0) > 0;
  
  const multiContractWarning = hasMultipleContracts 
    ? `\n**ATENCION - MULTIPLES CONTRATOS**: Este cliente tiene ${clientData.totalContracts} contratos. Algunos pueden estar activos y otros suspendidos. Consulta la tabla de contratos para dar informacion precisa por contrato y NO generalices un estado de suspension si hay contratos activos.\n`
    : "";

  // Si tiene al menos uno activo, tratamos el servicio como ACTIVO para permitir soporte
  if (hasAtLeastOneActive) {
    if (clientData.hasDebt) {
      return DEBT_WITH_ACTIVE_SERVICE_PROMPT + multiContractWarning;
    }
    return ACTIVE_SERVICE_PROMPT + multiContractWarning;
  }

  // Solo si TODOS están suspendidos o no hay activos
  if (clientData.contractTag === "with_debt" || clientData.serviceStatus === "suspended") {
    return SUSPENDED_SERVICE_PROMPT + multiContractWarning;
  }

  if (clientData.contractTag === "verify") {
    return VERIFY_PENDING_PROMPT + multiContractWarning;
  }

  return ACTIVE_SERVICE_PROMPT;
}


function buildContractDetailsBlock(allContracts?: ClientContextData["allContracts"]): string {
  if (!allContracts || allContracts.length === 0) return "";

  const contractLines = allContracts.map((c) => {
    const tagText =
      c.contractTag === "available"
        ? "✅ Al día"
        : c.contractTag === "verify"
          ? "⏳ Pago en verificación"
          : c.contractTag === "with_debt"
            ? "🚫 Suspendido por deuda"
            : `🔸 ${c.statusName || c.status || "Desconocido"}`;
    
    return `- **ID #${c.contractId}** | Sector: **${c.sector}** | Plan: *${c.planName || "N/A"}* | Estatus: ${tagText} | Deuda: **$${c.debt.toFixed(2)}**`;
  });

  const header = allContracts.length > 1
    ? `\n### 📋 SERVICIOS REGISTRADOS (${allContracts.length}):\n`
    : `\n### 📋 DETALLE DEL SERVICIO:\n`;

  const footer = allContracts.length > 1
    ? `\n> [!IMPORTANT]\n> El cliente debe especificar a cuál de estos **${allContracts.length} sectores** se refiere para recibir soporte especializado.\n`
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
### TARIFARIO Y PLANES DE INTERNET (ACTUALIZADO 2025):
Cuando el usuario pregunte por planes, precios o tarifas:
1. **INFORMACIÓN VISUAL (OBLIGATORIO)**: Cuando hables de los planes de su tipo, DEBES incluir el siguiente código markdown EXACTO para que se muestre la tarjeta visual:
   - Para Residenciales: ${IMG_PLAN_RESIDENCIAL}
   - Para PYMES: ${IMG_PLAN_PYME}
2. **DATOS EXACTOS**:
   - **Planes Residenciales**: ${PLANES_RESIDENCIALES}
   - **Planes PYMES (Empresas)**: ${PLANES_PYMES}
   - **Costos de Instalación**: ${INFO_INSTALACION}
3. **CRITERIO**: Muestra primero los planes **${isResidential ? "RESIDENCIALES" : "PYMES/EMPRESAS"}**.
4. **ARGUMENTO DE VENTA**: Menciona la **Súper Promo** (70% desc. primer mes) y que puede contratar con solo el **30% de inicial**.
5. **ESTILO**: Sé persuasivo pero breve. No repitas toda la lista si vas a mostrar la imagen, solo destaca los puntos clave.
6. **UNA PREGUNTA A LA VEZ (REGLA DE ORO)**: NO satures al usuario. Si estás asesorando sobre planes, pregunta sobre sus necesidades de uso/equipos. NO preguntes por cobertura al mismo tiempo. Deja que el usuario responda a una cosa primero.
7. **NUEVOS CONTRATOS**: Si el usuario pide un servicio nuevo, PREGUNTA PRIMERO si desea **Residencial** o **PYME** antes de mostrar imágenes o preguntar por el uso.
`;
}


export function getSystemPromptLength(clientData?: ClientContextData): number {
  return buildSystemPrompt(clientData).length;
}
