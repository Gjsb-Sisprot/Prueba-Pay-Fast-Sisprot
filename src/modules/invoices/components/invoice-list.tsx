"use client";

import { useEffect, useCallback, useState } from "react";
import { useClientStore } from "@/shared/lib/store/client-store";
import { clientService } from "@/shared/lib/api-client";
import { Button } from "@/shared/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { InvoiceListSkeleton } from "@/shared/components/loading-skeletons";
import { MultipleInvoicesAlert } from "@/modules/invoices/components/multiple-invoices-alert";
import { ImagePreviewModal } from "@/shared/components/modals/image-preview-modal";
import VerificationPaymentsModal from "./verification-payments-modal";
import InvoiceCard from "./invoice-card";

export function InvoiceList() {
  const {
    selectedContract,
    invoicesResult,
    selectedInvoice,
    isLoadingInvoices,
    invoicesError,
    setInvoicesResult,
    setSelectedInvoice,
    setLoadingInvoices,
    setInvoicesError,
    canProceedToPayment,
    getAvailableInvoice,
    showMultipleInvoicesAlert,
    setShowMultipleInvoicesAlert,
  } = useClientStore();
      const bankCode = selectedContract?.bank_associated?.bank_code;
  const [modalInvoiceId, setModalInvoiceId] = useState<number | null>(null);
  const [modalInvoiceTag, setModalInvoiceTag] = useState<string | null>(null);


  const loadInvoices = useCallback(async () => {
    if (!selectedContract) return;

    setLoadingInvoices(true);
    setInvoicesError(null);

    try {
      // Crear promesas para la API y delay mínimo para mostrar skeleton
      const apiPromise = clientService.getInvoices(selectedContract.id);
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 600)); // Delay mínimo de 600ms

      // Esperar ambas promesas
      const [result] = await Promise.all([apiPromise, delayPromise]);

      setInvoicesResult(result);

      // Mostrar alerta si hay múltiples facturas
      if (result.count > 1) {
        setShowMultipleInvoicesAlert(true);
      }

      // Auto-seleccionar la nota de cobro más próxima a vencer si existe
      if (result.count > 0) {
        const availableInvoice = getAvailableInvoice();
        if (availableInvoice) {
          setSelectedInvoice(availableInvoice);
        }
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
      setInvoicesError("Error al cargar las notas de cobro");
    } finally {
      setLoadingInvoices(false);
    }
  }, [
    selectedContract,
    setLoadingInvoices,
    setInvoicesError,
    setInvoicesResult,
    setSelectedInvoice,
    getAvailableInvoice,
    setShowMultipleInvoicesAlert,
  ]);

  useEffect(() => {
    if (selectedContract) {
      // LIMPIAR inmediatamente el estado anterior cuando cambia el contrato
      // Esto asegura que se muestre el skeleton inmediatamente
      setInvoicesResult(null);
      setSelectedInvoice(null);
      setInvoicesError(null);

      // Cargar las nuevas facturas
      loadInvoices();
    }
  }, [
    selectedContract,
    loadInvoices,
    setInvoicesResult,
    setSelectedInvoice,
    setInvoicesError,
  ]);

  // Si la factura seleccionada entra en verificación, limpiarla para evitar continuar
  // EXCEPTO si tiene deuda pendiente mayor a 0, en cuyo caso siempre debe poder seleccionarse
  useEffect(() => {
    const rawAmount = selectedInvoice?.debt_with_payment_pending?.amount_bs;
    // Aceptar number | string | undefined y normalizar antes de convertir
    const pendingAmount = rawAmount == null ? 0 : Number(String(rawAmount).replace(',', '.'));
    const hasPendingDebitImmediate = (selectedInvoice?.debit_inmediate_payment_info ?? []).some(
      (d) => String(d.status ?? '').toLowerCase() === 'pending' || String(d.status ?? '').toLowerCase() === 'pend'
    );
    if (
      selectedInvoice &&
      (selectedInvoice.payment_validation_log?.not_found ?? 0) > 0 &&
      pendingAmount <= 0
    ) {
      setSelectedInvoice(null);
    }
    // Si la factura tiene al menos un débito inmediato en 'pending', no permitir seleccionarla
    if (selectedInvoice && hasPendingDebitImmediate) {
      setSelectedInvoice(null);
    }
  }, [selectedInvoice, setSelectedInvoice]);

  const handleInvoiceSelection = (invoiceId: number) => {
    const invoice = invoicesResult?.results.find((inv) => inv.id === invoiceId);
    if (invoice) {
      const hasPendingDebitImmediate = (invoice.debit_inmediate_payment_info ?? []).some(
        (d) => String(d.status ?? '').toLowerCase() === 'pending' || String(d.status ?? '').toLowerCase() === 'pend'
      );
      if (hasPendingDebitImmediate) {
        // don't select invoices that have a pending debit immediate
        return;
      }
      setSelectedInvoice(invoice);
    }
  };

  const clearSelection = () => {
    setSelectedInvoice(null);
  };

  const formatCurrency = (amount: number, currency: string = "$") => {
    return `${currency} ${amount.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    // Soportar formatos 'YYYY-MM-DD' y 'YYYY-MM-DDTHH:MM:SS...'
    const datePart = dateString.split("T")[0];
    const [year, month, day] = datePart.split("-");
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );

    return localDate.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isInvoiceExpired = (dateString: string) => {
    const today = new Date();
    // Parsear la fecha como fecha local
    const [year, month, day] = dateString.split("-");
    const expirationDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );
    return expirationDate < today;
  };

  const getDaysUntilExpiration = (dateString: string) => {
    const today = new Date();
    // Parsear la fecha como fecha local
    const [year, month, day] = dateString.split("-");
    const expirationDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Nueva función para obtener los días vencidos (cuando ya pasó la fecha)
  const getDaysOverdue = (dateString: string) => {
    const today = new Date();
    // Parsear la fecha como fecha local
    const [year, month, day] = dateString.split("-");
    const expirationDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );
    const diffTime = today.getTime() - expirationDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Nueva función para formatear el período de manera más clara
  const formatPeriod = (month: number, year: number) => {
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  // Nueva función para obtener el texto de días de vencimiento
  const getExpirationText = (dateString: string) => {
    const isExpired = isInvoiceExpired(dateString);

    if (isExpired) {
      const daysOverdue = getDaysOverdue(dateString);
      return {
        text: `vencida hace ${daysOverdue} día${daysOverdue !== 1 ? "s" : ""}`,
        className: "text-red-700 font-bold",
      };
    } else {
      const daysUntil = getDaysUntilExpiration(dateString);
      if (daysUntil === 0) {
        return {
          text: "vence hoy",
          className: "text-red-600 font-bold",
        };
      } else if (daysUntil === 1) {
        return {
          text: "vence mañana",
          className: "text-orange-600 font-bold",
        };
      } else if (daysUntil <= 7) {
        return {
          text: `faltan ${daysUntil} días`,
          className: "text-orange-600 font-semibold",
        };
      } else {
        return {
          text: `faltan ${daysUntil} días`,
          className: "text-gray-700",
        };
      }
    }
  };

  /*
  const getInvoiceConcept = (invoice: Invoice) => {
    if (invoice.invoice_items_gsoft && invoice.invoice_items_gsoft.length > 0) {
      const items = invoice.invoice_items_gsoft;
      if (items.length === 1) {
        return {
          serviceName: items[0].service_name,
          details: items[0].details,
        };
      } else {
        const services = items
          .map((item) => item.service_name)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
        return {
          serviceName: services.join(", "),
          details: `${items.length} servicios incluidos`,
        };
      }
    }
    return {
      serviceName: "No especificado",
      details: "Información no disponible",
    };
  };
  */

  // ESTADO 1: Mostrar skeleton mientras carga O en estado inicial
  // (cuando no hay resultado y no hay error significa que aún no se ha intentado cargar)
  if (isLoadingInvoices || (!invoicesResult && !invoicesError)) {
    return <InvoiceListSkeleton />;
  }

  // ESTADO 2: Mostrar error si existe
  if (invoicesError) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{invoicesError}</p>
        <Button onClick={loadInvoices} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  // ESTADO 3: Mostrar mensaje de contrato al día SOLO si ya se cargó y no hay notas de cobro
  if (invoicesResult && invoicesResult.count === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-600 mb-2">
          Contrato al día
        </h3>
        <p className="text-gray-600 mb-4">
          Este contrato no tiene notas de cobro pendientes de pago.
        </p>
        <p className="text-sm text-gray-500">
          No es posible continuar con el proceso de pago.
        </p>
      </div>
    );
  }

  // ESTADO 4: Este punto no debería alcanzarse nunca si los estados anteriores están bien manejados
  // Pero lo mantenemos como fallback de seguridad
  if (!invoicesResult) {
    return <InvoiceListSkeleton />;
  }

  // Determinar el invoice más próximo (por fecha) y ordenar los resultados
  // poniendo primero las facturas que pueden ser seleccionadas (isAvailable)
  /*
  const earliestInvoiceId = (() => {
    if (!invoicesResult || invoicesResult.count === 0) return null;
    let minDate: number | null = null;
    let minId: number | null = null;
      for (const inv of invoicesResult.results) {
      const d = new Date(inv.date_emission).getTime();
      if (minDate === null || d > minDate) {
        minDate = d;
        minId = inv.id;
      }
    }
    return minId;
  })();
  */
  

  // Keep API order: do not reorder invoices, use them as returned by the backend
  const sortedInvoices = invoicesResult.results;
  const availableInvoice = sortedInvoices[0] || null; // La primera tras aplicar prioridad

  return (
           
         
    <div className="space-y-4">
         {/* Auto-open image preview when this component mounts (hide for bank 0174) */}
            {bankCode !== "0174" && (
                <ImagePreviewModal
                    defaultOpen
                    src="/assets/global/image.png"
                    alt="Información de pago"
                    title="Información de pago"
                />
            )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg font-black text-gray-900">
          Notas de Cobro Pendientes
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={!selectedInvoice}
            className="text-xs sm:text-sm"
          >
            Limpiar selección
          </Button>
        </div>
      </div>

      {/* Información importante */}
      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-blue-800 mb-1 text-sm sm:text-base">
              Información de Pago
            </h4>
            <p className="text-blue-700 text-xs sm:text-sm leading-relaxed">
              Solo puedes pagar una nota de cobro a la vez. Se debe pagar la más
              próxima a vencer.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {sortedInvoices.map((invoice, index) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            index={index}
            selectedInvoice={selectedInvoice}
            invoicesResultCount={invoicesResult?.count ?? 0}
            availableInvoiceId={availableInvoice?.id}
            onSelect={handleInvoiceSelection}
            onOpenVerificationModal={(id, tag) => {
              setModalInvoiceId(id);
              setModalInvoiceTag(tag ?? null);
            }}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            formatPeriod={formatPeriod}
            isInvoiceExpired={isInvoiceExpired}
            getExpirationText={getExpirationText}
            getDaysOverdue={getDaysOverdue}
          />
        ))}
      </div>

      {/* Mensaje de selección requerida */}
      {!canProceedToPayment() && invoicesResult?.count > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-yellow-800 text-sm sm:text-base mb-1">
                Selecciona una nota de cobro
              </h4>
              <p className="text-yellow-700 text-xs sm:text-sm leading-relaxed">
                Debes seleccionar la nota de cobro más próxima a vencer para
                continuar con el proceso de pago.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de alerta para múltiples facturas */}
      <MultipleInvoicesAlert
        isOpen={showMultipleInvoicesAlert}
        onClose={() => setShowMultipleInvoicesAlert(false)}
        invoiceCount={invoicesResult?.count || 0}
      />
      <VerificationPaymentsModal
        isOpen={modalInvoiceId !== null}
        invoiceId={modalInvoiceId}
        invoiceTag={modalInvoiceTag}
        onClose={() => {
          setModalInvoiceId(null);
          setModalInvoiceTag(null);
        }}
      />
    </div>
  );
}

