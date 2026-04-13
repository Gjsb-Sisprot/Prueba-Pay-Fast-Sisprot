"use client";

import { useClientSearch } from "@/modules/client-search/hooks/use-client-search";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SelectNative } from "@/shared/components/ui/select-native";
import { SearchingSkeleton } from "@/shared/components/loading-skeletons";
import { AlertTriangle, LoaderCircleIcon, Search } from "lucide-react";
import { useState, useRef } from "react";
import {
  documentTypeValidator,
  documentNumberValidator,
} from "@/shared/lib/validation/client-schema";


export function ClientSearchForm() {
  const { form, isLoading, error, hasClients, searchResult, searchClient } =
    useClientSearch();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir múltiples envíos si ya está enviando
    if (isSubmitting) {
      return;
    }

    // Validación rápida usando las mismas funciones de validación
    const formData = form.state.values;
    const typeError = documentTypeValidator(formData.documentType);
    const numberError = documentNumberValidator(formData.documentNumber);

    if (typeError || numberError) {
      // Si hay errores de validación, usar el método normal del formulario
      form.handleSubmit();
      return;
    }

    // Activar estado de envío inmediatamente
    setIsSubmitting(true);

    // Limpiar timeout anterior si existe
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    try {
      await searchClient();
    } finally {
      // Mantener el botón deshabilitado por un mínimo de 800ms para prevenir clics múltiples
      submitTimeoutRef.current = setTimeout(() => {
        setIsSubmitting(false);
      }, 800);
    }
  };

  // Combinar ambos estados de carga para deshabilitar el botón
  const isButtonDisabled = isLoading || isSubmitting;

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <Label htmlFor="dni" className="text-sm sm:text-base">
        Introduce tu identificación
      </Label>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col mt-4 sm:flex-row gap-2 sm:gap-3 w-full">
          <div className="flex flex-row gap-2 sm:gap-3 w-full">
            {/* Selector de tipo de documento */}
            <div className="sm:w-auto">
              <form.Field
                name="documentType"
                validators={{
                  onChange: ({ value }: { value: string }) =>
                    documentTypeValidator(value),
                }}
              >
                {field => (
                  <>
                    <SelectNative
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isButtonDisabled}
                    >
                      <option value="">Seleccionar</option>
                      <option value="V">V</option>
                      <option value="E">E</option>
                      <option value="J">J</option>
                      <option value="G">G</option>
                      <option value="P">P</option>
                    </SelectNative>
                    {field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0 && (
                        <div className="text-red-600 text-xs mt-1">
                          {field.state.meta.errors[0]}
                        </div>
                      )}
                  </>
                )}
              </form.Field>
            </div>

            {/* Input del número de documento */}
            <div className="flex-1 w-full">
              <form.Field
                name="documentNumber"
                validators={{
                  onChange: ({ value }: { value: string }) =>
                    documentNumberValidator(value),
                }}
              >
                {field => (
                  <>
                    <Input
                      type="text"
                      placeholder="Número de doc (7-9 dígitos)"
                      value={field.state.value}
                      onChange={(e) => {
                        // Solo permitir números y máximo 9 caracteres
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 9);
                        field.handleChange(value);
                      }}
                      maxLength={9}
                      disabled={isButtonDisabled}
                      className="text-[16px]"
                    />
                    {field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0 && (
                        <div className="text-red-600 text-xs mt-1">
                          {field.state.meta.errors[0]}
                        </div>
                      )}
                  </>
                )}
              </form.Field>
            </div>
          </div>

          {/* Botón de búsqueda */}
          <Button
            type="submit"
            className="w-full sm:w-auto sm:px-6"
            variant="default"
            disabled={isButtonDisabled}
          >
            {isButtonDisabled ? (
              <>
                <LoaderCircleIcon
                  className="-ms-1 me-2 animate-spin"
                  size={16}
                  aria-hidden="true"
                />
                Buscando...
              </>
            ) : (
              <>
                <Search className="-ms-1 me-2" size={16} aria-hidden="true" />
                Buscar
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-4 p-4 mt-4 border-2 border-amber-400 bg-amber-50 text-amber-900 rounded-2xl mt-2 shadow-md relative z-20">
          <div className="bg-amber-200 p-2 rounded-full">
            <AlertTriangle className="w-6 h-6 text-amber-700 flex-shrink-0" />
          </div>
          <div className="flex flex-col">
            <span className="text-amber-800 font-bold uppercase text-xs tracking-wider">Mantenimiento en curso</span>
            <p className="text-sm font-semibold">
              Es posible que las transacciones de pagos con la IA experimenten retrasos, por lo que recomendamos reportar manualmente. Agradecemos su paciencia mientras mejoramos el sistema.
            </p>
          </div>
        </div>
      </form>

      {/* Mostrar errores */}
      {error && (
        <div className="text-red-600 text-sm mt-2" role="alert">
          {error}
        </div>
      )}

      {/* Mostrar skeleton durante búsqueda de cliente */}
      {isButtonDisabled && <SearchingSkeleton />}

      {/* Mostrar mensaje de éxito cuando encuentra cliente */}
      {hasClients && searchResult && !isButtonDisabled && (
        <div className="mt-4 p-4 border rounded-lg bg-green-50">
          <div className="flex items-center justify-center text-green-800">
            <div className="animate-pulse flex items-center gap-2">
              <div className="h-2 w-2 bg-green-600 rounded-full"></div>
              <span className="text-sm font-medium">
                Cliente encontrado, cargando contratos...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
