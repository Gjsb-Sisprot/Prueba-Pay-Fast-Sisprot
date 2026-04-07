
import { CLOSE_OFFER_PREFIX, type ClientContextData } from "./types";

function firstName(clientData?: ClientContextData): string {
  return clientData?.name?.split(" ")[0] || "";
}

function personalize(template: string, clientData?: ClientContextData): string {
  const name = firstName(clientData);
  return name ? template.replace("{name}", ` ${name}`) : template.replace("{name}", "");
}

const GRATITUDE_PATTERNS = [
  /^(gracias?|muchas\s*gracias|genial|excelente)[\s,.!]*$/i,
  /^(perfecto|genial|excelente|ok|listo|dale|va|vale),?\s*(muchas\s*)?gracias[\s,.!]*/i,
  /^muchas\s*gracias/i,
  /^gracias\s*(por\s*todo|hermano|pana|amigo|bro)/i,
];

const SOCIAL_COURTESY_PATTERNS = [
  /^mucho\s*gusto[\s,.!]*$/i,
  /^un\s+gusto[\s,.!]*$/i,
  /^igualmente[\s,.!]*$/i,
  /^encantad[oa][\s,.!]*$/i,
  /^el\s+gusto\s+es\s*m[ií]o[\s,.!]*$/i,
];

const ACKNOWLEDGMENT_PATTERN =
  /^(ok|okey|okie|perfecto|dale|va|vale|de\s*acuerdo|entendido|listo|s[ií]|claro|a[hj][aá]|ya\s*veo|genial)[\s,.!]*$/i;

function isGratitude(normalized: string): boolean {
  return GRATITUDE_PATTERNS.some((p) => p.test(normalized));
}

function isAcknowledgment(normalized: string): boolean {
  return ACKNOWLEDGMENT_PATTERN.test(normalized);
}

function isSocialCourtesy(normalized: string): boolean {
  return SOCIAL_COURTESY_PATTERNS.some((p) => p.test(normalized));
}

export function buildNoToolDirectResponse(
  message: string,
  clientData?: ClientContextData,
  conversationLength?: number
): string | undefined {
  const normalized = message.toLowerCase().trim();

  if (/c[oó]mo\s*me\s*llamo|cu[áa]l\s*es\s*mi\s*nombre|me\s*puedes\s*decir\s*mi\s*nombre|qui[ée]n\s*soy/i.test(normalized)) {
    if (clientData?.name) {
      return `Te llamas ${clientData.name}.`;
    }
    return "No tengo tu nombre en este momento. Si quieres, te ayudo con tu consulta de servicio o pagos.";
  }

  if (/c[oó]mo\s*te\s*(llamas?|dicen|llaman)|cu[áa]l\s*es\s*tu\s*nombre|qui[ée]n\s*eres|eres\s*(un\s*)?(bot|robot|ia|asistente|humana?|persona|real)|^tu\s*nombre/i.test(normalized)) {
    return "Me llamo Susana, soy tu asistente virtual de Sisprot Global Fiber. Estoy aqu\u00ed para ayudarte con tu servicio de internet, pagos y facturas.";
  }

  if (/^(hola|buenas?|buenos?\s*(d[ií]as?|tardes?|noches?)|hey|[ée]pale|qu[ée]\s*tal|saludos?)\s*[,.!?]*$/i.test(normalized)) {
    const greeting = personalize("\u00a1Hola{name}! Soy Susana, tu asistente de Sisprot.", clientData);
    if ((clientData?.totalContracts ?? 0) > 1) {
      return `${greeting} ${buildSupportContractDisambiguationMessage(clientData)}`;
    }
    return `${greeting} \u00bfEn qu\u00e9 puedo ayudarte hoy?`;
  }

  if (/d[oó]nde\s*(est[áa]n?|quedan?|se\s*ubican?|est[áa]\s*la\s*oficina)|ubicacci[oó]n|ubicaci[oó]n|direcci[oó]n(\s*f[ií]sica)?|oficina\s*principal|ir\s*a\s*la\s*oficina|c[oó]mo\s*llegar|d[oó]nde\s*es/i.test(normalized)) {
    return "Nuestra oficina principal de Sisprot Global Fiber se ubica en:\n\n📍 **Dirección**: Avenida Intercomunal Santiago Mariño, C.C. Paseo Estación Central (Antiguo Graffitti), Nivel Mezzanina, Local M-14. Turmero, Estado Aragua.\n🕒 **Horario**: Lunes a Viernes de 8:00 AM a 5:00 PM y Sábados de 9:00 AM a 1:00 PM.\n\n[Ver en Google Maps](https://maps.app.goo.gl/33vLLKyo5vUWujQUA?g_st=awb)";
  }

  if (isSocialCourtesy(normalized)) {
    return personalize("\u00a1Mucho gusto{name}! Estoy para ayudarte con tu servicio de internet, pagos o facturas. \u00bfQu\u00e9 necesitas hoy?", clientData);
  }

  const hasSubstantiveHistory = (conversationLength ?? 0) >= 2;

  if ((isGratitude(normalized) || isAcknowledgment(normalized)) && hasSubstantiveHistory) {
    const closeMsg = personalize(
      "¡Con gusto{name}! Si no necesitas nada más, puedo cerrar la conversación.",
      clientData
    );
    return `${CLOSE_OFFER_PREFIX}${closeMsg}`;
  }

  if (isGratitude(normalized)) {
    return personalize("¡Con gusto{name}! ¿Hay algo más en lo que pueda ayudarte?", clientData);
  }

  if (isAcknowledgment(normalized)) {
    return personalize("¡Perfecto{name}! ¿Necesitas algo más?", clientData);
  }



  if (/(?:plan|precio|cu\u00e1nto\s*cuesta|tarifa|mensualidad|costo|megas|cat\u00e1logo|pyme|residencial)/i.test(normalized)) {
    const isPyme = /pymes?|empresa|comercial/i.test(normalized);
    const isResidencial = /residencial|hogar|casa/i.test(normalized);

    let response = "\u00a1Claro! Tenemos los mejores planes de fibra \u00f3ptica para ti con nuestra **Super Promo**: **70% de descuento** el primer mes y **30% el segundo**. \ud83d\ude80\n\n";

    if (isPyme || (!isResidencial && !isPyme)) {
      response += "**Planes PYMES (Empresas):**\n";
      response += "- **150 Megas**: $27.60\n- **300 Megas**: $39.09\n- **400 Megas**: $51.74\n- **650 Megas**: $70.18\n- **800 Megas**: $110.40\n- **1 Giga**: $161.00\n\n";
      response += "![Planes PYMES](https://github.com/Gjsb-Sisprot/Prueba-Pay-Fast-Sisprot/blob/main/public/assets/images/plan/pymes.png)\n\n";
    }

    if (isResidencial || (!isResidencial && !isPyme)) {
      response += "**Planes Residenciales:**\n";
      response += "- **300 Megas**: $27.60\n- **450 Megas**: $34.50\n- **600 Megas**: $40.25\n- **650 Megas**: $46.00\n- **750 Megas**: $49.50\n- **800 Megas**: $55.00\n- **1 Giga**: $74.70\n\n";
      response += "![Planes Residenciales](https://github.com/Gjsb-Sisprot/Prueba-Pay-Fast-Sisprot/blob/main/public/assets/images/plan/residenciales.png)\n\n";
    }

    response += "\u00bfCu\u00e1l de estos planes se adapta mejor a lo que buscas? \ud83d\udca1 Recuerda que puedes contratar con solo el **30% de inicial**.";
    return response;
  }

  if (/(?:pago|pagar|cuenta|banco|zelle|transferencia|movil|m\u00f3vil|reportar|bcv)/i.test(normalized)) {
    return "__PAYMENT_ACTION__\u00a1Claro! Puedes realizar tus pagos de forma r\u00e1pida a trav\u00e9s de:\n\n" +
           "\ud83d\udcf1 **Pago M\u00f3vil**: (Los datos aparecer\u00e1n en pantalla)\n" +
           "\ud83c\udfe6 **Transferencia Bancaria**: BNC, Bancamiga o Provincial.\n" +
           "\ud83d\udcb5 **Zelle**: Para pagos internacionales.\n\n" +
           "Recuerda que si el pago es en Bs., usamos la **tasa BCV** del d\u00eda. \u00bfNecesitas los datos espec\u00edficos de alguna cuenta?";
  }

  if (/(?:redes|instagram|sociales|youtube|contacto|whatsapp|facebook)/i.test(normalized)) {
    return "\u00a1S\u00edguenos y mantente al d\u00eda con Sisprot! \ud83d\udcf1\n\n" +
           "\ud83d\udcf8 **Instagram**: @sisprotgf\n" +
           "\ud83d\udcfa **YouTube**: [Sisprot Online](https://www.youtube.com/@sisprotgf)\n" +
           "\ud83d\udcac **WhatsApp**: [0412-0261134](https://wa.me/584120261134)\n" +
           "\ud83c\udf10 **Web**: [www.sisprotgf.com](https://www.sisprotgf.com)";
  }

  if (/(?:cobertura|donde\s*llegan|sectores|zona)/i.test(normalized)) {
    return "Actualmente ofrecemos el mejor servicio de Fibra \u00d3ptica en todo el **Municipio Santiago Mari\u00f1o** (Turmero, Sam\u00e1n de G\u00fcre, etc.) y zonas aleda\u00f1as. \ud83d\udccd\n\n\u00bfEn qu\u00e9 sector te encuentras para confirmarte disponibilidad exacta?";
  }

  return undefined;
}

export function buildNoToolFallbackResponse(clientData?: ClientContextData): string {
  return personalize("Te leo{name}. ¿En qué puedo ayudarte con tu servicio, pagos o facturas?", clientData);
}

export function buildSupportContractDisambiguationMessage(clientData?: ClientContextData): string {
  const contracts = clientData?.allContracts ?? [];
  const contractsHint = contracts
    .slice(0, 4)
    .map((contract) => `#${contract.contractId}${contract.sector ? ` (${contract.sector})` : ""}`)
    .join(", ");

  if (contractsHint) {
    return `He notado que tienes varios contratos activos, \u00bfde cu\u00e1l de ellos deseas consultar informaci\u00f3n? Actualmente tienes estos servicios: ${contractsHint}. Puedes responderme con el n\u00famero de contrato o el nombre del sector.`;
  }

  return "He notado que tienes m\u00faltiples contratos asociados a tu cuenta. \u00bfSobre cu\u00e1l de ellos deseas realizar tu consulta hoy?";
}
