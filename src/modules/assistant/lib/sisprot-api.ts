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
    const url = `${SISPROT_API_BASE}/contracts/?client_identification=${identification.toUpperCase()}&page_size=20`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": process.env.SISPROT_API_KEY || SISPROT_API_KEY,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Sisprot API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Adaptación según el formato común de APIs paginadas de Sisprot
    const results = Array.isArray(data) ? data : (data.results || []);

    return results.map((item: any) => ({
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
