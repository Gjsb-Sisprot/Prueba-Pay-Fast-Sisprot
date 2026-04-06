import { DebitInvoice } from '../../types/debit';

export async function getOtpCode<T>(payload: DebitInvoice): Promise<T> {
  const response = await fetch("/api/debit/get-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice_id: payload.invoice_id,
      debtor_data: payload.debtor_data,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Error al generar el QR");
  }

  return result;
}

export async function validateOtp<T>(payload: DebitInvoice): Promise<T> {
  const response = await fetch("/api/debit/validate-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice_id: payload.invoice_id,
      token: payload.token,
      debtor_data: payload.debtor_data,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Error al validar el OTP");
  }

  return result;
}