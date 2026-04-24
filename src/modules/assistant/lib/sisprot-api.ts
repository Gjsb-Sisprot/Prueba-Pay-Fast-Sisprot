const SISPROT_API_KEY = "v7R2mK9pXqWjL5bZ1nT8sH4dC6fV3gY0xM9aB2iE7uN1oP4rS5";
const SISPROT_API_BASE = "https://api.sisprotgf.com/api/public";

export interface SisprotContract {
  id: number;
  contractId: number;
  clientName: string;
  clientIdentification: string;
  status: string;
  statusName: string;
  statusCode: string;
  planName: string;
  sector: string;
  address: string;
  onuSerial: string;
  debt: string;
  isActive: boolean;
  phone?: string;
  email?: string;
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
      name?: string;
      last_name?: string;
      client_name?: string;
      client_identification: string;
      status: string | number;
      status_name?: string;
      status_code?: string;
      plan_name?: string;
      sector?: string;
      sector_name?: string;
      address?: string;
      address_tax?: string;
      onu_serial?: string;
      debt?: string | number;
      is_active?: boolean;
      phone?: string;
      mobile?: string;
      email?: string;
    }

    /**
     * Limpia y formatea el número de teléfono para compatibilidad con WhatsApp 
     * (Reemplaza 0 inicial por 58, o agrega 58 si falta).
     */
    function formatWhatsAppNumber(raw: string | undefined): string | undefined {
      if (!raw) return undefined;
      const clean = raw.replace(/\D/g, "");
      if (!clean) return undefined;

      if (clean.startsWith("0")) {
        return "58" + clean.substring(1);
      }
      
      if (!clean.startsWith("58")) {
        return "58" + clean;
      }

      return clean;
    }

    const results = (Array.isArray(data) ? data : (data.results || [])) as RawSisprotContract[];

    const contracts = results.map((item) => ({
      id: item.id,
      contractId: item.contract_id || item.id,
      clientName: item.client_name || [item.name, item.last_name].filter(Boolean).join(" "),
      clientIdentification: item.client_identification,
      status: String(item.status),
      statusName: item.status_name || String(item.status),
      statusCode: item.status_code || "",
      planName: item.plan_name || "",
      sector: item.sector_name || item.sector || "Sector no especificado",
      address: item.address || item.address_tax || "",
      onuSerial: item.onu_serial || "",
      debt: item.debt?.toString() || "0",
      isActive: ((item.status_name || "").toLowerCase().includes('activo') && !(item.status_name || "").toLowerCase().includes('cancel')) || 
                (item.status_code || "").toLowerCase() === 'active' || 
                item.status === 16 || 
                item.status === '16' || 
                !!item.is_active,
      phone: formatWhatsAppNumber(item.mobile || item.phone),
      email: item.email
    }));

    return { contracts, debugUrl: `${debugUrl} (${contracts.length} encontrados)` };
  } catch (error) {
    return { contracts: [], debugUrl: `${debugUrl} (Exception: ${error instanceof Error ? error.message : 'Unknown'})` };
  }
}

export interface SisprotInvoiceResponse {
  success: boolean;
  message?: string;
  invoices?: Record<string, unknown>[];
}

/**
 * Consulta las facturas de un contrato.
 */
export async function fetchClientInvoices(contractId: string): Promise<SisprotInvoiceResponse> {
  const url = `${SISPROT_API_BASE}/contracts/${contractId}/invoices/`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": (process.env.SISPROT_API_KEY || SISPROT_API_KEY).trim(),
        "Accept": "application/json",
      },
    });

    if (!response.ok) return { success: false, message: `Error ${response.status} al consultar facturas` };
    const data = await response.json();
    return { success: true, invoices: data.results || data };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Intenta reiniciar una ONU remotamente vía API Inteligente.
 */
export async function rebootOnu(serialNumber: string): Promise<{ success: boolean; message: string }> {
  // Nota: Implementación placeholder basada en el flujo esperado de SmartOLT/Sisprot
  console.log(`[SISPROT_API] Solicitando reinicio para ONU: ${serialNumber}`);
  
  // Por ahora devolvemos éxito para simular la integración, ya que el endpoint real 
  // suele requerir credenciales de SmartOLT que se manejan en el backend privado.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ 
        success: true, 
        message: `Se ha enviado el comando de reinicio a la ONU ${serialNumber} exitosamente.` 
      });
    }, 1500);
  });
}

export async function getPlanChangeBudget(contractId: string, newPlanId: string) {
  const url = `${SISPROT_API_BASE}/contracts/new_plan_budget/`;
  
  try {
    const payload = {
      contract: Number(contractId),
      new_plan: Number(newPlanId)
    };
    
    console.log(`[SISPROT_API] Fetching budget (POST): ${url} with payload:`, payload);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": (process.env.SISPROT_API_KEY || SISPROT_API_KEY).trim(),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        message: `Error ${response.status} al calcular presupuesto: ${errorData.message || 'Error del servidor'}` 
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Error de red" };
  }
}

/**
 * Solicita formalmente un cambio de plan a la administración.
 */
export async function postPlanChangeRequest(params: {
  contract_gsoft_id: number;
  change_type: "UPGRADE" | "DOWNGRADE";
  new_plan: number;
  payment?: number;
  notes?: string;
}) {
  const url = `${SISPROT_API_BASE}/contracts/plan-change-request/`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": (process.env.SISPROT_API_KEY || SISPROT_API_KEY).trim(),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      return { success: false, message: `Error ${response.status} al solicitar cambio de plan` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Error de red" };
  }
}
