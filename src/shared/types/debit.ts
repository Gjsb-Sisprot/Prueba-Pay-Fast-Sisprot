export interface DebtorData {
  DebtorBank: string;
  DebtorID: string;
  DebtorAccount: string;
  DebtorAccountType: string;
  DebtorName: string;
}

export interface DebitInvoice {
  invoice_id: number;
  token?: string;
  debtor_data: DebtorData;
}

export interface DebitApiResponse<T = unknown> {
  success: boolean;
  status: number;
  message?: string;
  data: T;
}
