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
export async function fetchClientContracts(identification: string): Promise<SisprotContract[]> {
  if (!identification) return [];

  try {
    // Saneamiento: Quitamos la "V" inicial si existe, según sugerencia del usuario
    const identificationStr = identification.trim().toUpperCase();
    const cleanId = identificationStr.startsWith('V') 
      ? identificationStr.slice(1) 
      : identificationStr;

    // Construcción robusta de parámetros (idéntica a n8n)
    const params = new URLSearchParams({
      client_identification: cleanId,
      page_size: "20"
    });

    const url = `${SISPROT_API_BASE}/contracts/?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": (process.env.SISPROT_API_KEY || SISPROT_API_KEY).trim(),
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Sisprot API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Interface interna para mapear la respuesta de la API
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

    return results.map((item) => ({
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
  } catch (error) {
    console.error("Error fetching contracts from Sisprot API:", error);
    return [];
  }
}
