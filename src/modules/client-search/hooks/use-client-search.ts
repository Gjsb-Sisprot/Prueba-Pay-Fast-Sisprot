"use client";

import { useForm } from "@tanstack/react-form";
import {
  clientService,
} from "@/shared/lib/api-client";
import { useClientStore } from "@/shared/lib/store/client-store";
import {
  documentTypeValidator,
  documentNumberValidator,
} from "@/shared/lib/validation/client-schema";

export function useClientSearch() {
  const {
    searchResult,
    selectedClient,
    isLoading,
    error,
    documentType,
    documentNumber,
    setSearchResult,
    setSelectedClient,
    setLoading,
    setError,
    setDocumentType,
    setDocumentNumber,
    clearSearch,
    hasClients,
    isDocumentFound,

    // Nuevas propiedades para contratos
    contractsResult,
    selectedContract,
    isLoadingContracts,
    contractsError,
    hasContracts,

    // Nuevas propiedades para stepper
    currentStep,
    nextStep,
    prevStep,

    // Nuevas propiedades para PIN6
    resetPin6Validation,

    // Timing del proceso
    startProcess,
  } = useClientStore();

  // Formulario TanStack
  const form = useForm({
    defaultValues: {
      documentType: documentType || "V",
      documentNumber: documentNumber || "",
    },
  });

  const searchClient = async () => {
    const formData = form.state.values;

    // Validación con Zod
    const typeError = documentTypeValidator(formData.documentType);
    if (typeError) {
      setError(typeError);
      return;
    }

    const numberError = documentNumberValidator(formData.documentNumber);
    if (numberError) {
      setError(numberError);
      return;
    }

    // Resetear validación PIN6 cuando se inicia nueva búsqueda
    resetPin6Validation();

    // Actualizar store con los valores del formulario
    setDocumentType(formData.documentType);
    setDocumentNumber(formData.documentNumber);

    const fullIdentification = `${formData.documentType}${formData.documentNumber}`;

    // Iniciar timing del proceso
    startProcess();

    setLoading(true);
    setError(null);

    // Delay mínimo para mostrar skeleton (mejora UX)
    const startTime = Date.now();
    const minDelay = 500; // 500ms mínimo para mostrar feedback visual

    try {
      const result = await clientService.searchClient(fullIdentification);
      setSearchResult(result);

      // Si no hay resultados, mostrar mensaje apropiado y resetear loading inmediatamente
      if (result.count === 0) {
        setError("No se encontró ningún cliente con este documento");
        setLoading(false);
        return; // Salir temprano para evitar el delay en finally
      } else {
        // Automaticamente seleccionar el primer cliente
        const firstClient = result.results[0];
        setSelectedClient(firstClient);

        // No buscar contratos inmediatamente, esperar validación PIN6
        // Los contratos se buscarán después de validar el PIN6
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al buscar el cliente. Por favor intenta nuevamente.";
      setError(errorMessage);
      setLoading(false);
      return; // Salir temprano para evitar el delay en finally
    } finally {
      // Solo aplicar delay mínimo para casos de éxito
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, minDelay - elapsed);

      if (remainingDelay > 0) {
        setTimeout(() => setLoading(false), remainingDelay);
      } else {
        setLoading(false);
      }
    }
  };

  return {
    form,
    searchClient,
    isLoading,
    error,
    hasClients: hasClients(),
    isDocumentFound: isDocumentFound(),
    searchResult,
    selectedClient,
    clearSearch,

    // Nuevas propiedades para contratos
    contractsResult,
    selectedContract,
    isLoadingContracts,
    contractsError,
    hasContracts: hasContracts(),

    // Navegación
    currentStep,
    nextStep,
    prevStep,
  };
}
