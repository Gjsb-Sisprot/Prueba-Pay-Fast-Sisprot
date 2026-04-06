import axios from "axios";

// Cliente API configurado para usar rutas internas de Next.js (Zero Trust)
export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Tipos para la respuesta de la API
export interface Client {
  id: number;
  name: string;
  last_name: string;
  identification: string;
  mobile: string;
  email: string;
}

export interface ClientsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Client[];
}

export interface BankAssociated {
  nro_cta: string;
  rlf: string;
  bank_name: string;
  bank_code: string;
  identification: string;
}

export interface ContractFile {
  id: number;
  url: string;
  is_signed: boolean;
  vame_code: string;
  created_at: string;
  accept_conditions_and_terms: boolean | null;
}

export interface Contract {
  id: number;
  client_id: number;
  name: string;
  last_name: string;
  identification: string;
  installation_order: string;
  mobile: string;
  email: string;
  pin_code: string;
  plan_id?: number;
  plan_name?: string;
  status: number;
  cycle: number;
  migrate: boolean;
  contract_detail_id?: number;
  status_name: string;
  address_tax: string;
  debt: number | string;
  debt_bs: number | string;
  bank_associated: BankAssociated;
  sector_name: string;
  parish_name: string;
  retaining_client: boolean;
  // Validation log for the next invoice (used to decide verification/blocking)
  next_invoice_validation_log?: {
    not_found: number;
    used: number;
    error: number;
    payment: number;
    definitely_not_found: number;
  };
  files?: ContractFile[];
}

export interface ContractsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Contract[];
}

export interface InvoiceItem {
  id: number;
  details: string;
  amount: string;
  amount_bs: string;
  sum: number;
  invoice: number;
  service: number;
  service_name: string;
}

export interface Invoice {
  id: number;
  dollar_date: string;
  dollar_rate: string;
  date_emission: string;
  date_expiration: string;
  date_payment: string;
  sub_total: string;
  iva_amount: string;
  amount: string;
  charged: string;
  charged_bs: string;
  amount_bs: string;
  month: number;
  year: number;
  debt: string;
  debt_bs: string;
  client_name: string;
  contract: number;
  status: number;
  status_name: string;
  payment_available: string;
  invoice_items_gsoft: InvoiceItem[];
  // Additional optional fields that appear in some responses
  client?: number;
  created_by?: number | null;
  created_at?: string | null;
  id_tfhk?: number | null;
  nro_control?: string | null;
  contract_migrate?: boolean;
  observation?: string | null;
  url?: string | null;
  payment_validation_log?: {
    not_found: number;
    used: number;
    error: number;
    payment: number;
    definitely_not_found: number;
  };
  // Información de deuda pendiente asociada a pagos en proceso
  debt_with_payment_pending?: {
    amount_bs: number;
    amount_usd: number;
  };
  has_active_agreement?: boolean; // Indica si el contrato asociado tiene un acuerdo de pago activo
  agreement_expiration_at?: string | null; // Fecha de vencimiento del convenio (ISO o YYYY-MM-DD)
  tag: string; // Campo adicional para etiquetar facturas en la interfaz
  // Información sobre débitos inmediatos asociados a la factura (si existe)
  debit_inmediate_payment_info?: Array<{
    id: number;
    invoice_id: number;
    status: string;
    amount_bs: number;
    bank_id: number;
    detail: string | null;
    reference: string | null;
    response_info?: {
      Reference?: string;
      OperationType?: string;
      SubOperationType?: string;
      Status?: string;
      Code?: string;
      RejectDescription?: string;
      [key: string]: unknown;
    };
    created_at?: string;
    updated_at?: string;
  }>;
  
}

export interface InvoicesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invoice[];
}

export interface CurrencyRate {
  id: number;
  amount: string;
  currency: number;
  currency_name: string;
  date: string;
  migrate: boolean;
  status: boolean;
}

export interface CurrencyRateResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CurrencyRate[];
}

// Servicio para buscar clientes usando rutas API internas (Zero Trust)
export const clientService = {
  searchClient: async (identification: string): Promise<ClientsResponse> => {
    const response = await apiClient.get<ClientsResponse>("/clients", {
      params: { search: identification },
    });
    return response.data;
  },

  getContracts: async (clientId: number): Promise<ContractsResponse> => {
    const response = await apiClient.get<ContractsResponse>("/contracts", {
      params: { client: clientId },
    });

    // Filtrar contratos cancelados (status 34) y mantener solo los contratos con IDs específicos (16, 19, 18)
    const allowedStatuses = [16, 19, 18]; // IDs de estados permitidos
    const filteredResults = response.data.results.filter(
      (contract) =>
        contract.status !== 34 && allowedStatuses.includes(contract.status)
    );

    return {
      ...response.data,
      count: filteredResults.length,
      results: filteredResults,
    };
  },

  getInvoices: async (contractId: number): Promise<InvoicesResponse> => {
    const response = await apiClient.get<InvoicesResponse>("/invoices", {
      params: {
        contract: contractId,
        status: 23,
      },
    });
    return response.data;
  },

  getCurrencyRate: async (date: string): Promise<CurrencyRateResponse> => {
    const response = await apiClient.get<CurrencyRateResponse>(
      "/currency-rate",
      {
        params: { date },
      }
    );
    return response.data;
  },
};
