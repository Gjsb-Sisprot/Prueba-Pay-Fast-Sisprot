"use client";

import { useEffect, useRef, useState } from "react";
import { OTPInput, REGEXP_ONLY_DIGITS, SlotProps } from "input-otp";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";
import { fetchContractsByClient } from "@/modules/contracts/hooks/use-contracts";
import { Pin6ConfirmationModal } from "@/modules/pin6/components/pin6-confirmation-modal";
import { LoaderCircleIcon, Send, AlertCircle, ArrowLeft } from "lucide-react";
import { InfoPin6Modal } from "@/modules/pin6/components/info-pin6-modal";
import { ChangePin6Modal } from "@/modules/pin6/components/change-pin6-modal";


interface Pin6ValidationProps {
  onValidated: () => void;
}

export function Pin6Validation({ onValidated }: Pin6ValidationProps) {
  const {
    pin6Code,
    pin6ValidationStep,
    pin6Error,
    isRequestingPin6,
    setPin6Code,
    setPin6ValidationStep,
    setPin6Error,
    setIsRequestingPin6,
    selectedClient,
    searchResult,
    setContractsResult,
    setLoadingContracts,
    setContractsError,
  } = useClientStore();

  const [value, setValue] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pin6ValidationStep === "validated") {
      closeButtonRef.current?.focus();
      onValidated();
    }
  }, [pin6ValidationStep, onValidated]);

  useEffect(() => {
    setValue(pin6Code);
  }, [pin6Code]);

  useEffect(() => {
    // Inicializar el estado de validación cuando se monta el componente
    if (pin6ValidationStep === null && selectedClient) {
      setPin6ValidationStep("pending");
    }
  }, [pin6ValidationStep, selectedClient, setPin6ValidationStep]);

  const validatePin6 = async (code: string) => {
    if (!selectedClient || !searchResult?.results?.length) {
      setPin6Error("Error: No se encontró información del cliente");
      return;
    }

    setPin6ValidationStep("validating");
    setPin6Error(null);

    // También iniciar el loading de contratos aquí
    setLoadingContracts(true);
    setContractsError(null);

    try {
      // Obtener los contratos (que incluyen el PIN6) usando la utilidad compartida
      const contractsData = await fetchContractsByClient(selectedClient.id);

      if (contractsData.results && contractsData.results.length > 0) {
        const expectedPin = contractsData.results[0].pin_code;

        if (code === expectedPin) {
          // PIN6 correcto: guardar contratos y validar
          setContractsResult(contractsData);
          setPin6ValidationStep("validated");
          setPin6Code(code);
        } else {
          setPin6ValidationStep("failed");
          setPin6Error("Código PIN6 incorrecto. Inténtalo de nuevo.");
        }
      } else {
        throw new Error("No se encontraron contratos para este cliente");
      }
    } catch (error) {
      console.error("Error validating PIN6:", error);
      setPin6ValidationStep("failed");
      setPin6Error("Error al validar el código PIN6. Inténtalo de nuevo.");
      setContractsError(
        error instanceof Error ? error.message : "Error al cargar contratos"
      );
    } finally {
      setLoadingContracts(false);
    }
  };

  const requestPin6 = async () => {
    if (!selectedClient) {
      setPin6Error("Error: No se encontró información del cliente");
      return;
    }

    setIsRequestingPin6(true);
    setPin6Error(null);

    try {
      const response = await fetch("/api/pin6/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          mobile: selectedClient.mobile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al solicitar PIN6");
      }

      await response.json();

      // Show success message
      setPin6Error(null);

      // Close the confirmation modal
      setShowConfirmModal(false);
    } catch (error) {
      console.error("Error requesting PIN6:", error);
      setPin6Error(
        error instanceof Error
          ? error.message
          : "Error al solicitar PIN6. Inténtalo de nuevo."
      );
    } finally {
      setIsRequestingPin6(false);
    }
  };

  async function onSubmit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault?.();

    if (value.length !== 6) {
      setPin6Error("El código PIN6 debe tener 6 dígitos");
      return;
    }

    inputRef.current?.select();
    await new Promise((r) => setTimeout(r, 100));

    await validatePin6(value);

    setValue("");
    setTimeout(() => {
      inputRef.current?.blur();
    }, 20);
  }

  const handleInputChange = (newValue: string) => {
    setValue(newValue);
    setPin6Code(newValue);
    // Reset error when user starts typing
    if (pin6Error) {
      setPin6Error(null);
      setPin6ValidationStep("pending");
    }
  };

  const isValidating = pin6ValidationStep === "validating";
  const isValidated = pin6ValidationStep === "validated";
  const hasFailed = pin6ValidationStep === "failed";

  const handleGoBack = () => {
    // Reset todo el estado y volver a la búsqueda inicial
    const { clearSearch } = useClientStore.getState();
    clearSearch();
  };

  return (
    <>
      <Pin6ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={requestPin6}
        mobile={selectedClient?.mobile || ""}
        email={selectedClient?.email || ""}
      />

      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full border",
              isValidated
                ? "border-green-500 bg-green-50"
                : hasFailed
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300"
            )}
            aria-hidden="true"
          >
            {isValidating ? (
              <LoaderCircleIcon className="h-5 w-5 animate-spin text-blue-600" />
            ) : isValidated ? (
              <svg
                className="h-5 w-5 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : hasFailed ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <svg
                className="stroke-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <circle cx="16" cy="16" r="12" fill="none" strokeWidth="2" />
              </svg>
            )}
          </div>

          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">
              {isValidated ? "¡Código verificado!" : "Ingresa tu código PIN6"}
            </h3>
            <p className="text-sm text-gray-600">
              {isValidated
                ? "Tu código ha sido verificado exitosamente."
                : "Ingresa el código de 6 dígitos para acceder a tu información"}
            </p>
          </div>
        </div>

        {isValidated ? (
          <div className="text-center">
            <Button
              onClick={onValidated}
              ref={closeButtonRef}
              className="w-full h-12 font-black text-base"
            >
              Continuar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={onSubmit}>
              <div className="flex justify-center mb-4">
                <OTPInput
                  id="pin6-code"
                  ref={inputRef}
                  value={value}
                  onChange={handleInputChange}
                  containerClassName="flex items-center gap-3 has-disabled:opacity-50"
                  maxLength={6}
                  disabled={isValidating}
                  render={({ slots }) => (
                    <div className="flex gap-2">
                      {slots.map((slot, idx) => (
                        <Slot key={idx} {...slot} />
                      ))}
                    </div>
                  )}
                  pattern={REGEXP_ONLY_DIGITS}
                  onComplete={onSubmit}
                />
              </div>

              {pin6Error && (
                <div
                  className="text-red-600 text-center text-sm mb-4 p-3 bg-red-50 rounded-lg border border-red-200"
                  role="alert"
                  aria-live="polite"
                >
                  {pin6Error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4" >
                  <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault(); // 🔹 Evita submit/validación
                    setShowChangePinModal(true);
                  }}
                  className="w-full h-12 font-black text-base"
                >
                  Cambiar mi PIN6
                </Button>
                <Button
                  type="submit"
                  disabled={value.length !== 6 || isValidating}
                  className="w-full h-12 font-black text-base mb-3"
                >
                  {isValidating ? (
                    <>
                      <LoaderCircleIcon
                        className="-ms-1 me-2 animate-spin"
                        size={16}
                      />
                      Verificando...
                    </>
                  ) : (
                    "Verificar código"
                  )}
                </Button>
              
              </div>
            </form>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(true)}
                disabled={isRequestingPin6}
                className="w-full h-12 font-black text-base"
              >
                {isRequestingPin6 ? (
                  <>
                    <LoaderCircleIcon
                      className="-ms-1 me-2 animate-spin"
                      size={16}
                    />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="-ms-1 me-2" size={16} />
                    Solicitar PIN6 por SMS/Email
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={handleGoBack}
                className="w-full h-12 font-black text-base text-gray-600"
              >
                <ArrowLeft className="-ms-1 me-2" size={16} />
                Consultar otra cédula
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Si no conoces tu código PIN6, solicítalo y llegará a tu teléfono
                y email registrados.
              </p>
            </div>
            <InfoPin6Modal />
            <ChangePin6Modal
              isOpen={showChangePinModal}
              onClose={() => setShowChangePinModal(false)}
            />
          </div>
        )}
      </div>
    </>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "border-input bg-background text-foreground flex size-10 items-center justify-center rounded-md border font-medium shadow-xs transition-[color,box-shadow]",
        { "border-ring ring-ring/50 z-10 ring-[3px]": props.isActive }
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
    </div>
  );
}
