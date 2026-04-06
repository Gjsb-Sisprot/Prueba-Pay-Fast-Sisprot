"use client";

import { Button } from "@/shared/components/ui/button";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperTrigger,
} from "@/shared/components/ui/stepper";
import { ContractList } from "@/modules/contracts/components/contract-list";
import { InvoiceList } from "@/modules/invoices/components/invoice-list";
import { PaymentInfoModal } from "@/modules/payment/components/payment-info-modal";
import { PaymentResultSuccess } from "@/modules/payment/components/results/payment-result-success";
import { PaymentResultVerification } from "@/modules/payment/components/results/payment-result-verification";
import { PaymentResultError } from "@/modules/payment/components/results/payment-result-error";
import { useClientStore } from "@/shared/lib/store/client-store";
import { RotateCcw, ChevronLeft, ChevronRight, HandCoins, SquarePen } from "lucide-react";
import { Checkout } from "@/modules/checkout/components/checkout";
import { useEffect, useState } from "react";
import { StackedCardsModal } from "@/shared/components/modals/staked-cardsmodal";
import { useAnnouncement } from "@/shared/hooks/use-announcements";
import { ResponseAnnouncementItem } from "@/shared/types/announcements";
import CrudAffiliatedMethods from "@/modules/methods/components/crud-affiliated-methods/crud-affiliated-methods";
import { Status422Warning } from "@/modules/payment/components/results/status422-warning";
import { Status422Success } from "@/modules/payment/components/results/status-422-success";
import { PaymentResultVerificationDebt } from "./results/payment-result-verification-debt";
import { ClientDataUpdate } from "@/modules/contracts/components/client-data-update";

const steps = [
  { number: 1, title: "Contrato", description: "Seleccionar contrato" },
  { number: 2, title: "Nota de Cobro", description: "Seleccionar NC" },
  { number: 3, title: "Pago", description: "Procesar pago" },
  { number: 4, title: "Resultado", description: "Resultado de la transacción" },
];

export function PaymentsSteps() {
  const {
    selectedClient,
    currentStep,
    nextStep,
    prevStep,
    clearSearch,
    contractsResult,
    selectedContract,
    canProceedToPayment,
    selectedInvoice,
    selectedPaymentMethod,
    paymentStep,
    showInfoModal,
    setPaymentStep,
    setShowInfoModal,
    resetPaymentFlow,
    getSelectedInvoiceConcept,
    validationStep,
    paymentResult,
    showManagePayments, // 👈 nuevo estado
    setShowManagePayments, // 👈 setter
  } = useClientStore();

  const { getAnnouncements } = useAnnouncement();
  const [cards, setCards] = useState<ResponseAnnouncementItem[]>([]);
  const [modal, setModal] = useState(false);
  const [showDataUpdate, setShowDataUpdate] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const announcements = await getAnnouncements();
        setCards(announcements);
        if (announcements.length > 0) setModal(true);
      } catch (error) {
        console.error("Error al obtener anuncios:", error);
      }
    };
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 👇 Si está en modo "Gestionar mis pagos", mostrar CrudAffiliatedMethods
  if (showManagePayments) {
    return (
      <div className="">
        <CrudAffiliatedMethods />
      </div>
    );
  }

  if (showDataUpdate) {
    return <ClientDataUpdate onBack={() => setShowDataUpdate(false)} />;
  }

  if (!selectedClient) {
    return null;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ContractList />;
      case 2:
        return <InvoiceList />;
      case 3:
        const amount = selectedInvoice
          ? parseFloat(
              String(
                selectedInvoice.debt_with_payment_pending?.amount_bs || "0",
              ),
            ).toFixed(2)
          : "0.00";

        const dollarAmount = selectedInvoice?.debt_with_payment_pending
          ?.amount_usd
          ? selectedInvoice.debt_with_payment_pending.amount_usd.toString()
          : selectedInvoice?.amount
            ? selectedInvoice.amount
            : undefined;

        if (paymentStep === "method-selection") {
          return (
            <Checkout
              amount={amount}
              dollarAmount={dollarAmount}
              invoiceConcept={getSelectedInvoiceConcept()}
              selectedContract={selectedContract}
            />
          );
        }
        return null;
      case 4:
        if (paymentResult.status === "success") {
          return <PaymentResultSuccess message={paymentResult.message} />;
        }

        if (paymentResult.status === "verification") {
          return (
            <PaymentResultVerification
              message={paymentResult.message}
              statusCode={paymentResult.statusCode}
            />
          );
        }
        if (paymentResult.status === "verification_deb") {
          return (
            <PaymentResultVerificationDebt
              message={paymentResult.message}
              statusCode={paymentResult.statusCode}
            />
          );
        }

        if (paymentResult.status === "used_payment") {
          return <Status422Warning message={paymentResult.message} />;
        }

        if (paymentResult.status === "payment_same_invoice") {
          return <Status422Success message={paymentResult.message} />;
        }

        if (paymentResult.status === "error") {
          return (
            <PaymentResultError
              message={paymentResult.message}
              statusCode={paymentResult.statusCode}
            />
          );
        }

        return (
          <div className="text-center py-6 sm:py-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Validación de Transacción
            </h3>
            <p className="text-sm text-gray-500">
              Procesando resultado del pago...
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const canNavigateNext = () => {
    switch (currentStep) {
      case 1:
        return selectedContract !== null;
      case 2:
        return canProceedToPayment() && selectedInvoice !== null;
      case 3:
        return paymentStep === "payment-data" && selectedPaymentMethod !== null;
      default:
        return true;
    }
  };

  const handleStepChange = (direction: "next" | "prev") => {
    if (direction === "prev" && currentStep === 3) {
      resetPaymentFlow();
    }

    if (direction === "next") {
      nextStep();
    } else {
      prevStep();
    }
  };

  const showNavigation =
    (currentStep > 1 || (currentStep === 1 && selectedContract)) &&
    !(currentStep === 3 && paymentStep === "payment-data") &&
    !validationStep &&
    !(currentStep === 4 && paymentResult.status);

  return (
    <>
      <StackedCardsModal
        isOpen={modal}
        onClose={() => setModal(false)}
        cards={cards}
      />

      <div className="w-full space-y-4 sm:space-y-6 pb-20 sm:pb-0">
        {/* Información del cliente */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-2">
                  {selectedClient.name} {selectedClient.last_name}
                </h2>
                <div className="space-y-1 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 text-sm text-gray-600">
                  <p className="break-all">
                    <span className="font-bold">ID:</span>{" "}
                    {selectedClient.identification}
                  </p>
                  <p className="break-all">
                    <span className="font-bold">Email:</span>{" "}
                    {selectedClient.email}
                  </p>
                  <p className="break-all">
                    <span className="font-bold">Teléfono:</span>{" "}
                    {selectedClient.mobile}
                  </p>
                </div>
              </div>

              {/* 🔹 Botones lado a lado */}
              <div className="flex flex-col lg:flex-row gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 p-2 min-w-[140px]"
                  onClick={clearSearch}
                >
                  <RotateCcw className="-ms-1 me-2" size={14} />
                  Nueva búsqueda
                </Button>

                <Button
                  size="sm"
                  className="flex-1 p-2 bg-black text-white hover:bg-gray-600 min-w-[140px]"
                  onClick={() => setShowManagePayments(true)}
                >
                  <HandCoins className="-ms-1 me-2" size={14} />
                  Gestionar pagos automáticos
                </Button>

                <Button
                  size="sm"
                  className="flex-1 p-2 bg-blue-600 text-white hover:bg-blue-700 min-w-[140px]"
                  onClick={() => setShowDataUpdate(true)}
                >
                  <SquarePen className="-ms-1 me-2" size={14} />
                  Actualización de datos
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <Stepper
            value={currentStep}
            onValueChange={() => {}}
            className="w-full justify-between"
          >
            {steps.map((step) => (
              <StepperItem
                key={step.number}
                step={step.number}
                className="flex-1"
              >
                <StepperTrigger
                  className="w-full flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4"
                  asChild
                >
                  <div className="text-center">
                    <StepperIndicator
                      asChild
                      className={`mx-auto mb-1 sm:mb-2 ${
                        currentStep >= step.number
                          ? "bg-blue-500 text-white"
                          : "bg-gray-300 text-gray-600"
                      } h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium`}
                    >
                      <span>{step.number}</span>
                    </StepperIndicator>
                    <div className="text-xs sm:text-sm font-bold text-gray-900">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </StepperTrigger>
              </StepperItem>
            ))}
          </Stepper>

          <div className="text-center text-sm font-bold text-gray-600">
            Paso {currentStep} de {steps.length}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          {renderStepContent()}
        </div>

        {contractsResult && contractsResult.count > 0 && currentStep === 1 && (
          <div className="text-center text-sm font-bold text-gray-500">
            {contractsResult.count} contrato
            {contractsResult.count > 1 ? "s" : ""} encontrado
            {contractsResult.count > 1 ? "s" : ""}
          </div>
        )}

        <div className="hidden sm:block">
          {showNavigation && (
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => handleStepChange("prev")}
                disabled={currentStep === 1}
                size="lg"
              >
                <ChevronLeft className="-ms-1 me-2" size={16} />
                Paso anterior
              </Button>

              {currentStep < steps.length && (
                <Button
                  onClick={() => handleStepChange("next")}
                  disabled={currentStep >= steps.length || !canNavigateNext()}
                  size="lg"
                >
                  Siguiente paso
                  <ChevronRight className="ms-2 -me-1" size={16} />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer para móviles */}
        {showNavigation && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:hidden z-50 shadow-lg">
            <div className="flex gap-3 max-w-sm mx-auto">
              <Button
                variant="outline"
                onClick={() => handleStepChange("prev")}
                disabled={currentStep === 1}
                className="flex-1 h-12"
                aria-label="Ir al paso anterior"
              >
                <ChevronLeft
                  className="-ms-1 me-2"
                  size={16}
                  aria-hidden="true"
                />
                <span className="hidden xs:inline">Paso anterior</span>
                <span className="xs:hidden">Anterior</span>
              </Button>

              {currentStep < steps.length && (
                <Button
                  onClick={() => handleStepChange("next")}
                  disabled={currentStep >= steps.length || !canNavigateNext()}
                  className="flex-1 h-12"
                  aria-label="Ir al siguiente paso"
                >
                  <span className="hidden xs:inline">Siguiente paso</span>
                  <span className="xs:hidden">Siguiente</span>
                  <ChevronRight
                    className="ms-2 -me-1"
                    size={16}
                    aria-hidden="true"
                  />
                </Button>
              )}
            </div>

            {/* Indicador visual de que hay más contenido arriba */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-gray-300 rounded-full opacity-60"></div>
          </div>
        )}
      </div>

      <PaymentInfoModal
        isOpen={showInfoModal}
        onConfirm={() => {
          setShowInfoModal(false);
          setPaymentStep("payment-data");
        }}
        onClose={() => {
          setShowInfoModal(false);
          setPaymentStep("method-selection");
        }}
      />
    </>
  );
}
