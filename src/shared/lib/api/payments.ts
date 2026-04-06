interface PaymentPayload {
  payment_method: string;
  sender: string | null;
  reference: string | null;
  date: string;
  invoice_id: number;
  metadata: {
    bank_origin?: string;
    amount: string;
    confirmation_code?: string;
  };
  payment_image_base64?: Array<{ [key: string]: string[] }>; // Hacer opcional
}

interface ValidatePaymentParams {
  paymentMethod: string;
  invoiceId: number;
  date: string;
  transferredAmount: string;
  referenceNumber?: string;
  selectedBank?: { code: string; name: string } | null;
  accountHolder?: string;
  base64Image?: string | null; // Hacer opcional
  fileExtension?: string | null; // Hacer opcional
}

export interface PaymentApiResponse {
  success: boolean;
  status: number;
  message?: string;
  data?: unknown;
}

export const validateAndRegisterPayment = async (
  params: ValidatePaymentParams
): Promise<PaymentApiResponse> => {
  const {
    paymentMethod,
    invoiceId,
    date,
    transferredAmount,
    referenceNumber,
    selectedBank,
    accountHolder,
    base64Image,
    fileExtension,
  } = params;

  // Estructurar el payload base sin imagen
  let payload: PaymentPayload = {
    payment_method: "transferencia", // valor por defecto
    sender: null,
    reference: null,
    date: date,
    invoice_id: invoiceId,
    metadata: {
      amount: transferredAmount || "0",
    },
  };

  // Solo agregar payment_image_base64 si hay una imagen válida
  if (
    base64Image &&
    base64Image.trim() !== "" &&
    fileExtension &&
    fileExtension.trim() !== ""
  ) {
    payload.payment_image_base64 = [
      {
        [fileExtension]: [base64Image],
      },
    ];
  }

  // Configurar según método de pago
  switch (paymentMethod) {
    case "zelle":
      payload = {
        ...payload,
        payment_method: "zelle",
        sender: accountHolder || null,
        reference: null,
        metadata: {
          confirmation_code: referenceNumber || "",
          amount: transferredAmount || "0",
        },
      };
      break;

    case "pago-movil":
      payload = {
        ...payload,
        payment_method: "pagomovil",
        sender: null,
        reference: referenceNumber || "",
        metadata: {
          bank_origin: selectedBank?.code || "",
          amount: transferredAmount || "0",
        },
      };
      break;

    case "transferencia":
    default:
      payload = {
        ...payload,
        payment_method: "transferencia",
        sender: null,
        reference: referenceNumber || "",
        metadata: {
          bank_origin: selectedBank?.code || "",
          amount: transferredAmount || "0",
        },
      };
      break;
  }

  // Enviar a la API usando ruta interna de Next.js (Zero Trust)
  const response = await fetch("/api/payments/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json().catch(() => ({}));

  // Retornar información del estado para manejo específico
  return {
    success: response.status === 201,
    status: response.status,
    message: responseData.message,
    data: responseData,
  };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remover el prefijo "data:image/jpeg;base64," etc.
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Error al convertir archivo a base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getFileExtension = (file: File): string => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  // Mapear extensiones a los formatos esperados por la API
  switch (extension) {
    case "jpeg":
      return "jpg";
    case "jpg":
      return "jpg";
    case "png":
      return "png";
    case "gif":
      return "gif";
    case "webp":
      return "webp";
    default:
      return "jpg"; // Fallback
  }
};
