import { CLOSE_OFFER_PREFIX, type ClientContextData } from "./types";

function firstName(clientData?: ClientContextData): string {
  if (!clientData?.name) return "";
  
  // Limpieza básica y manejo de formato "Apellido, Nombre" o "Nombre Apellido"
  const cleanName = clientData.name.trim().replace(/,/g, " ");
  const parts = cleanName.split(/\s+/).filter(p => p.length > 1);
  
  if (parts.length === 0) return "";
  
  // Si el primer elemento parece un apellido común o el nombre está invertido,
  // pero para la mayoría de los casos, el primer elemento es el nombre.
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
}

function personalize(template: string, clientData?: ClientContextData): string {
  const name = firstName(clientData);
  return name ? template.replace("{name}", ` ${name}`) : template.replace("{name}", "");
}

function buildDetailedMulticontractGreeting(clientData: ClientContextData): string {
  const total = clientData.totalContracts ?? 0;
  const firstNameStr = firstName(clientData);
  const greeting = `¡Hola${firstNameStr ? ` ${firstNameStr}` : ""}! He notado que tienes **${total} servicios** registrados con nosotros. Como cada contrato es independiente, aquí te detallo su estado actual:`;

  const contractList = clientData.allContracts
    ?.map(c => {
      const statusIcon = c.isActive ? "✅" : "⚠️";
      const statusText = c.isActive ? "Al día" : "**Suspendido** por deuda";
      const debtText = `(Deuda: $${c.debt.toFixed(2)})`;
      return `- **Contrato #${c.contractId}** (${c.planName || "Sin plan"}): ${statusText} ${debtText} ${statusIcon}`;
    })
    .join("\n") || "";

  return `${greeting}\n\n${contractList}\n\nPara poder brindarte información precisa, **¿con cuál de estos servicios deseas continuar hoy?** (Puedes escribirme el número de contrato o el sector).`;
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

  // 1. CONSULTA DE PLANES (Prioridad Alta)
  // EXCEPCIÓN: Si el mensaje contiene indicios de asesoría (dispositivos, uso específico),
  // devolvemos undefined para que pase al Solver y de una respuesta personalizada.
  const isAdvisoryQuery = /(?:televisor|tv|ps\d|xbox|consola|celular|dispositivo|equipo|conectado|recomienda|mejor)/i.test(normalized);
  if (isAdvisoryQuery) return undefined;

  if (/(?:plan|precio|cu\u00e1nto\s*cuesta|tarifa|mensualidad|costo|megas|cat\u00e1logo|pyme|residencial)/i.test(normalized)) {
    const isPyme = /pymes?|empresa|comercial/i.test(normalized);
    const isResidencial = /residencial|hogar|casa/i.test(normalized);

    let response = "\u00a1Claro! Tenemos los mejores planes de fibra \u00f3ptica para ti con nuestra **Súper Promo**: **70% de descuento** el primer mes y **30% el segundo**. \ud83d\ude80\n\n";
    response += "**Costos de Instalación**:\n- **Sin WiFi**: $88\n- **Con WiFi 6**: $130\n*(Puedes contratar con solo el **30% de inicial**)*\n\n";

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

  // 2. PAGOS Y FACTURACIÓN (Acción directa)
  if (/(?:pago|pagar|cuenta|banco|zelle|transferencia|movil|m\u00f3vil|reportar|bcv|afiliar|tarjeta|m\u00e9todo de pago)/i.test(normalized)) {
    return "__PAYMENT_ACTION__\u00a1Claro! He habilitado el bot\u00f3n **Quiero pagar** en pantalla. Si lo pulsas, te llevar\u00e9 directamente a la sección correspondiente del portal para que puedas pagar, reportar tu pago o afiliar tu m\u00e9todo de pago, y cerraremos esta consulta como resuelta.\n\n" +
           "Recuerda que puedes gestionar todo esto f\u00e1cilmente desde tu panel de usuario. \u00bfDeseas ir ahora?";
  }

  // 3. UBICACIÓN Y OFICINAS
  if (/d[oó]nde\s*(est[áa]n?|quedan?|se\s*ubican?|est[áa]\s*la\s*oficina)|ubicacci[oó]n|ubicaci[oó]n|direcci[oó]n(\s*f[ií]sica)?|oficina\s*principal|ir\s*a\s*la\s*oficina|c[oó]mo\s*llegar|d[oó]nde\s*es/i.test(normalized)) {
    return "Nuestra oficina principal de **Sisprot Global Fiber** se ubica en:\n\n" +
           "📍 **Dirección**: Calle Mariño, C.C. Paseo Mariño, Nivel PB-09, Local PB-09, Sector Centro. Turmero, estado Aragua.\n" +
           "🕒 **Horario**: Lunes a Viernes de 8:00 AM a 5:00 PM y Sábados de 9:00 AM a 1:00 PM.\n\n" +
           "👉 [Guíame con Google Maps](https://www.google.com/maps/place/SisProt+Global+Fiber+C.A./@10.2272089,-67.4764049,687m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8e80215f0d7a8c2b:0x9f62d9148a9c508!8m2!3d10.2272036!4d-67.47383!16s%2Fg%2F11dx9w_c6r!5m1!1e1?entry=ttu)";
  }

  // 4. REDES SOCIALES
  if (/(?:redes|instagram|sociales|youtube|contacto|whatsapp|facebook)/i.test(normalized)) {
    return "¡Síguenos y mantente al día con Sisprot! 📱\n\n" +
           "📲 **[WhatsApp (Canal)](https://whatsapp.com/channel/0029Vab9DIpEFeXk23mELA2g)**\n" +
           "📷 **[Instagram](https://www.instagram.com/sisprotgf)**\n" +
           "🎵 **[TikTok](https://www.tiktok.com/@sisprotgf)**\n" +
           "📘 **[Facebook](https://www.facebook.com/sisprotgf)**\n" +
           "▶️ **[YouTube](https://youtube.com/@sisprotglobalfiber)**\n" +
           "🌐 **[Web](https://www.sisprotgf.com)**";
  }

  // 5. COBERTURA
  if (/(?:cobertura|donde\s*llegan|sectores|zona)/i.test(normalized)) {
    return "Actualmente ofrecemos el mejor servicio de Fibra \u00d3ptica en todo el **Municipio Santiago Mari\u00f1o** (Turmero, Sam\u00e1n de G\u00fcre, etc.) y zonas aleda\u00f1as. \ud83d\udccd\n\n\u00bfEn qu\u00e9 sector te encuentras para confirmarte disponibilidad exacta?";
  }

  // 6. IDENTIDAD PERSONAL Y QUÉ PUEDES HACER
  if (/qu[ée] (puedes?|eres\s*capaz\s*de)\s*hacer|en\s*qu[ée]\s*ayudas?|tus?\s*habilidades|cu[áa]les?\s*son\s*tus\s*funciones|para\s*qu[ée]\s*sirves/i.test(normalized)) {
    return "¡Hola! 👋 Como tu asistente virtual de **Sisprot**, estoy aquí para ayudarte con:\n\n" +
           "🛠️ **Soporte Técnico**: Diagnóstico de tu conexión y estado de tu equipo ONU.\n" +
           "💰 **Pagos y Facturación**: Información sobre tu deuda actual y gestión de pagos.\n" +
           "🚀 **Planes e Instalación**: Información sobre velocidades, precios y promociones de nuevos servicios.\n" +
           "📍 **Información General**: Ubicación de nuestras oficinas, redes sociales y cobertura.\n" +
           "📋 **Gestión de Tickets**: Si no puedo resolver tu duda, puedo generarte un ticket de reporte oficial.\n\n" +
           "¿En qué te gustaría que te ayude hoy? ✨";
  }

  if (/c[oó]mo\s*me\s*llamo|cu[áa]l\s*es\s*mi\s*nombre|me\s*puedes\s*decir\s*mi\s*nombre|qui[ée]n\s*soy|mi\s*identidad/i.test(normalized)) {
    if (clientData?.name) {
      return `Te llamas **${clientData.name}**.`;
    }
    return "No tengo tu nombre registrado en este momento. Si estás en el portal, pronto podré identificarte.";
  }

  if (/c[oó]mo\s*te\s*(llamas?|dicen|llaman)|cu[áa]l\s*es\s*tu\s*nombre|qui[ée]n\s*eres|eres\s*(un?\s*)?(bot|robot|ia|inteligencia\s*artificial|asistente|humana?|persona|real)|^tu\s*nombre/i.test(normalized)) {
    return "Me llamo **Susana**, soy el asistente virtual inteligente de **Sisprot Global Fiber**. Mi propósito es ayudarte a gestionar tu servicio de internet de forma rápida y sencilla.";
  }

  // 7. SALUDO Y MULTI-CONTRATO (Intercepción al final para no bloquear FAQs específicas)
  if (/^(hola|buenas?|buenos?\s*(d[ií]as?|tardes?|noches?)|hey|[ée]pale|qu[ée]\s*tal|saludos?)/i.test(normalized)) {
    const total = clientData?.totalContracts ?? 0;
    const hasSelectedContract = !!clientData?.contract;

    if (total > 1 && !hasSelectedContract && clientData) {
      return buildDetailedMulticontractGreeting(clientData);
    }

    const name = firstName(clientData);
    return name 
      ? `¡Hola ${name}! ¿En qué puedo ayudarte hoy con tu servicio de internet?`
      : "¡Hola! ¿En qué puedo ayudarte hoy con tu servicio de internet?";
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

  // CATCH-ALL MULTI-CONTRATO: Si llegamos aquí sin haber interceptado una FAQ específica 
  // y hay más de un contrato sin seleccionar, FORZAMOS la elección.
  if ((clientData?.totalContracts ?? 0) > 1 && !clientData?.contract && clientData) {
    return buildDetailedMulticontractGreeting(clientData);
  }

  return undefined;
}

export function buildNoToolFallbackResponse(clientData?: ClientContextData): string {
  return personalize("Te leo{name}. ¿En qué puedo ayudarte con tu servicio, pagos o facturas?", clientData);
}

export function buildSupportContractDisambiguationMessage(clientData?: ClientContextData): string {
  const contractsHint = buildContractList(clientData);

  if (contractsHint) {
    return `He notado que tienes varios contratos activos, \u00bfde cu\u00e1l de ellos deseas consultar informaci\u00f3n? Actualmente tienes estos servicios: ${contractsHint}. Puedes responderme con el n\u00famero de contrato o el nombre del sector.`;
  }

  return "He notado que tienes m\u00faltiples contratos asociados a tu cuenta. \u00bfSobre cu\u00e1l de ellos deseas realizar tu consulta hoy?";
}

function buildContractList(clientData?: ClientContextData): string {
  const contracts = clientData?.allContracts ?? [];
  return contracts
    .slice(0, 5)
    .map((contract) => `**#${contract.contractId}**${contract.sector ? ` en ${contract.sector}` : ""}`)
    .join(", ");
}
