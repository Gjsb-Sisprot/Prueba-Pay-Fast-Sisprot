"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { AffiliationManualForm } from "./affiliation-manual-form";
import { PaymentMethod as PaymentMethodItem } from "@/shared/types/affiliated-methods";


interface PaymentAfiliationModalProps {
  open: boolean;
  onClose: () => void;
  client?: string | number;
  reloadMethods: () => void;
  editingMethod?: PaymentMethodItem;
}

export function PaymentAfiliationManualModal({ open, onClose, client, reloadMethods, editingMethod, }: PaymentAfiliationModalProps) {
  const clientId = client ? parseInt(client.toString(), 10) : 0;
  const [remoteSuccess, setRemoteSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (remoteSuccess) {
      const t = setTimeout(() => {
        onClose();
          setRemoteSuccess(null);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [remoteSuccess, onClose]);

  function handleSuccess(message: string) {
    setRemoteSuccess(message);
  }

  function handleError(message: string) {
    // Keep modal open on error; log for debugging
    console.warn("Affiliation form error:", message);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingMethod ? "Editar Método Afiliado" : "Afiliar Método de Pago"}</DialogTitle>
        </DialogHeader>

        <AffiliationManualForm onClose={onClose} clientId={clientId} editingMethod={editingMethod} reloadMethods={reloadMethods} onSuccess={handleSuccess} onError={handleError} />
      </DialogContent>
    </Dialog>
  );
}