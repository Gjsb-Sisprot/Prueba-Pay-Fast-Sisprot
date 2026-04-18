
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
    : clientData.serviceStatus === "cancelled" ? "Cancelado"
    : clientData.serviceStatus || "Desconocido";

  const contractTagText = clientData.contractTag === "available" ? "Al dia"
    : clientData.contractTag === "verify" ? "Pago en verificacion"
    : clientData.contractTag === "with_debt" ? "Suspendido por deuda"
    : statusText;

  const onuSerial = clientData.onuSerial || "";
  
  const hasMultipleContracts = (clientData.totalContracts ?? 0) > 1;
  const multiContractInfo = hasMultipleContracts
    ? `\n- **CONTRATOS**: ${clientData.totalContracts} total (${clientData.activeContracts} activo${clientData.activeContracts !== 1 ? 's' : ''}, ${clientData.suspendedContracts} suspendido${clientData.suspendedContracts !== 1 ? 's' : ''}${clientData.cancelledContracts ? `, ${clientData.cancelledContracts} cancelado${clientData.cancelledContracts !== 1 ? 's' : ''}` : ''})`
    : "";
  
  const isContractSelected = !!clientData.contract;
  const serviceInstructions = buildServiceInstructions(clientData);

  const clientContext = `
---

## INSTRUCCION PRIORITARIA - LEE ESTO PRIMERO

**EL CLIENTE YA ESTÁ AUTENTICADO EN EL PORTAL.**
**NO le indiques "ingresa al portal" ni repitas enlaces HTTP.**

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

${buildContractDetailsBlock(clientData.allContracts)}
${buildPaymentVerificationStatus(clientData.allContracts)}

${buildClientTypePlanInstruction(clientData.clientType)}

### 🚨 REGLAS DE COMPORTAMIENTO:
${!isContractSelected ? `1. **CONTRATO OBLIGATORIO**: El cliente NO ha seleccionado su contrato aún. Tu respuesta DEBE empezar con el token __SELECT_CONTRACT__ (o variantes :ADMIN/:TECH).` : `1. **CONTRATO SELECCIONADO**: El cliente YA seleccionó el contrato #${clientData.contract}. NO vuelvas a pedirlo ni uses tokens de selección. Procede directo a la solución.`}
2. **SALUDOS OFICIALES**: Si el cliente tiene deuda o está al día, usa los saludos oficiales definidos en SUSPENDED_SERVICE_PROMPT o ACTIVE_SERVICE_PROMPT.
3. **BYPASS POR FRUSTRACIÓN**: Si el usuario usa lenguaje fuerte ("coño", "nojoda", "ladilla", "no sirve") o se muestra muy molesto, IGNORA los saludos oficiales y la petición de contrato. **PROSEGUIR INMEDIATAMENTE AL ESCALAMIENTO O SOLUCIÓN TÉCNICA**. La prioridad es calmar al cliente con resolutividad.
`;

  const multiContractText = (hasMultipleContracts && !isContractSelected) ? `### ALERTA MULTI-CONTRATO
Este cliente posee ${clientData.totalContracts} servicios. NO PUEDES CONTINUAR sin usar el token __SELECT_CONTRACT__.` : "";

  const suspendedText = clientData.serviceStatus === "suspended" ? `⚠️ SERVICIO SUSPENDIDO: Indica deuda de $${clientData.debtAmount?.toFixed(2)}.` : "";

  return clientContext + FULL_SYSTEM_PROMPT + `
${multiContractText}
${suspendedText}

---
### 🚨 INSTRUCCIONES DE ESTADO (MÁXIMA PRIORIDAD):
${serviceInstructions}

### 🚨 REGLA DE ORO FINAL:
${!isContractSelected ? `- SI EL USUARIO SALUDA O INICIA CONVERSACIÓN: Usa el Saludo Oficial y pide contrato con __SELECT_CONTRACT__.` : `- CONTRATO YA SELECCIONADO: Prohibido pedir contrato o usar tokens de selección. Resuelve la intención directamente.`}
- **SEGUIMIENTO**: Recuerda siempre terminar con "¿Hay algo más en lo que pueda ayudarte?" (excepto en el cierre).
`;
}


function buildServiceInstructions(clientData: ClientContextData): string {
  const hasMultipleContracts = (clientData.totalContracts ?? 0) > 1;
  const multiContractWarning = hasMultipleContracts 
    ? `\n**ATENCION - MULTIPLES CONTRATOS**: Este cliente tiene ${clientData.totalContracts} contratos. Consulta la tabla de contratos para dar información precisa por contrato y NO generalices un estado si hay contratos con estados distintos.\n`
    : "";

  // 1. PRIORIDAD ABSOLUTA: Estado del contrato seleccionado por el usuario
  if (clientData.contract && clientData.allContracts) {
    const selectedContract = clientData.allContracts.find(c => c.contractId.toString() === clientData.contract?.toString());
    
    if (selectedContract) {
      const status = (selectedContract.statusName || selectedContract.status || "").toLowerCase();
      
      // CASO CANCELADO: Prioridad técnica máxima (Bloqueante)
      if (status.includes('cancel')) {
        return `### 🚨 REGLA SUPREMA: CONTRATO BLOQUEADO (CANCELADO)
El contrato #${selectedContract.contractId} está **CANCELADO**.
**MENSAJE OBLIGATORIO AL CLIENTE**: "Tu servicio se encuentra actualmente **Cancelado**. Debes pagar tus facturas para poder seguir disfrutando del servicio de este contrato."
**PROHIBICIÓN ABSOLUTA**: No realices diagnósticos técnicos, no pidas WiFiman, no pidas videos ni fotos. PROHIBIDO intentar ayudar técnicamente.
**ACCIÓN ADMINISTRATIVA**: Genera el ticket de reactivación de inmediato.` + multiContractWarning;
      }

      // CASO SUSPENDIDO POR DEUDA
      if (selectedContract.contractTag === "with_debt" || status.includes('suspend') || selectedContract.debt > 0) {
        return `### 🚫 CONTRATO SUSPENDIDO POR DEUDA (CONTRATO #${selectedContract.contractId})
El servicio en el sector **${selectedContract.sector}** está suspendido.
**ACCIÓN OBLIGATORIA**: Indica que el monto pendiente para este contrato es de **$${selectedContract.debt.toFixed(2)}**. Envía el token **__PAYMENT_ACTION__** y guía al portal de pagos.` + multiContractWarning;
      }

      // CASO EN VERIFICACIÓN
      if (selectedContract.contractTag === "verify") {
        return VERIFY_PENDING_PROMPT + ` (Contrato #${selectedContract.contractId})` + multiContractWarning;
      }
    }
  }

  // 2. FALLBACK: Si no hay contrato seleccionado o no se encontró el específico, usar lógica general
  if (clientData.serviceStatus === "cancelled") {
      return `### ⚠️ AVISO DE SERVICIO CANCELADO
Tu cuenta principal se encuentra **CANCELADA**. Es necesario procesar una **Reactivación** para recuperar la navegación.` + multiContractWarning;
  }

  if (clientData.serviceStatus === "suspended" || clientData.contractTag === "with_debt") {
    return SUSPENDED_SERVICE_PROMPT + multiContractWarning;
  }

  if (clientData.contractTag === "verify") {
    return VERIFY_PENDING_PROMPT + multiContractWarning;
  }

  const hasAtLeastOneActive = (clientData.activeContracts ?? 0) > 0;
  
  const isContractSelected = !!clientData.contract;
  if (isContractSelected) {
    const selectedContract = clientData.allContracts?.find(c => c.contractId.toString() === clientData.contract?.toString());
    const isSelectedActive = selectedContract?.isActive || (selectedContract?.statusName?.toLowerCase().includes('activ') || selectedContract?.status?.toLowerCase().includes('activ'));
    
    if (isSelectedActive) {
      if (clientData.hasDebt) {
        return DEBT_WITH_ACTIVE_SERVICE_PROMPT + multiContractWarning;
      }
      return `### [PREFIJO DE RESPUESTA OBLIGATORIO]
Debes usar el literal de ACTIVE_SERVICE_PROMPT para iniciar tu mensaje:
"¡Genial! Actualmente no tienes deudas de pendientes. ✅ __SELECT_ISSUE_TYPE__ Si necesitas realizar otra gestión o consultar algo más, cuéntame y te guiaré al instante. ⚡"
` + multiContractWarning;
    }
    // Si el seleccionado no es activo, las instrucciones específicas ya habrán sido devueltas arriba en buildServiceInstructions
  } else if (hasAtLeastOneActive) {
    if (clientData.hasDebt) {
      return DEBT_WITH_ACTIVE_SERVICE_PROMPT + multiContractWarning;
    }
    return `### [PREFIJO DE RESPUESTA OBLIGATORIO]
Debes usar el literal de ACTIVE_SERVICE_PROMPT para iniciar tu mensaje:
"¡Genial! Actualmente no tienes deudas de pendientes. ✅ __SELECT_ISSUE_TYPE__ Si necesitas realizar otra gestión o consultar algo más, cuéntame y te guiaré al instante. ⚡"
` + multiContractWarning;
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
