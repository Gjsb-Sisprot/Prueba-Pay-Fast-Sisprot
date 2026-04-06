
export interface QrPaymentResponse {
  success: boolean;
  status: number;
  message?: string;
  data?: {
    qr_image_url?: string;
    [key: string]: string | undefined;
  };
}

export async function generateQrPayment(invoiceId: string): Promise<QrPaymentResponse> {
  const response = await fetch("/api/qr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });

  const result: QrPaymentResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Error al generar el QR");
  }

  return result;
}
