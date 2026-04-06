"use client";

import Skeleton from "react-loading-skeleton";

// Skeleton para el estado de carga cuando se busca un cliente
export function ClientSearchSkeleton() {
  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <div className="space-y-3">
        <Skeleton height={20} width="60%" />
        <div className="space-y-2">
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="75%" />
          <Skeleton height={16} width="70%" />
          <Skeleton height={16} width="85%" />
        </div>
        <div className="pt-2">
          <Skeleton height={32} width={120} />
        </div>
      </div>
    </div>
  );
}

// Skeleton para un contrato individual
export function ContractItemSkeleton() {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-3">
          {/* Título y estado */}
          <div className="flex items-center gap-2">
            <Skeleton height={20} width="40%" />
            <Skeleton height={20} width={60} />
          </div>

          {/* Grid de información */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Skeleton height={16} width="90%" />
            <Skeleton height={16} width="85%" />
            <Skeleton height={16} width="80%" />
            <Skeleton height={16} width="95%" />
          </div>

          {/* Deuda (condicional) */}
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
            <Skeleton height={16} width="70%" />
          </div>
        </div>

        {/* Botón */}
        <div className="ml-4">
          <Skeleton height={32} width={100} />
        </div>
      </div>
    </div>
  );
}

// Skeleton para la lista completa de contratos
export function ContractListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Indicador de carga */}
      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
          </div>
          <span className="text-blue-800 text-sm font-medium">
            Cargando contratos...
          </span>
        </div>
      </div>

      {/* Lista de contratos */}
      <div className="space-y-3">
        {[...Array(1)].map((_, index) => (
          <ContractItemSkeleton key={index} />
        ))}
      </div>

      {/* Botón de continuar */}
      <div className="pt-4 border-t">
        <Skeleton height={44} width="100%" />
      </div>
    </div>
  );
}

// Skeleton para información del cliente en el header del flujo de pagos
export function ClientInfoSkeleton() {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <Skeleton height={24} width="70%" />
          <div className="space-y-1">
            <Skeleton height={16} width="60%" />
            <Skeleton height={16} width="80%" />
            <Skeleton height={16} width="65%" />
          </div>
        </div>
        <Skeleton height={32} width={120} />
      </div>
    </div>
  );
}

// Skeleton minimalista para indicar búsqueda en curso
export function SearchingSkeleton() {
  return (
    <div className="mt-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
      <div className="flex items-center justify-center space-x-3">
        <div className="flex space-x-1">
          <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
          <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
        </div>
        <span className="text-blue-800 text-sm font-medium">
          Buscando cliente...
        </span>
      </div>
    </div>
  );
}

export function InvoiceListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Indicador de carga */}
      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
          </div>
          <span className="text-blue-800 text-sm font-medium">
            Cargando notas de cobro...
          </span>
        </div>
      </div>

      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>

      {/* Invoice cards skeleton */}
      <div className="grid gap-3">
        {[1].map((index) => (
          <div
            key={index}
            className="p-3 sm:p-4 border rounded-lg border-gray-200"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Header con etiquetas */}
                <div className="flex flex-wrap items-start gap-1.5 mb-3">
                  <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>

                {/* Concepto de la factura */}
                <div className="mb-3 p-2 bg-gray-50 rounded-md">
                  <div className="flex items-start gap-2">
                    <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mt-0.5"></div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Grid info responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm mb-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                </div>

                {/* Información de deuda */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                </div>
              </div>

              {/* Radio button skeleton */}
              <div className="flex-shrink-0 mt-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje informativo skeleton */}
      <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-3">
          <div className="h-4 w-4 sm:h-5 sm:w-5 bg-yellow-200 rounded animate-pulse mt-0.5"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-yellow-200 rounded w-48 animate-pulse"></div>
            <div className="h-3 bg-yellow-200 rounded w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
