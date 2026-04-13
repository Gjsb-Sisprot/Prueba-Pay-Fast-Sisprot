"use client";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useClientStore } from "@/shared/lib/store/client-store";
import { ContractListSkeleton } from "@/shared/components/loading-skeletons";
import { Check, AlertCircle, MapPin, User, File, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { ContractViewDetail } from "./contract-view-detail";
import { SignContractModal } from "./sign-contract-modal";

export function ContractList() {
  const {
    contractsResult,
    selectedContract,
    isLoadingContracts,
    contractsError,
    setSelectedContract,
    nextStep,
  } = useClientStore();

  const [view, setView] = useState<"list" | "detail">("list");
  const [showSignModal, setShowSignModal] = useState(false);
  const [activeContractId, setActiveContractId] = useState<number | null>(null);

  // Refs deben declararse antes de cualquier return para respetar reglas de hooks
  const isSelectingRef = useRef(false);
  const clickTimeoutRef = useRef<number | null>(null);

  // PRIMERO: Si está cargando, mostrar skeleton
  if (isLoadingContracts) {
    return <ContractListSkeleton />;
  }

  // SEGUNDO: Si hay error de API, mostrarlo
  if (contractsError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200">
          Error: {contractsError}
        </div>
      </div>
    );
  }

  // TERCERO: Si ya terminó de cargar y no hay contratos
  if (contractsResult && contractsResult.count === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
          Este cliente no tiene contratos asociados
        </div>
      </div>
    );
  }

  // CUARTO: Si aún no hay resultado (no debería llegar aquí si isLoadingContracts funciona bien)
  if (!contractsResult) {
    return <ContractListSkeleton />;
  }

  // Función para obtener los estilos del estado con Badge variants
  const getStatusBadge = (statusName: string, status: number) => {
    const normalizedStatus = statusName.toLowerCase().trim();

    if (normalizedStatus.includes("activo") || status === 1) {
      return {
        variant: "success" as const,
        dotColor: "bg-green-500",
        disabled: false,
      };
    }

    if (normalizedStatus.includes("suspendido")) {
      return {
        variant: "warning" as const,
        dotColor: "bg-orange-500",
        disabled: false,
      };
    }

    if (normalizedStatus.includes("cancelado")) {
      return {
        variant: "error" as const,
        dotColor: "bg-red-500",
        disabled: false, // Habilitado por petición del usuario
      };
    }

    if (
      normalizedStatus.includes("instalar") ||
      normalizedStatus.includes("por instalar")
    ) {
      return {
        variant: "info" as const,
        dotColor: "bg-blue-500",
        disabled: false,
      };
    }

    // Estado por defecto
    return {
      variant: "outline" as const,
      dotColor: "bg-gray-500",
      disabled: false,
    };
  };

  // Función para verificar si el contrato tiene deuda
  const hasDebt = (contract: (typeof contractsResult.results)[0]) => {
    const debtValue = contract.debt ? parseFloat(String(contract.debt)) : 0;
    return debtValue > 0;
  };

  // Ordenar contratos: primero los que tienen deuda, luego los que no
  const sortedContracts = [...contractsResult.results]
    .sort((a, b) => {
      const aHasDebt = hasDebt(a);
      const bHasDebt = hasDebt(b);

      // Primero los que tienen deuda
      if (aHasDebt && !bHasDebt) return -1;
      if (!aHasDebt && bHasDebt) return 1;

      // Si ambos tienen deuda o ambos no tienen, ordenar por ID
      return a.id - b.id;
    });

  const handleSelectContractSingle = (
    contract: (typeof contractsResult.results)[0],
  ) => {
    // Evitar ejecuciones rápidas consecutivas (doble click)
    if (isSelectingRef.current) return;
    const statusBadge = getStatusBadge(contract.status_name, contract.status);

    // Permitir selección de contratos cancelados si vienen del badge, 
    // pero mantener la lógica de deuda para pagos si se requiere
    if (statusBadge.disabled) {
      return;
    }

    // Bloquear nuevas selecciones hasta completar el flujo
    isSelectingRef.current = true;

    setSelectedContract(contract);
    // Avanzar automáticamente al siguiente paso después de seleccionar
    setTimeout(() => {
      nextStep();
      // Liberar el bloqueo poco después para permitir nuevas selecciones futuras
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 700);
    }, 300); // Pequeño delay para mostrar la selección visualmente
  };

  const scheduleSelectContract = (
    contract: (typeof contractsResult.results)[0],
  ) => {
    if (clickTimeoutRef.current !== null) {
      // Segundo click detectado en ventana corta: cancelar selección
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }
    clickTimeoutRef.current = window.setTimeout(() => {
      handleSelectContractSingle(contract);
      clickTimeoutRef.current = null;
    }, 250);
  };

  if (view === "detail") {
    const activeContract = sortedContracts.find(
      (c) => c.id === activeContractId,
    );
    const contractFile = activeContract?.files?.find(
      (f) => f.vame_code === "contrato",
    );

    return (
      <div className="space-y-6">
        <ContractViewDetail
          onBack={() => {
            setView("list");
            setActiveContractId(null);
          }}
          contractUrl={contractFile?.url || undefined}
          contractFile={contractFile}
          onSign={() => {
            if (activeContract) {
              setShowSignModal(true);
            }
          }}
        />

        <SignContractModal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          contract={activeContract}
        />
      </div>
    );
  }

  return (
    <div
      id="contracts-container"
      className="space-y-4 sm:space-y-6 rounded-xl transition-all duration-500 ease-in-out"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg sm:text-xl font-black text-gray-900">
          Contratos disponibles ({sortedContracts.length})
        </h3>
      </div>

      {/* Información importante sobre la selección */}
      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-blue-800 mb-1 text-sm sm:text-base">
              Información de Selección
            </h4>
            <p className="text-blue-700 text-xs sm:text-sm leading-relaxed">
              Solo puedes seleccionar contratos activos que tengan deuda
              pendiente de pago. Los contratos cancelados o sin deuda no están
              disponibles.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {sortedContracts.map((contract) => {
          const isSelected = selectedContract?.id === contract.id;
          const statusBadge = getStatusBadge(
            contract.status_name,
            contract.status,
          );
          const contractHasDebt = hasDebt(contract);
          // If next invoice has validation issues, consider it "under verification"
          const isUnderVerification =
            (contract.next_invoice_validation_log?.not_found ?? 0) > 0;
          // When under verification, hide the debt block but keep selection logic unchanged
          const contractHasDebtVisible =
            contractHasDebt && !isUnderVerification;
          const isDisabled = statusBadge.disabled; // Eliminado !contractHasDebt para permitir ver/seleccionar

          return (
            <div
              key={contract.id}
              className={`
                relative p-3 sm:p-4 border rounded-lg transition-all duration-200
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200"
                    : isDisabled
                      ? "border-gray-200 bg-white"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer"
                }
              `}
              onClick={() => scheduleSelectContract(contract)}
              onDoubleClick={(e) => e.preventDefault()}
              role={!isDisabled ? "button" : undefined}
              tabIndex={!isDisabled ? 0 : -1}
              onKeyDown={(e) => {
                if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  scheduleSelectContract(contract);
                }
              }}
              aria-label={
                !isDisabled
                  ? `Seleccionar contrato de ${contract.name} ${contract.last_name}`
                  : `Contrato de ${contract.name} ${contract.last_name} no disponible`
              }
              aria-disabled={isDisabled}
            >
              {/* Header mejorado para móviles */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-row xs:items-start xs:justify-between gap-2">
                  {/* Radio button selector mejorado */}
                  <div className="flex-shrink-0 self-start xs:self-center">
                    <div
                      className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${
                          isSelected
                            ? "bg-blue-500 border-blue-500"
                            : !isDisabled
                              ? "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                              : "border-gray-200 bg-gray-100"
                        }
                      `}
                      aria-hidden="true"
                    >
                      {isSelected ? (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-gray-900 text-base sm:text-lg">
                        {contract.name} {contract.last_name}
                      </h4>
                      {/* Badge mejorado con indicador de color */}
                      <Badge variant={statusBadge.variant} className="gap-1.5">
                        <span
                          className={`size-1.5 rounded-full ${statusBadge.dotColor}`}
                          aria-hidden="true"
                        ></span>
                        {contract.status_name}
                      </Badge>
                      {/* Badge adicional: mostrar 'Pago en verificación' si aplica, sino 'Con deuda' si corresponde */}
                      {isUnderVerification ? (
                        <Badge variant="warning" className="gap-1.5">
                          <span
                            className="size-1.5 rounded-full bg-yellow-500"
                            aria-hidden="true"
                          ></span>
                          Pago en verificación
                        </Badge>
                      ) : contractHasDebt ? (
                        <Badge
                          variant="outline"
                          className="gap-1.5 border-yellow-300 text-yellow-700"
                        >
                          <span
                            className="size-1.5 rounded-full bg-yellow-500"
                            aria-hidden="true"
                          ></span>
                          Con deuda
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Información del contrato mejorada */}
                <div className="space-y-3">
                  {/* Información básica */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-600 min-w-0">
                        Identificación:
                      </span>
                      <span className="text-gray-800 break-all">
                        {contract.identification || "No disponible"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-600 min-w-0">
                        Contrato:
                      </span>
                      <span className="text-gray-800 break-all">
                        {contract.id || "No disponible"}
                      </span>
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-600 min-w-0">
                          Dirección:
                        </span>
                      </div>
                      <span className="text-gray-800 break-words pl-6 sm:pl-0">
                        {contract.address_tax || "No disponible"}
                      </span>
                    </div>
                    {/* <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-600 min-w-0">
                        Parroquia:
                      </span>
                      <span className="text-gray-800 break-words">
                        {contract.parish_name || "No disponible"}
                      </span>
                    </div> */}
                  </div>
                </div>

                {/* Información de deuda solo si existe y no está en verificación */}
                {contractHasDebtVisible ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-yellow-800">
                          <span className="font-medium">Deuda pendiente:</span>{" "}
                          <span className="font-bold">
                            Bs.{" "}
                            {parseFloat(
                              String(contract.debt_bs) || "0",
                            ).toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Mensaje para contratos no disponibles */}
                {isDisabled ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">
                        {statusBadge.disabled
                          ? "Este contrato no está disponible para selección"
                          : "Solo se pueden seleccionar contratos con deuda pendiente"}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Botón de selección mejorado */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-5 border-t border-gray-100">
                  {contract.files?.find((f) => f.vame_code === "contrato") && (
                    <Button
                      size="lg"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveContractId(contract.id);
                        setView("detail");
                      }}
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Ver Contrato
                    </Button>
                  )}
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="lg"
                    disabled={isDisabled}
                    className={` flex-1 rounded-xl font-bold transition-all
                      ${isDisabled ? "opacity-40 cursor-not-allowed" : "shadow-lg"}
                      ${isSelected ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100" : "border-blue-200 text-blue-700 hover:bg-blue-50"}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      scheduleSelectContract(contract);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check
                          className="-ms-1 me-2"
                          size={18}
                          aria-hidden="true"
                        />
                        Seleccionado
                      </>
                    ) : isDisabled ? (
                      "No disponible"
                    ) : (
                      "Seleccionar"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SignContractModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
      />
    </div>
  );
}
