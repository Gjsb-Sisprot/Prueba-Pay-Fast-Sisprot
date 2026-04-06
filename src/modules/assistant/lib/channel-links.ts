export const SISPROT_NETWORKS_QUERY = "redes sisprot";

const URL_REGEX = /https?:\/\/[^\s\\)\]"'`]+/gi;
const INSTAGRAM_HANDLE_REGEX = /(^|[^\w.])@([a-z0-9._]{3,30})\b/gi;
const PHONE_REGEX = /(?:\+58\s*)?0?4\d{2}[-\s]?\d{7}/g;
const BARE_WEB_REGEX = /\b(?:https?:\/\/)?(?:www\.)?sisprotgf\.com\/?\b/i;

function normalizeUrl(url: string): string {
  return url
    .replace(/\\\//g, "/")
    .replace(/\\+/g, "")
    .replace(/[\u0000-\u001F]+/g, "")
    .replace(/[.,;:!?]+$/g, "");
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toAbsoluteUrl(value: string): string {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function sanitizeLine(value: string): string {
  const cleaned = value
    .replace(/\\[nrt]/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+-\s*$/g, "")
    .trim();

  const urlInLine = cleaned.match(URL_REGEX)?.[0];
  if (urlInLine && /^((YouTube|Instagram|Web|WhatsApp|Portal):\s+)/i.test(cleaned)) {
    const [label] = cleaned.split(":");
    return `${label}: ${normalizeUrl(urlInLine)}`;
  }

  return cleaned;
}

function normalizeRawText(value: string): string {
  let output = value;

  for (let i = 0; i < 3; i++) {
    const next = output
      .replace(/\\\\\//g, "/")
      .replace(/\\\//g, "/")
      .replace(/\\\\r\\\\n/g, "\n")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\\\r/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\\\t/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    if (next === output) break;
    output = next;
  }

  return output;
}

function collectStringValues(raw: unknown, out: string[], depth = 0): void {
  if (depth > 8 || raw === null || raw === undefined) return;

  if (typeof raw === "string") {
    out.push(raw);
    return;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) collectStringValues(item, out, depth + 1);
    return;
  }

  if (typeof raw === "object") {
    for (const value of Object.values(raw as Record<string, unknown>)) {
      collectStringValues(value, out, depth + 1);
    }
  }
}

function parseInstagramHandle(text: string): string | undefined {
  const handles = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = INSTAGRAM_HANDLE_REGEX.exec(text)) !== null) {
    const handle = (match[2] || "").toLowerCase();
    if (!handle) continue;
    if (handle.includes(".com") || handle.includes(".net")) continue;
    handles.add(`@${handle}`);
  }

  const allHandles = Array.from(handles);
  return allHandles.find((h) => h.includes("sisprot")) || allHandles[0];
}

function parsePhones(text: string): string[] {
  const matches = text.match(PHONE_REGEX) || [];
  return dedupe(matches.map((item) => item.replace(/\s+/g, "").replace(/--+/g, "-").trim())).slice(0, 3);
}

export function extractSisprotChannelLines(raw: unknown): string[] {
  const fragments: string[] = [];
  collectStringValues(raw, fragments);

  const rawText =
    fragments.length > 0
      ? fragments.join("\n")
      : typeof raw === "string"
        ? raw
        : JSON.stringify(raw);

  const text = normalizeRawText(rawText);
  if (!text) return [];

  const urls = dedupe((text.match(URL_REGEX) || []).map(normalizeUrl).filter((url) => /^https?:\/\//i.test(url)));

  const bareWebCandidate = text.match(BARE_WEB_REGEX)?.[0] || "";
  const bareWebUrl = bareWebCandidate ? normalizeUrl(toAbsoluteUrl(bareWebCandidate)) : "";

  const youtubeChannel =
    urls.find((url) => /youtube\.com\/@/i.test(url)) ||
    urls.find((url) => /youtube\.com/i.test(url));

  const instagramUrl = urls.find((url) => /instagram\.com/i.test(url));
  const instagramHandle = parseInstagramHandle(text);
  const whatsappUrl = urls.find((url) => /wa\.me|whatsapp/i.test(url));
  const portalUrl = urls.find((url) => /portal\.sisprotgf\.com/i.test(url));
  const webUrl =
    urls.find((url) => /https?:\/\/(?:www\.)?sisprotgf\.com\/?$/i.test(url)) ||
    urls.find((url) => /sisprotgf\.com/i.test(url) && !/portal\.sisprotgf\.com/i.test(url)) ||
    (bareWebUrl && !/portal\.sisprotgf\.com/i.test(bareWebUrl) ? bareWebUrl : undefined);

  const phones = parsePhones(text);
  const lines: string[] = [];

  if (instagramHandle && instagramUrl) {
    lines.push(sanitizeLine(`Instagram: ${instagramHandle} (${instagramUrl})`));
  } else if (instagramHandle) {
    lines.push(sanitizeLine(`Instagram: ${instagramHandle}`));
  } else if (instagramUrl) {
    lines.push(sanitizeLine(`Instagram: ${instagramUrl}`));
  }

  if (youtubeChannel) {
    lines.push(sanitizeLine(`YouTube: ${youtubeChannel}`));
  }

  if (webUrl) {
    lines.push(sanitizeLine(`Web: ${webUrl}`));
  }

  if (whatsappUrl) {
    lines.push(sanitizeLine(`WhatsApp: ${whatsappUrl}`));
  }

  for (const phone of phones) {
    lines.push(sanitizeLine(`Contacto: ${phone}`));
  }

  if (portalUrl) {
    lines.push(sanitizeLine(`Portal: ${portalUrl}`));
  }

  if (lines.length === 0) {
    const fallback = dedupe([
      ...urls.slice(0, 6),
      ...(instagramHandle ? [instagramHandle] : []),
    ]);
    return fallback.map(sanitizeLine).filter(Boolean);
  }

  return dedupe(lines.map(sanitizeLine).filter(Boolean)).slice(0, 8);
}

export function buildCloseConversationMessage(channelLines: string[] = []): string {
  const header = "He cerrado la conversación según tu indicación. Gracias por contactarnos.";
  const normalizedLines = dedupe(channelLines.map(sanitizeLine).filter(Boolean));

  if (!normalizedLines.length) {
    return `${header} Antes de irte, recuerda visitar nuestras redes oficiales, canal de YouTube y WhatsApp.`;
  }

  const block = normalizedLines.slice(0, 8).map((line) => `- ${line}`).join("\n");
  return `${header}\n\nAntes de irte, aquí tienes nuestras redes y contacto oficial:\n${block}`;
}
