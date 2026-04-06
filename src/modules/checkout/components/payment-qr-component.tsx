"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { Invoice } from "@/shared/lib/api-client";
import { useQrPayment } from "@/modules/payment/hooks/use-payment-qr";

interface QRPaymentComponentProps {
  invoice: Invoice | null;
}

export function QRPaymentComponent({ invoice }: QRPaymentComponentProps) {
  const { loading, error, data, generateQr } = useQrPayment();
  const qrImageUrl = data?.data?.qr_image_url;

  useEffect(() => {
    if (invoice?.id && !qrImageUrl && !loading) {
      generateQr(invoice.id.toString());
    }
  }, [invoice?.id, qrImageUrl, loading, generateQr]);

  if (!invoice) {
    return <p className="text-center text-gray-500">No hay factura seleccionada</p>;
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 text-center">
      {loading && <p className="text-sm text-blue-500">Generando QR...</p>}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {qrImageUrl && (
        <div className="bg-white p-3 rounded-2xl shadow-sm flex justify-center">
          <Image
            src={qrImageUrl}
            alt="QR de pago"
            width={220}
            height={220}
            className="rounded-xl object-contain"
          />
        </div>
      )}

      {!loading && !qrImageUrl && !error && (
        <Button onClick={() => generateQr(invoice.id.toString())}>
          Generar QR
        </Button>
      )}
    </div>
  );
}
