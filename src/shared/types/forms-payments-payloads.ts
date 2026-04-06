export interface BasePaymentPayload {
  paymentMethod: string;
  invoiceId: number;
  date: string;
  transferredAmount: string;
  referenceNumber: string;
  accountHolder?: string;
  base64Image?: string;
  fileExtension?: string;
}

export interface NationalPaymentPayload extends BasePaymentPayload {
  selectedBank: {
    code: string;
    name: string;
  };
}

export interface ZellePaymentPayload extends BasePaymentPayload {
  accountHolder: string;
}