
import type { ClientContextData } from "./types";
import type { MCPClientType, MCPClientStatusResponse } from "./mcp-types";
import { getClientFromCache, setClientInCache } from "./mcp-client-cache";
import { fetchClientContracts, type SisprotContract } from "./sisprot-api";

export async function getClientFromMCP(
  mcpClient: MCPClientType,
  identification: string,
  frontendData?: ClientContextData,
  forceRefresh: boolean = false
): Promise<ClientContextData | null> {
  try {
    if (!forceRefresh) {
      const cachedData = getClientFromCache(identification);
      if (cachedData) {
        return {
          ...cachedData,
          email: frontendData?.email || cachedData.email,
          phone: frontendData?.phone || cachedData.phone,
        };
      }
    }

    const [mcpResult, sisprotResult] = await Promise.all([
      mcpClient.readResource({ uri: `client://${identification}/status` }).catch(() => null),
      fetchClientContracts(identification).catch(() => ({ contracts: [] as SisprotContract[], debugUrl: "API Fetch failed" }))
    ]);

    const directContracts = sisprotResult.contracts;
    const debugQuery = sisprotResult.debugUrl;

    if (mcpResult?.contents?.length || directContracts.length > 0) {
      let parsed: MCPClientStatusResponse | undefined;
      
      if (mcpResult?.contents?.[0] && "text" in mcpResult.contents[0]) {
        try {
          // Aseguramos el cast a string del contenido del MCP para evitar errores de tipo
          const mcpText = String(mcpResult.contents[0].text || "");
          parsed = JSON.parse(mcpText);
        } catch {
          // Ignore parsing errors
        }
      }

      const clientData = buildEnhancedClientData(parsed, directContracts, frontendData, debugQuery);
      setClientInCache(identification, clientData);
      return clientData;
    }

    if (frontendData) {
      return frontendData;
    }

    return null;
  } catch {
    if (frontendData) {
      return frontendData;
    }
    return null;
  }
}


interface UnifiedContract {
  contractId: number;
  status: string;
  isActive: boolean;
  sector: string;
  debt: string;
  onuSerial: string;
  planName: string;
}

function buildEnhancedClientData(
  parsed?: MCPClientStatusResponse,
  directContracts: SisprotContract[] = [],
  frontendData?: ClientContextData,
  debugQuery?: string
): ClientContextData {
  const mcpContracts = parsed?.data?.contracts || [];
  
  const identification = parsed?.data?.identification?.toUpperCase() || frontendData?.identification?.toUpperCase() || "";
  const name = directContracts[0]?.clientName || parsed?.data?.contracts?.[0]?.clientName || frontendData?.name || "";

  // Unificamos ambas fuentes de datos bajo la misma interfaz para evitar errores de tipo
  const unifiedContracts: UnifiedContract[] = directContracts.length > 0 
    ? directContracts.map(c => ({
        contractId: c.contractId,
        status: c.status,
        isActive: c.isActive,
        sector: c.sector,
        debt: c.debt,
        onuSerial: c.onuSerial,
        planName: c.planName
      }))
    : mcpContracts.map(c => ({
        contractId: c.contractId,
        status: c.status,
        isActive: c.isActive,
        sector: c.sector,
        debt: String(c.debt || "0"),
        onuSerial: c.onuSerial,
        planName: "" // El mcp-types no tiene planName actualmente
      }));

  const activeContract = unifiedContracts.find(c => c.isActive);
  const primaryContract = activeContract || unifiedContracts[0];

  const totalDebt = unifiedContracts.reduce((sum, c) => sum + parseFloat(String(c.debt || 0)), 0);

  return {
    identification,
    name,
    email: frontendData?.email || undefined,
    phone: frontendData?.phone || undefined,
    contract: frontendData?.contract || (unifiedContracts.length === 1 ? primaryContract?.contractId?.toString() : undefined),
    sector: primaryContract?.sector,
    serviceStatus: (activeContract ? "active" : "suspended") as "active" | "suspended" | "paused" | "cancelled" | "pending",
    hasDebt: totalDebt > 0,
    debtAmount: totalDebt,
    onuSerial: primaryContract?.onuSerial,
    totalContracts: unifiedContracts.length,
    debugQuery,
    activeContracts: unifiedContracts.filter(c => c.isActive).length,
    suspendedContracts: unifiedContracts.filter(c => !c.isActive).length,
    allContracts: unifiedContracts.map(c => ({
      contractId: c.contractId,
      status: c.status,
      hasDebt: parseFloat(c.debt) > 0,
      debt: parseFloat(c.debt),
      sector: c.sector,
      planName: c.planName,
      onuSerial: c.onuSerial
    }))
  };
}
