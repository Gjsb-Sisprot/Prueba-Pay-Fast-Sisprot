
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
    return personalize("\u00a1Hola{name}! Soy Susana, tu asistente de Sisprot. \u00bfEn qu\u00e9 puedo ayudarte hoy?", clientData);
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

  return undefined;
}

export function buildNoToolFallbackResponse(clientData?: ClientContextData): string {
  return personalize("Te leo{name}. ¿En qué puedo ayudarte con tu servicio, pagos o facturas?", clientData);
}
