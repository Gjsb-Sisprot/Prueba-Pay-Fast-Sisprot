"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Contract } from "@/shared/lib/api-client";
import { PaymentMethod } from "@/shared/types/payments-methos";
import { CheckCircle, LoaderCircleIcon, Sparkles, Edit, XCircle, X } from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PaymentNationalFormValues,
  paymentNationalSchema,
} from "@/shared/lib/validation/payments-national-schema";
import { PaymentNationalForm } from "./payment-methods/forms/validate-payments-nationals";
import { PaymentZelleForm } from "./payment-methods/forms/validate-zelle";
import { useClientStore } from "@/shared/lib/store/client-store";
import { ZelleFormValues, zelleSchema } from "@/shared/lib/validation/zelle-schema";
// Removed Debito Inmediato from this modal; it is now handled inline in PaymentValidate
import { PaymentAIForm } from "./payment-methods/forms/payment-ai-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { usePaymentFormStore } from "@/shared/lib/store/payment-form-store";
import { useEffect, useRef } from "react";

type FormValues = PaymentNationalFormValues | ZelleFormValues;

interface PaymentConfirmModalProps {
  open: boolean;
  onClose: () => void;
  amount: string;
  dollarAmount?: string;
  selectedContract: Contract | null;
  method: PaymentMethod;
  onSubmit: (data: FormValues) => void;
}

export function PaymentConfirmModal({
  open,
  onClose,
  method,
  onSubmit,
  amount,
  dollarAmount,

}: PaymentConfirmModalProps) {
  const { isSubmitting, setSelectedPaymentMethod, paymentResult, setPaymentResult, nextStep } = useClientStore();
  const { setFormValues } = usePaymentFormStore();
  const hasAdvancedRef = useRef(false);

  const formNational = useForm<PaymentNationalFormValues>({
    resolver: zodResolver(paymentNationalSchema),
  });

  const formZelle = useForm<ZelleFormValues>({
    resolver: zodResolver(zelleSchema),
  });

  // Debito Inmediato form removed from modal

  const formToUse:
    | UseFormReturn<PaymentNationalFormValues>
    | UseFormReturn<ZelleFormValues> =
    method.id === "zelle" ? formZelle : formNational;

  // Efecto para cerrar el modal y avanzar al paso 4 cuando el pago es exitoso o está en verificación
  useEffect(() => {
    // Solo procesar si el modal está abierto y hay un resultado válido
    if (
      open &&
      !hasAdvancedRef.current &&
      (paymentResult.status === "success" || 
       paymentResult.status === "verification" ||
       paymentResult.status === "used_payment" ||
       paymentResult.status === "payment_same_invoice")
    ) {
      hasAdvancedRef.current = true;
      // Cerrar el modal y avanzar al paso 4
      const timer = setTimeout(() => {
        onClose();
        nextStep();
      }, 100);
      return () => clearTimeout(timer);
    }
    // Reset ref cuando el modal se cierra
    if (!open) {
      hasAdvancedRef.current = false;
    }
  }, [paymentResult.status, open, onClose, nextStep]);

  // Determinar si hay un error de la API para mostrar
  // Excluir verification ya que eso avanza al paso 4
  const hasApiError =
    paymentResult.status &&
    paymentResult.status !== "success" &&
    paymentResult.status !== "verification" &&
    paymentResult.status !== "used_payment" &&
    paymentResult.status !== "payment_same_invoice" &&
    paymentResult.message;

  // Limpiar error cuando el modal se cierra
  const handleClose = () => {
    if (hasApiError) {
      setPaymentResult({ status: null, message: "", statusCode: 0 });
    }
    onClose();
  };

  // Limpiar error de API manualmente
  const clearApiError = () => {
    setPaymentResult({ status: null, message: "", statusCode: 0 });
  };

  const submitHandler = formToUse.handleSubmit((data: FormValues) => {
    setFormValues(data);
    setSelectedPaymentMethod(method);
    onSubmit(data);
  });

  // Handler para el formulario con IA (pagos nacionales)
  const handleAISubmit = (data: PaymentNationalFormValues) => {
    setSelectedPaymentMethod(method);
    onSubmit(data);
  };



  // Si es Zelle, solo mostrar el formulario manual (sin tabs)
  if (method.id === "zelle") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              Reporta tu pago {method.name}
            </DialogTitle>
          </DialogHeader>

          <DialogDescription className="text-center text-gray-600">
            Verifica los datos antes de confirmar tu pago.
          </DialogDescription>

          {/* Error de la API de validación */}
          {hasApiError && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg relative">
              <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-amber-800">
                <p className="font-semibold mb-1">Pago no encontrado</p>
                <p className="text-xs leading-relaxed">{paymentResult.message}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearApiError}
                className="p-1 h-auto text-amber-800 hover:bg-transparent"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <form onSubmit={submitHandler} className="space-y-4 mt-4">
            <PaymentZelleForm form={formZelle} amount={dollarAmount} />
          </form>

          <DialogFooter className="mt-2 flex flex-row sm:justify-end mb-6 gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="sm:w-auto w-full"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitHandler}
              type="submit"
              className="sm:w-auto w-full font-bold flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircleIcon className="animate-spin" size={16} />
                  Validando Pago...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Reportar pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Para pagos nacionales (pago-movil, transferencia, pago-qr), mostrar tabs con IA y Manual
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-gray-900">
            Reporta tu {method.name} de forma
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="ai" className="mt-4">
          <TabsList className="grid grid-cols-2 bg-gray-100 rounded-full p-2 gap-1">
            <TabsTrigger
              value="ai"
              className="rounded-full text-md font-semibold flex items-center justify-center gap-2 py-2 data-[state=active]:bg-black data-[state=active]:text-white"
            >
              <Sparkles className="w-4 h-4" />
              Con IA
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="rounded-full text-md font-semibold flex items-center justify-center gap-2 py-2 data-[state=active]:bg-black data-[state=active]:text-white"
            >
              <Edit className="w-4 h-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* Con IA */}
          <TabsContent value="ai" className="mt-6">
            <PaymentAIForm
              form={formNational}
              onClose={handleClose}
              onSubmitPayment={handleAISubmit}
            />
          </TabsContent>

          {/* Manual */}
          <TabsContent value="manual" className="mt-2">
            <DialogDescription className="text-center text-gray-600">
              Verifica los datos antes de confirmar tu pago.
            </DialogDescription>

            {/* Error de la API de validación */}
            {hasApiError && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg relative mt-4">
                <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Pago no encontrado</p>
                  <p className="text-xs leading-relaxed">{paymentResult.message}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearApiError}
                  className="p-1 h-auto text-amber-800 hover:bg-transparent"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <form onSubmit={submitHandler} className="space-y-4 mt-4">
              <PaymentNationalForm form={formNational} amount={amount}/>
            </form>

            <DialogFooter className="mt-2 flex flex-row sm:justify-end mb-6 gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="sm:w-auto w-full"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={submitHandler}
                type="submit"
                className="sm:w-auto w-full font-bold flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" size={16} />
                    Validando Pago...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Reportar pago
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
