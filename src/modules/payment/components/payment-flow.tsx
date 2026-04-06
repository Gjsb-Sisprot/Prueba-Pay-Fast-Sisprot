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
import { PaymentMethodSelection } from "@/modules/payment/components/payment-method-selection";
import { PaymentDataDisplay } from "@/modules/payment/components/payment-data-display";
import { PaymentInfoModal } from "@/modules/payment/components/payment-info-modal";
import { PaymentValidation } from "@/modules/payment/components/payment-validation";
import { PaymentResultSuccess } from "@/modules/payment/components/results/payment-result-success";
import { PaymentResultVerification } from "@/modules/payment/components/results/payment-result-verification";
import { PaymentResultError } from "@/modules/payment/components/results/payment-result-error";
import { useClientStore } from "@/shared/lib/store/client-store";
// import { clientService, CurrencyRate } from "@/shared/lib/api-client";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  // TrendingUp,
  // DollarSign,
} from "lucide-react";
// import { useState, useEffect } from "react";

const steps = [
  { number: 1, title: "Contrato", description: "Seleccionar contrato" },
  { number: 2, title: "Nota de Cobro", description: "Seleccionar NC" },
  { number: 3, title: "Pago", description: "Procesar pago" },
  { number: 4, title: "Validación", description: "Confirmar transacción" },
];

// Función para obtener la tasa del día usando el servicio interno
/* const fetchCurrencyRate = async (
  date: string
): Promise<CurrencyRate | null> => {
  try {
    const data = await clientService.getCurrencyRate(date);
    return data.results[0] || null;
  } catch (error) {
    console.error("Error fetching currency rate:", error);
    return null;
  }
}; */

// Componente para mostrar la tasa del día
/* function CurrencyRateCard() {
  const [currencyRate, setCurrencyRate] = useState<CurrencyRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrencyRate = async () => {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const rate = await fetchCurrencyRate(today);

      if (rate) {
        setCurrencyRate(rate);
      } else {
        setError("No se pudo cargar la tasa");
      }

      setLoading(false);
    };

    loadCurrencyRate();
  }, []);

  if (loading) {
    return (
      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Tasa del Día
            </h3>
            <div className="animate-pulse">
              <div className="h-4 bg-blue-200 rounded w-20 mb-1"></div>
              <div className="h-3 bg-blue-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currencyRate) {
    return (
      <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Tasa del Día
            </h3>
            <p className="text-sm text-red-600">{error || "Error al cargar"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Tasa del Día</h3>
          <div className="space-y-1">
            <p className="text-3xl font-black text-green-700">
              {parseFloat(currencyRate.amount).toFixed(2)} Bs
            </p>
            <p className="text-xs font-medium text-gray-600">
              {currencyRate.currency_name} • {currencyRate.date}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} */

export function PaymentFlow() {
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
    setSelectedPaymentMethod,
    setPaymentStep,
    setShowInfoModal,
    resetPaymentFlow,
    getSelectedInvoiceConcept,
    validationStep,
    setValidationStep,
    paymentResult,
  } = useClientStore();

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
          ? parseFloat(selectedInvoice.debt_bs || "0").toFixed(2)
          : "0.00";

        const dollarAmount = selectedInvoice?.debt
          ? selectedInvoice.debt.toString()
          : selectedInvoice?.amount
            ? selectedInvoice.amount
            : undefined;

        // Manejar el flujo interno del pago
        if (paymentStep === "method-selection") {
          return (
            <PaymentMethodSelection
              amount={amount}
              dollarAmount={dollarAmount}
              invoiceConcept={getSelectedInvoiceConcept()}
              onSelectMethod={(method) => {
                setSelectedPaymentMethod(method);
                setShowInfoModal(true);
                setPaymentStep("info-modal");
              }}
            />
          );
        }

        if (paymentStep === "payment-data" && selectedPaymentMethod) {
          // Si hay un paso de validación activo, mostrar la validación
          if (validationStep) {
            return (
              <PaymentValidation
                paymentMethod={selectedPaymentMethod.id}
                amount={amount}
                dollarAmount={dollarAmount}
              />
            );
          }

          // Mostrar los datos de pago normalmente
          return (
            <PaymentDataDisplay
              paymentMethod={selectedPaymentMethod.id}
              amount={amount}
              dollarAmount={dollarAmount}
              selectedContract={selectedContract}
              onPaymentCompleted={() => {
                // Iniciar el flujo de validación para todos los métodos de pago
                if (
                  selectedPaymentMethod.id === "transferencia" ||
                  selectedPaymentMethod.id === "pago-movil" ||
                  selectedPaymentMethod.id === "zelle"
                ) {
                  setValidationStep("reference");
                } else {
                  // Para otros métodos futuros, avanzar directamente al siguiente paso
                  nextStep();
                  resetPaymentFlow();
                }
              }}
              onGoBack={() => {
                // Regresar a la selección de métodos de pago
                setPaymentStep("method-selection");
                setSelectedPaymentMethod(null);
              }}
            />
          );
        }

        // Fallback - no debería llegar aquí
        return (
          <div className="text-center py-6 sm:py-8">
            <p className="text-sm text-gray-500">Cargando...</p>
          </div>
        );
      case 4:
        // Mostrar pantalla de resultado según el estado del pago
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

        if (paymentResult.status === "error") {
          return (
            <PaymentResultError
              message={paymentResult.message}
              statusCode={paymentResult.statusCode}
            />
          );
        }

        // Fallback si no hay resultado de pago (no debería pasar)
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
      // Si está retrocediendo desde el paso 3, resetear el flujo de pago
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
    !(currentStep === 4 && paymentResult.status); // No mostrar navegación en paso 4 con resultado

  return (
    <>
      {/* Contenido principal con padding bottom para el sticky footer en móviles */}
      <div className="w-full space-y-4 sm:space-y-6 pb-20 sm:pb-0">
        {/* Grid con información del cliente y tasa del día */}
        <div className="grid grid-cols-1 gap-4">
          {/* Información del cliente */}
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
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:self-start"
                onClick={clearSearch}
              >
                <RotateCcw
                  className="-ms-1 me-2"
                  size={14}
                  aria-hidden="true"
                />
                Nueva búsqueda
              </Button>
            </div>
          </div>

          {/* Tasa del día */}
          {/* <CurrencyRateCard /> */}
        </div>

        {/* Stepper mejorado para móviles */}
        <div className="space-y-3 sm:space-y-4">
          <Stepper value={currentStep} onValueChange={() => {}}>
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

        {/* Contenido del paso actual */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          {renderStepContent()}
        </div>

        {/* Información adicional para escritorio */}
        {contractsResult && contractsResult.count > 0 && currentStep === 1 && (
          <div className="text-center text-sm font-bold text-gray-500">
            {contractsResult.count} contrato
            {contractsResult.count > 1 ? "s" : ""} encontrado
            {contractsResult.count > 1 ? "s" : ""}
          </div>
        )}

        {/* Controles de navegación para escritorio */}
        <div className="hidden sm:block">
          {showNavigation && (
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => handleStepChange("prev")}
                disabled={currentStep === 1}
                size="lg"
              >
                <ChevronLeft
                  className="-ms-1 me-2"
                  size={16}
                  aria-hidden="true"
                />
                Paso anterior
              </Button>

              {currentStep < steps.length && (
                <Button
                  onClick={() => handleStepChange("next")}
                  disabled={currentStep >= steps.length || !canNavigateNext()}
                  size="lg"
                >
                  Siguiente paso
                  <ChevronRight
                    className="ms-2 -me-1"
                    size={16}
                    aria-hidden="true"
                  />
                </Button>
              )}
            </div>
          )}
        </div>
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

      {/* Modal informativo */}
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
