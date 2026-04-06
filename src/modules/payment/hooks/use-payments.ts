"use client";

import { validateAndRegisterPayment } from "@/shared/lib/api/payments";
import { useClientStore } from "@/shared/lib/store/client-store";
import type { PaymentApiData } from "@/shared/lib/store/client-store";
import { fileToBase64, getFileExtension } from "@/shared/lib/utils";
import { useState, useEffect } from "react";
import { PaymentNationalFormValues } from "@/shared/lib/validation/payments-national-schema";
import { ZelleFormValues } from "@/shared/lib/validation/zelle-schema";
import { NationalPaymentPayload, ZellePaymentPayload, BasePaymentPayload } from "@/shared/types/forms-payments-payloads";


export function usePayments() {
  const {
    receiptFile,
    selectedInvoice,
    accountHolder,
    paymentResult,
    setPaymentResult,
    isSubmitting,
    setIsSubmitting,
  } = useClientStore();
  const { setPaymentApiData } = useClientStore();

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (paymentResult.status && paymentResult.status !== null) {
      const timer = setTimeout(() => {}, 100);
      return () => clearTimeout(timer);
    }
  }, [paymentResult.status]);


  const buildPayload = async (
    data: PaymentNationalFormValues | ZelleFormValues ,
    method: string
  ): Promise<NationalPaymentPayload | ZellePaymentPayload> => {
    if (!selectedInvoice) throw new Error("No hay factura seleccionada.");

    const isFileValid = receiptFile instanceof File;
    let base64Image: string | undefined = undefined;
    let fileExtension: string | undefined = undefined;

    if (isFileValid) {
      const file = receiptFile as File;
      base64Image = await fileToBase64(file);
      fileExtension = getFileExtension(file);
    }

    const formattedAmount = Number(data.transferredAmount || "0").toFixed(2);

    const basePayload: BasePaymentPayload = {
      paymentMethod: method,
      invoiceId: selectedInvoice.id,
      date: data.date,
      transferredAmount: formattedAmount,
      referenceNumber: data.referenceNumber,
      ...(isFileValid ? { base64Image, fileExtension } : {}),
    };

    switch (method) {
      case "zelle":
        return {
          ...basePayload,
          accountHolder: (data as ZelleFormValues).sender,
        };

      case "pago-movil":
      case "transferencia": {
        const selectedBank = (data as PaymentNationalFormValues).selectedBank;
        if (!selectedBank) {
          throw new Error("No se ha seleccionado un banco válido.");
        }
        return {
          ...basePayload,
          accountHolder: accountHolder || "",
          selectedBank,
        };
      }


      default:
        throw new Error(`Método de pago no soportado: ${method}`);
    }
  };


  const sendPaymentConfirmation = async (
    data: PaymentNationalFormValues | ZelleFormValues,
    paymentMethod: string,
    onSuccess?: () => void
  ) => {
    const method = paymentMethod === "pago-qr" ? "pago-movil" : paymentMethod;
    try {
      setIsSubmitting(true);

      const payload = await buildPayload(data, method);
      // console.log("📤 Payload final:", payload);

      // return;

      const result = await validateAndRegisterPayment(payload);

      if (result.status === 201) {
        setPaymentResult({
          status: "success",
          statusCode: result.status,
          message: result.message,
        });
          // Save raw API response to store so other components (affiliation modal)
          // can read payment details and prefill data.
          setPaymentApiData((result.data ?? null) as PaymentApiData | null);
        onSuccess?.();
      }  else if (result.status === 422) {
        // Tipos seguros para la estructura de error esperada
        type ValidationInner = {
          message?: string;
          code?: string;
          invoices?: number[];
          payment_created_by?: { id: number; name: string };
          code_validate_type?: string;
        };

        const isObject = (v: unknown): v is Record<string, unknown> =>
          typeof v === "object" && v !== null;

        const asValidationInner = (v: unknown): ValidationInner | undefined => {
          if (!isObject(v)) return undefined;
          if (typeof (v as Record<string, unknown>).code_validate_type === "string" || typeof (v as Record<string, unknown>).message === "string") {
            return v as ValidationInner;
          }
          return undefined;
        };

        let codeValidateType: string | undefined = undefined;
        let messageFromData: string | undefined = undefined;

        let extractedPayload: Record<string, unknown> | undefined = undefined;

        if (isObject(result.data)) {
          const envelope = result.data as Record<string, unknown>;

          // Prefer the nested envelope: result.data.data
          if ("data" in envelope && isObject(envelope.data)) {
            const inner = envelope.data as Record<string, unknown>;
            const parsedInner = asValidationInner(inner);
            if (parsedInner) {
              codeValidateType = parsedInner.code_validate_type;
              messageFromData = parsedInner.message;
              extractedPayload = inner;
            }
          }

          // If nested code wasn't present, try top-level object
          if (!codeValidateType) {
            const parsedTop = asValidationInner(envelope);
            if (parsedTop) {
              codeValidateType = parsedTop.code_validate_type;
              messageFromData = messageFromData || parsedTop.message;
              extractedPayload = envelope;
            }
          }
        }

        // If this is the specific case of different-invoice, include invoices in the message
        if (codeValidateType === "payment_used_different_invoice") {
          // Try to read invoices array from extractedPayload
          const invoices: number[] | undefined = Array.isArray(extractedPayload?.invoices)
            ? (extractedPayload!.invoices as unknown as number[])
            : undefined;

          const invoicesText = invoices && invoices.length > 0 ? ` Facturas: ${invoices.join(", ")}` : "";

          setPaymentResult({
            status: "used_payment",
            statusCode: result.status,
            message: (messageFromData || result.message || "Pago ya utilizado") + invoicesText,
          });

          // persist the API payload so UI can read invoice ids
          if (extractedPayload) {
            setPaymentApiData(extractedPayload as PaymentApiData);
          }
        } else {
          setPaymentResult({
            status: "payment_same_invoice",
            statusCode: result.status,
            message: messageFromData || result.message,
          });
        }


      }
      
      else if ([400, 404].includes(result.status)) {
  // Clear any previous payment API data on non-success
  setPaymentApiData(null);
        setPaymentResult({
          status: "verification",
          statusCode: result.status,
          message: result.message,
        });
      } else {
  setPaymentApiData(null);
        setPaymentResult({
          status: "error",
          statusCode: result.status,
          message: result.message || "Error desconocido",
        });
      }
    } catch (error) {
      console.error("❌ Error al procesar el pago:", error);
      setPaymentResult({
        status: "error",
        statusCode: 500,
        message: error instanceof Error ? error.message : "Error de conexión",
      });
      setPaymentApiData(null);
      setSubmitError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    sendPaymentConfirmation,
    isSubmitting,
    submitError,
  };
}
