"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { FileText } from "lucide-react";

interface MultipleInvoicesAlertProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceCount: number;
}

export function MultipleInvoicesAlert({
  isOpen,
  onClose,
  invoiceCount,
}: MultipleInvoicesAlertProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e: Event) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-black text-gray-900">
            Múltiples Notas de Cobro Pendientes
          </DialogTitle>
          <DialogDescription asChild className="text-center space-y-4 pt-3">
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">
                  Su contrato tiene{" "}
                  <span className="font-black text-lg">{invoiceCount}</span>{" "}
                  notas de cobro pendientes de pago.
                </p>
              </div>

              <div className="space-y-3">
                <p>
                  <span className="font-semibold text-gray-900">
                    Política de Pagos:
                  </span>{" "}
                  Cada nota de cobro debe ser procesada de manera individual y
                  en orden secuencial por fechas de vencimiento.
                </p>

                <p>
                  Para mantener la integridad de nuestro sistema contable y
                  asegurar la correcta aplicación de sus pagos, no procesamos
                  pagos únicos que cubran múltiples períodos de facturación.
                </p>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-amber-800 font-medium text-xs">
                  <span className="font-semibold">Recomendación:</span> Procese
                  primero la nota de cobro con fecha de vencimiento más próxima.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button onClick={onClose} className="w-full h-12 font-black">
            Entiendo la política de pagos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
