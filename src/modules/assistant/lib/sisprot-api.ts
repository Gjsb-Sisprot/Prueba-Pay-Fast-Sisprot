const SISPROT_API_KEY = "v7R2mK9pXqWjL5bZ1nT8sH4dC6fV3gY0xm9aB2iE7uN1oP4rS5";
const SISPROT_API_BASE = "https://api.sisprotgf.com/api/public";

export interface SisprotContract {
  id: number;
  contractId: number;
  clientName: string;
  clientIdentification: string;
  status: string;
  statusCode: string;
  planName: string;
  sector: string;
  address: string;
  onuSerial: string;
  debt: string;
  isActive: boolean;
}

/**
 * Consulta los contratos de un cliente directamente a la API de Sisprot.
 */
export async function fetchClientContracts(identification: string): Promise<{ contracts: SisprotContract[], debugUrl: string }> {
  if (!identification) return { contracts: [], debugUrl: "No identification provided" };

  const identificationStr = identification.trim().toUpperCase();
  const rawId = identificationStr.replace(/^V[-.]?/, '');
  const withV = `V${rawId}`;
  const withoutV = rawId;

  // Intentamos primero con la identificación tal cual llegó
  let { contracts, debugUrl } = await executeFetch(identificationStr);
  
  // Si no encontró nada y tenía una 'V', intentamos sin 'V'
  if (contracts.length === 0 && identificationStr.startsWith('V')) {
    console.log(`[SISPROT_API] Re-intentando sin 'V' para: ${withoutV}`);
    const secondTry = await executeFetch(withoutV);
    if (secondTry.contracts.length > 0) {
      contracts = secondTry.contracts;
      debugUrl = `${secondTry.debugUrl} (Found on 2nd try without V)`;
    }
  } 
  // Si no encontró nada y NO tenía 'V', intentamos con 'V'
  else if (contracts.length === 0 && !identificationStr.startsWith('V')) {
     console.log(`[SISPROT_API] Re-intentando con 'V' para: ${withV}`);
     const secondTry = await executeFetch(withV);
     if (secondTry.contracts.length > 0) {
       contracts = secondTry.contracts;
       debugUrl = `${secondTry.debugUrl} (Found on 2nd try with V)`;
     }
  }

  return { contracts, debugUrl };
}

async function executeFetch(id: string): Promise<{ contracts: SisprotContract[], debugUrl: string }> {
  const params = new URLSearchParams({
    client_identification: id,
    page_size: "20"
  });

  const url = `${SISPROT_API_BASE}/contracts/?${params.toString()}`;
  const debugUrl = `${url}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": (process.env.SISPROT_API_KEY || SISPROT_API_KEY).trim(),
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return { contracts: [], debugUrl: `${debugUrl} (Error ${response.status})` };
    }

    const data = await response.json();
    
    interface RawSisprotContract {
      id: number;
      contract_id?: number;
      client_name: string;
      client_identification: string;
      status: string;
      status_code: string;
      plan_name: string;
      sector: string;
      address: string;
      onu_serial: string;
      debt?: string | number;
      is_active?: boolean;
    }

    const results = (Array.isArray(data) ? data : (data.results || [])) as RawSisprotContract[];

    const contracts = results.map((item) => ({
      id: item.id,
      contractId: item.contract_id || item.id,
      clientName: item.client_name,
      clientIdentification: item.client_identification,
      status: item.status,
      statusCode: item.status_code,
      planName: item.plan_name,
      sector: item.sector,
      address: item.address,
      onuSerial: item.onu_serial,
      debt: item.debt?.toString() || "0",
      isActive: item.status_code === 'active' || item.status === 'activo' || !!item.is_active
    }));

    return { contracts, debugUrl: `${debugUrl} (${contracts.length} encontrados)` };
  } catch (error) {
    return { contracts: [], debugUrl: `${debugUrl} (Exception: ${error instanceof Error ? error.message : 'Unknown'})` };
  }
}
