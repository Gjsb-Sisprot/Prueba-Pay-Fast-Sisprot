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
import { AlertTriangle } from "lucide-react";

interface PaymentInfoModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose?: () => void;
}

export function PaymentInfoModal({
  isOpen,
  onConfirm,
  onClose,
}: PaymentInfoModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && onClose) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e: Event) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="w-14 h-14 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 sm:w-6 sm:h-6 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl sm:text-xl font-black text-gray-900 px-2">
            Información Importante de Pago
          </DialogTitle>
          <DialogDescription
            asChild
            className="text-center space-y-4 pt-2 sm:pt-3"
          >
            <div className="space-y-4 sm:space-y-3 text-sm sm:text-sm text-gray-700 leading-relaxed px-2 sm:px-0">
              <p className="text-base sm:text-sm">
                <span className="font-semibold text-gray-900">
                  Los datos bancarios son únicos para cada cliente.
                </span>
              </p>
              <p className="text-sm leading-relaxed">
                Por favor, verifique cuidadosamente toda la información de pago
                antes de realizar la transferencia para garantizar un
                procesamiento exitoso y rápido de su transacción.
              </p>
              <div className="bg-blue-50 p-4 sm:p-3 rounded-lg border border-blue-200 mt-4">
                <p className="text-blue-800 font-medium text-sm sm:text-xs leading-relaxed">
                  Una verificación adecuada de los datos acelera
                  significativamente el proceso de validación de su pago.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-3 sm:pt-4">
          <Button
            onClick={onConfirm}
            className="w-full h-14 sm:h-12 font-black text-base sm:text-sm"
          >
            He leído y entiendo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
