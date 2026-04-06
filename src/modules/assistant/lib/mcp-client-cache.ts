
import type { ClientContextData } from "./types";


interface ClientCacheEntry {
  data: ClientContextData;
  expiresAt: Date;
  identification: string;
}


const clientDataCache = new Map<string, ClientCacheEntry>();
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

export function getClientFromCache(identification: string): ClientContextData | null {
  const entry = clientDataCache.get(identification.toUpperCase());
  if (entry && entry.expiresAt > new Date()) {
    return entry.data;
  }
  if (entry) {
    clientDataCache.delete(identification.toUpperCase());
  }
  return null;
}

export function setClientInCache(identification: string, data: ClientContextData): void {
  const entry: ClientCacheEntry = {
    data,
    expiresAt: new Date(Date.now() + CLIENT_CACHE_TTL_MS),
    identification: identification.toUpperCase(),
  };
  clientDataCache.set(identification.toUpperCase(), entry);
}

export function invalidateClientCache(identification: string): void {
  clientDataCache.delete(identification.toUpperCase());
}

export function clearAllClientCache(): void {
  clientDataCache.clear();
}


export const CACHE_INVALIDATING_TOOLS = [
  "process_payment",
  "realizar_pago",
  "change_plan",
  "cambiar_plan",
  "activate_service",
  "suspend_service",
  "reboot_onu",
] as const;

export function shouldInvalidateClientCache(toolName: string): boolean {
  return (CACHE_INVALIDATING_TOOLS as readonly string[]).includes(toolName);
}
