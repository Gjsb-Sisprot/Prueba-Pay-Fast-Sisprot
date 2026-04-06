
import type { ClientContextData } from "./types";
import type { MCPClientType, MCPClientContract, MCPClientStatusResponse } from "./mcp-types";
import { getClientFromCache, setClientInCache } from "./mcp-client-cache";

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

    const result = await mcpClient.readResource({
      uri: `client://${identification}/status`,
    });

    if (result.contents && result.contents.length > 0) {
      const content = result.contents[0];
      if ("text" in content && typeof content.text === "string") {
        const parsed: MCPClientStatusResponse = JSON.parse(content.text);

        if (parsed.success && parsed.data?.contracts?.length) {
          const clientData = buildClientData(parsed, frontendData);

          setClientInCache(identification, clientData);

          return clientData;
        }
      }
    }

    if (frontendData) {
      return frontendData;
    }

    return null;
  } catch (error) {
    if (frontendData) {
      return frontendData;
    }
    return null;
  }
}


function buildClientData(
  parsed: MCPClientStatusResponse,
  frontendData?: ClientContextData
): ClientContextData {
  const contracts = parsed.data!.contracts;
  const summary = parsed.data!.summary;

  const totalDebt = contracts.reduce((sum, c) => sum + parseFloat(c.debt), 0);

  const activeContract = contracts.find(c => c.isActive);
  const primaryContract = activeContract || contracts[0];

  let serviceStatus: ClientContextData["serviceStatus"] = "active";
  if (summary.suspendedContracts > 0) {
    serviceStatus = summary.activeContracts > 0 ? "active" : "suspended";
  }

  return {
    identification: parsed.data!.identification.toUpperCase(),
    name: primaryContract.clientName,
    email: frontendData?.email || undefined,
    phone: frontendData?.phone || undefined,
    contract: frontendData?.contract || primaryContract.contractId.toString(),
    order: frontendData?.order || undefined,
    sector: primaryContract.sector,
    parish: frontendData?.parish || undefined,
    address: frontendData?.address || undefined,
    planName: frontendData?.planName || undefined,
    cycle: frontendData?.cycle || undefined,
    serviceStatus,
    hasDebt: summary.hasAnyDebt,
    debtAmount: totalDebt,
    onuSerial: primaryContract.onuSerial,
    totalContracts: summary.totalContracts,
    activeContracts: summary.activeContracts,
    suspendedContracts: summary.suspendedContracts,
    allContracts: buildAllContracts(contracts, frontendData),
  };
}

function buildAllContracts(
  contracts: MCPClientContract[],
  frontendData?: ClientContextData
): ClientContextData["allContracts"] {
  return contracts.map(mcpContract => {
    const frontendContract = frontendData?.allContracts?.find(
      fc => fc.contractId === mcpContract.contractId
    );

    return {
      contractId: mcpContract.contractId,
      installationOrder: frontendContract?.installationOrder,
      status: mcpContract.status,
      statusCode: mcpContract.statusCode,
      debt: parseFloat(mcpContract.debt),
      debtBs: frontendContract?.debtBs,
      hasDebt: mcpContract.hasDebt,
      sector: mcpContract.sector,
      parish: frontendContract?.parish,
      planName: frontendContract?.planName,
      address: frontendContract?.address,
      contractTag: frontendContract?.contractTag,
      nextInvoiceValidationLog: frontendContract?.nextInvoiceValidationLog,
    };
  });
}
