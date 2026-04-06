import { create } from "zustand";
import {
  Client,
  ClientsResponse,
  Contract,
  ContractsResponse,
  Invoice,
  InvoicesResponse,
} from "@/shared/lib/api-client";

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

// Shape of the payment validation/register API response that we persist in the store
export type PaymentApiData = {
  message?: string;
  payment_flag?: boolean;
  payment_data?: {
    sender?: string | null;
    sender_affiliated?: boolean;
    method?: number;
    method_name?: string;
    [key: string]: unknown;
  } | null;
  // Some APIs return the payload wrapped under `data` (eg. { data: { payment_data, message } })
  data?: {
    message?: string;
    payment_flag?: boolean;
    payment_data?: {
      sender?: string | null;
      sender_affiliated?: boolean;
      method?: number;
      method_name?: string;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

interface ClientState {
  // Estado de la búsqueda de clientes
  searchResult: ClientsResponse | null;
  selectedClient: Client | null;
  isLoading: boolean;
  error: string | null;

  // Estado de validación PIN6
  pin6ValidationStep: "pending" | "validating" | "validated" | "failed" | null;
  pin6Code: string;
  pin6Error: string | null;
  isRequestingPin6: boolean;

  // Estado de contratos
  contractsResult: ContractsResponse | null;
  selectedContract: Contract | null;
  isLoadingContracts: boolean;
  contractsError: string | null;

  // Estado de notas de cobro (facturas)
  invoicesResult: InvoicesResponse | null;
  selectedInvoice: Invoice | null; // Cambiado de selectedInvoices (plural) a selectedInvoice (singular)
  isLoadingInvoices: boolean;
  invoicesError: string | null;

  // Estado del stepper
  currentStep: number;

  // Estado del flujo de pago (nuevo desde hoy)
  paymentStep: "method-selection" | "payment-data" | "info-modal";
  selectedPaymentMethod: PaymentMethod | null;
  showInfoModal: boolean;

  // Timing del proceso
  processStartTime: number | null;
  processDuration: number; // en segundos

  // Estado de encuesta de satisfacción
  showSurvey: boolean;

  // Estado del modal de múltiples facturas
  showMultipleInvoicesAlert: boolean;

  // Estado del flujo de validación de pago
  validationStep:
  | "reference"
  | "bank"
  | "account-holder"
  | "date"
  | "amount"
  | "confirmation"
  | "receipt"
  | null;
  referenceNumber: string;
  selectedBank: { code: string; name: string } | null; // Banco de origen (desde donde pagó el cliente)
  accountHolder: string; // Para Zelle
  paymentDate: string;
  transferredAmount: string;
  receiptFile: File | null; // Archivo del comprobante subido

  // Estado del resultado del pago
  paymentResult: {
    status: "success" | "verification" | "verification_deb" | "error" | "no_image_payment" | "payment_same_invoice" | "used_payment" | null;
    statusCode?: number;
    message?: string;
  };
  // Raw response from payment API (validate/register) when a payment succeeds.
  // This will be used to prefill affiliation modal (sender, method, etc.).
  paymentApiData: PaymentApiData | null;

  // Digital signature for contracts
  contractSignature: string | null;

  // Estado del formulario
  documentType: string;
  documentNumber: string;

  //estados para mostrar los pagos afiliados
  showManagePayments: boolean;
  setShowManagePayments: (show: boolean) => void;

  setContractSignature: (signature: string | null) => void;

  // Acciones para clientes
  setSearchResult: (result: ClientsResponse) => void;
  setSelectedClient: (client: Client | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDocumentType: (type: string) => void;
  setDocumentNumber: (number: string) => void;
  clearSearch: () => void;
  goContract: () => void;

  // Acciones para validación PIN6
  setPin6ValidationStep: (
    step: "pending" | "validating" | "validated" | "failed" | null
  ) => void;
  setPin6Code: (code: string) => void;
  setPin6Error: (error: string | null) => void;
  setIsRequestingPin6: (requesting: boolean) => void;
  resetPin6Validation: () => void;

  // Acciones para contratos
  setContractsResult: (result: ContractsResponse | null) => void;
  setSelectedContract: (contract: Contract | null) => void;
  setLoadingContracts: (loading: boolean) => void;
  setContractsError: (error: string | null) => void;

  // Acciones para notas de cobro (facturas)
  setInvoicesResult: (result: InvoicesResponse | null) => void;
  setSelectedInvoice: (invoice: Invoice | null) => void; // Cambiado de setSelectedInvoices
  setLoadingInvoices: (loading: boolean) => void;
  setInvoicesError: (error: string | null) => void;

  // Acciones para stepper
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Acciones para flujo de pago
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  setPaymentStep: (
    step: "method-selection" | "info-modal" | "payment-data"
  ) => void;
  setShowInfoModal: (show: boolean) => void;
  resetPaymentFlow: () => void;

  // Acciones para timing del proceso
  startProcess: () => void;
  endProcess: () => void;

  // Acciones para encuesta de satisfacción
  setShowSurvey: (show: boolean) => void;

  // Acciones para modal de múltiples facturas
  setShowMultipleInvoicesAlert: (show: boolean) => void;

  // Acciones para flujo de validación
  setValidationStep: (
    step:
      | "reference"
      | "bank"
      | "account-holder"
      | "date"
      | "amount"
      | "confirmation"
      | "receipt"
      | null
  ) => void;
  setReferenceNumber: (reference: string) => void;
  setSelectedBank: (bank: { code: string; name: string } | null) => void; // Banco de origen
  setAccountHolder: (holder: string) => void;
  setPaymentDate: (date: string) => void;
  setTransferredAmount: (amount: string) => void;
  setReceiptFile: (file: File | null) => void;
  setPaymentResult: (result: {
    status: "success" | "verification" | "verification_deb" | "error" | "no_image_payment" | "payment_same_invoice" | "used_payment" | null;
    statusCode?: number;
    message?: string;
  }) => void;
  setPaymentApiData: (data: PaymentApiData | null) => void;
  resetValidation: () => void;

  // Computed values
  hasClients: () => boolean;
  hasContracts: () => boolean;
  hasInvoices: () => boolean;
  isDocumentFound: () => boolean;
  canProceedToPayment: () => boolean;
  getFullIdentification: () => string;
  getAvailableInvoice: () => Invoice | null; // Nueva función para obtener la factura más próxima a vencer
  getSelectedInvoiceConcept: () => { serviceName: string; details: string };

  // Estado de envío de pago
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  // Estado inicial de clientes
  searchResult: null,
  selectedClient: null,
  isLoading: false,
  error: null,

  // Estado inicial de validación PIN6
  pin6ValidationStep: null,
  pin6Code: "",
  pin6Error: null,
  isRequestingPin6: false,

  // Estado inicial de contratos
  contractsResult: null,
  selectedContract: null,
  isLoadingContracts: false,
  contractsError: null,

  // Estado inicial de notas de cobro (facturas)
  invoicesResult: null,
  selectedInvoice: null, // Cambiado de selectedInvoices: []
  isLoadingInvoices: false,
  invoicesError: null,

  // Estado inicial del stepper
  currentStep: 1,

  // Estado inicial del flujo de pago
  selectedPaymentMethod: null,
  paymentStep: "method-selection",
  showInfoModal: false,

  // Timing del proceso
  processStartTime: null,
  processDuration: 0, // en segundos

  // Estado de encuesta de satisfacción
  showSurvey: false,

  // Estado inicial del modal de múltiples facturas
  showMultipleInvoicesAlert: false,

  // Estado inicial del flujo de validación
  validationStep: null,
  referenceNumber: "",
  selectedBank: null,
  accountHolder: "",
  paymentDate: "",
  transferredAmount: "",
  receiptFile: null,

  // Estado inicial del resultado del pago
  paymentResult: {
    status: null,
  },
  paymentApiData: null,

  contractSignature: null,

  // Estado inicial del formulario
  documentType: "V",
  documentNumber: "",

  // Estado de envío de pago
  isSubmitting: false,
  setIsSubmitting: (value: boolean) => set({ isSubmitting: value }),

  // Payment API raw data setter
  setPaymentApiData: (data) => set({ paymentApiData: data }),

  // Acciones para clientes
  setSearchResult: (result) => set({ searchResult: result, error: null }),
  setSelectedClient: (client) => set({ selectedClient: client }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setDocumentType: (type) => set({ documentType: type }),
  setDocumentNumber: (number) => set({ documentNumber: number }),
  // Función que resetea completamente todo el estado al inicio
  clearSearch: () =>
    set({
      // Reset client search
      searchResult: null,
      selectedClient: null,
      error: null,
      isLoading: false,

      // // Reset contracts
      contractsResult: null,
      selectedContract: null,
      isLoadingContracts: false,
      contractsError: null,

      // Reset invoices
      invoicesResult: null,
      selectedInvoice: null,
      isLoadingInvoices: false,
      invoicesError: null,

      // Reset payment flow
      currentStep: 1,
      selectedPaymentMethod: null,
      paymentStep: "method-selection",
      showInfoModal: false,

      // Reset validation
      validationStep: null,
      referenceNumber: "",
      selectedBank: null,
      accountHolder: "",
      paymentDate: "",
      transferredAmount: "",
      receiptFile: null,

      // Reset payment result
  paymentResult: { status: null, message: "", statusCode: 0 },
  paymentApiData: null,

      // Reset timing y encuesta
      processStartTime: null,
      processDuration: 0,
      showSurvey: false,

      // Reset multiple invoices alert
      showMultipleInvoicesAlert: false,

      // Reset estado de envío de pago
      isSubmitting: false,
    }),

  goContract: () =>
    set({

      // Reset payment flow
      currentStep: 1,
      selectedPaymentMethod: null,
      paymentStep: "method-selection",
      showInfoModal: false,

      // Reset validation
      validationStep: null,
      referenceNumber: "",
      selectedBank: null,
      accountHolder: "",
      paymentDate: "",
      transferredAmount: "",
      receiptFile: null,

      // Reset payment result
  paymentResult: { status: null, message: "", statusCode: 0 },
  paymentApiData: null,

      // Reset timing y encuesta
      processStartTime: null,
      processDuration: 0,
      showSurvey: false,

      // Reset multiple invoices alert
      showMultipleInvoicesAlert: false,

      // Reset estado de envío de pago
      isSubmitting: false,
    }),

      // 
  showManagePayments: false,
  setShowManagePayments: (show) => set({ showManagePayments: show }),

  setContractSignature: (signature) => set({ contractSignature: signature }),



  // Acciones para contratos
  setContractsResult: (result) =>
    set({ contractsResult: result, contractsError: null }),
  setSelectedContract: (contract) => set({ selectedContract: contract }),
  setLoadingContracts: (loading) => set({ isLoadingContracts: loading }),
  setContractsError: (error) =>
    set({ contractsError: error, isLoadingContracts: false }),

  // Acciones para notas de cobro (facturas)
  setInvoicesResult: (result) =>
    set({ invoicesResult: result, invoicesError: null }),
  setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }), // Cambiado de setSelectedInvoices
  setLoadingInvoices: (loading) => set({ isLoadingInvoices: loading }),
  setInvoicesError: (error) =>
    set({ invoicesError: error, isLoadingInvoices: false }),

  // Acciones para stepper
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 4) {
      set({ currentStep: currentStep + 1 });
    }
  },
  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  // Acciones para flujo de pago
  setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
  setPaymentStep: (step) => set({ paymentStep: step }),
  setShowInfoModal: (show) => set({ showInfoModal: show }),
  resetPaymentFlow: () =>
    set({
      selectedPaymentMethod: null,
      paymentStep: "method-selection",
      showInfoModal: false,
    }),

  // Acciones para timing del proceso
  startProcess: () => set({ processStartTime: Date.now() }),
  endProcess: () => {
    const startTime = get().processStartTime;
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000;
      set({ processDuration: duration });
    }
  },

  // Acciones para encuesta de satisfacción
  setShowSurvey: (show) => set({ showSurvey: show }),

  // Acciones para modal de múltiples facturas
  setShowMultipleInvoicesAlert: (show) =>
    set({ showMultipleInvoicesAlert: show }),

  // Acciones para flujo de validación
  setValidationStep: (step) => set({ validationStep: step }),
  setReferenceNumber: (reference) => set({ referenceNumber: reference }),
  setSelectedBank: (bank) => set({ selectedBank: bank }), // Simplificado - solo setea el banco de origen
  setAccountHolder: (holder) => set({ accountHolder: holder }),
  setPaymentDate: (date) => set({ paymentDate: date }),
  setTransferredAmount: (amount) => set({ transferredAmount: amount }),
  setReceiptFile: (file) => set({ receiptFile: file }),
  setPaymentResult: (result) => set({ paymentResult: result }),
  resetValidation: () =>
    set({
      validationStep: null,
      referenceNumber: "",
      selectedBank: null, // Resetear banco de origen
      accountHolder: "",
      paymentDate: "",
      transferredAmount: "",
      receiptFile: null,
      paymentResult: { status: null },
      paymentApiData: null,
    }),

  // Computed values
  hasClients: () => {
    const { searchResult } = get();
    return searchResult ? searchResult.count > 0 : false;
  },

  hasContracts: () => {
    const { contractsResult } = get();
    return contractsResult ? contractsResult.count > 0 : false;
  },

  hasInvoices: () => {
    const { invoicesResult } = get();
    return invoicesResult ? invoicesResult.count > 0 : false;
  },

  isDocumentFound: () => {
    const { searchResult } = get();
    return searchResult ? searchResult.count > 0 : false;
  },

  canProceedToPayment: () => {
    const { selectedInvoice } = get(); // Cambiado de selectedInvoices
    // Si tiene una nota de cobro seleccionada, puede proceder al pago
    return selectedInvoice !== null;
  },

  getFullIdentification: () => {
    const { documentType, documentNumber } = get();
    return `${documentType}${documentNumber}`;
  },

  // Nueva función para obtener la nota de cobro más próxima a vencer
  getAvailableInvoice: () => {
    const { invoicesResult } = get();
    if (!invoicesResult || invoicesResult.count === 0) return null;

    // Ordenar por fecha de vencimiento (más próxima primero)
    const sortedInvoices = [...invoicesResult.results].sort((a, b) => {
      const dateA = new Date(a.date_expiration);
      const dateB = new Date(b.date_expiration);
      return dateA.getTime() - dateB.getTime();
    });

    // Retornar la primera (más próxima a vencer)
    return sortedInvoices[0] || null;
  },

  // Nueva función para obtener el concepto de la factura seleccionada
  getSelectedInvoiceConcept: () => {
    const { selectedInvoice } = get();
    if (!selectedInvoice) {
      return {
        serviceName: "No especificado",
        details: "Información no disponible",
      };
    }

    if (
      selectedInvoice.invoice_items_gsoft &&
      selectedInvoice.invoice_items_gsoft.length > 0
    ) {
      const items = selectedInvoice.invoice_items_gsoft;
      if (items.length === 1) {
        return {
          serviceName: items[0].service_name,
          details: items[0].details,
        };
      } else {
        const services = items
          .map((item) => item.service_name)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
        return {
          serviceName: services.join(", "),
          details: `${items.length} servicios incluidos`,
        };
      }
    }
    return {
      serviceName: "No especificado",
      details: "Información no disponible",
    };
  },

  // Acciones para validación PIN6
  setPin6ValidationStep: (step) => set({ pin6ValidationStep: step }),
  setPin6Code: (code) => set({ pin6Code: code }),
  setPin6Error: (error) => set({ pin6Error: error }),
  setIsRequestingPin6: (requesting) => set({ isRequestingPin6: requesting }),
  resetPin6Validation: () =>
    set({
      pin6ValidationStep: null,
      pin6Code: "",
      pin6Error: null,
      isRequestingPin6: false,
    }),
}));
