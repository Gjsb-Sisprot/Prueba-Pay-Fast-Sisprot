"use client";

import type { Bank } from "@/shared/types/banks-data";
import { useBanks } from "@/shared/hooks/use-banks";
import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  TabletSmartphone,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DebitoInmediatoOTPModal } from "../../debito-otp-modal";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useClientStore } from "@/shared/lib/store/client-store";
import useDebit from "@/modules/payment/hooks/use-debit";
import type { DebitInvoice, DebitApiResponse } from "@/shared/types/debit";

// Define el tipo de valores del formulario
export interface DebitoInmediatoFormValues {
  selectedBank: { code: string; name: string } | null;
  holderName: string;
  idNumber: string;
  contactMethod: "telefono" | "cuenta";
  phonePrefix?: string;
  phoneNumber?: string;
  accountNumber?: string;
  otpCode?: string;
}

interface DebitoInmediatoFormProps {
  form: UseFormReturn<DebitoInmediatoFormValues>;
}

// Prefijos telefónicos venezolanos
const PHONE_PREFIXES = [
  { value: "0412", label: "0412" },
  { value: "0422", label: "0422" },
  { value: "0414", label: "0414" },
  { value: "0424", label: "0424" },
  { value: "0416", label: "0416" },
  { value: "0426", label: "0426" },
];

export function DebitoInmediatoForm({ form }: DebitoInmediatoFormProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = form;

  const [searchBank, setSearchBank] = useState("");
  const selectedBank = watch("selectedBank");
  const selectedPrefix = watch("phonePrefix");
  const contactMethod = watch("contactMethod");
  const [openBankDropdown, setOpenBankDropdown] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const {
    selectedContract,
    selectedInvoice,
    setPaymentResult,
    setCurrentStep,
  } = useClientStore();
  const { requestOtp, loading } = useDebit<DebitApiResponse>();
  const [requestError, setRequestError] = useState<string | null>(null);

  // 🔹 Limpiar campos al montar el componente
  useEffect(() => {
    const defaultHolder = selectedContract
      ? `${selectedContract.name ?? ""} ${selectedContract.last_name ?? ""}`.trim()
      : "";
    const defaultId = selectedContract?.identification ?? "";

    reset({
      selectedBank: null,
      holderName: defaultHolder,
      idNumber: defaultId,
      contactMethod: "telefono",
      phonePrefix: "",
      phoneNumber: "",
      accountNumber: "",
      otpCode: "",
    });
    setSearchBank("");
    // prefix select does not require a search state
  }, [reset, selectedContract]);

  const {
    banks: apiBanks,
    loading: banksLoading,
    error: banksError,
  } = useBanks();

  const sourceBanks: Bank[] = apiBanks ?? [];

  const filteredBanks = sourceBanks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(searchBank.toLowerCase()) ||
      bank.code.includes(searchBank),
  );

  // No filtering required for prefixes; show as a simple select

  const handleSelectBank = (bank: { code: string; name: string }) => {
    setValue("selectedBank", bank, { shouldValidate: true });
    setSearchBank(`${bank.code} - ${bank.name}`);
    setOpenBankDropdown(false);
  };

  const handleSelectPrefix = (prefix: string) => {
    setValue("phonePrefix", prefix, { shouldValidate: true });
  };

  const handleToggleContactMethod = (method: "telefono" | "cuenta") => {
    setValue("contactMethod", method, { shouldValidate: true });
    if (method === "telefono") {
      // Limpiar cuenta cuando se selecciona teléfono
      setValue("accountNumber", "");
    } else {
      // Limpiar teléfono cuando se selecciona cuenta
      setValue("phonePrefix", "");
      setValue("phoneNumber", "");
      // no prefix search UI anymore
    }
  };

  const handleRequestCode = async () => {
    // Validar campos según el método de contacto antes de abrir el modal
    const fieldsToValidate =
      contactMethod === "telefono"
        ? [
            "selectedBank",
            "holderName",
            "idNumber",
            "phonePrefix",
            "phoneNumber",
          ]
        : ["selectedBank", "holderName", "idNumber", "accountNumber"];

    const isValid = await form.trigger(
      fieldsToValidate as (keyof DebitoInmediatoFormValues)[],
    );
    if (!isValid) {
      // Errores se muestran vía formState.errors
      return;
    }

    // Preparar payload para la API de débito
    const rawPrefix = watch("phonePrefix") ?? "";
    const normalizedPrefix = rawPrefix.startsWith("0")
      ? rawPrefix.slice(1)
      : rawPrefix;

    const payload: DebitInvoice = {
      invoice_id: selectedInvoice?.id ?? 0,
      debtor_data: {
        DebtorBank: selectedBank?.code ?? "",
        DebtorID: watch("idNumber") ?? "",
        DebtorAccount:
          contactMethod === "telefono"
            ? `58${normalizedPrefix}${watch("phoneNumber") ?? ""}`
            : (watch("accountNumber") ?? ""),
        DebtorAccountType: contactMethod === "telefono" ? "CELE" : "CNTA",
        DebtorName: watch("holderName") ?? "",
      },
    };

    console.log("Payload para solicitar OTP:", payload);

    try {
      setRequestError(null);
      await requestOtp(payload);
      setRequestError(null);
      setShowOTPModal(true);
    } catch (err) {
      console.error("Error al solicitar OTP:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setRequestError(
        msg || "Error al solicitar el código. Intenta de nuevo más tarde.",
      );
      setShowOTPModal(false);
    }
  };

  const handleOTPSubmit = (
    result: DebitApiResponse | { token: string; fallback: true },
  ) => {
    // store token string if fallback, otherwise store whatever the API returned
    if ("token" in result) {
      setValue("otpCode", result.token);
    } else if (
      typeof result === "object" &&
      result !== null &&
      "data" in result
    ) {
      const data = result.data as Record<string, unknown>;
      if (data && typeof data.token === "string")
        setValue("otpCode", data.token);
      else setValue("otpCode", "");
    } else {
      setValue("otpCode", "");
    }
    // Map numeric status to internal status: 201 => success, 200 => verification
    const status = "status" in result ? Number(result.status) : 200;
    const message = "message" in result ? result.message : "Código verificado";
    if (status === 201) {
      setPaymentResult({
        status: "success",
        statusCode: status,
        message,
      });
      // Ir al paso de resultados para mostrar la pantalla de éxito
      setCurrentStep(4);
    } else if (status === 200) {
      setPaymentResult({
        status: "verification_deb",
        statusCode: status,
        message,
      });
      setCurrentStep(4);

      // keep modal closed but do not advance to success step
    } else {
      // Fallback: treat as verification for unknown but non-error statuses
      setPaymentResult({
        status: "verification_deb",
        statusCode: status,
        message,
      });
      setCurrentStep(4);
    }
    setShowOTPModal(false);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Datos del titular */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del titular
            </label>
            <Input
              type="text"
              placeholder="Nombre y apellido"
              {...register("holderName")}
              className="w-full text-[16px] px-4 py-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            {errors.holderName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.holderName.message as string}
              </p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cédula
            </label>
            <Input
              type="text"
              placeholder="V12345678"
              {...register("idNumber")}
              className="w-full text-[16px] px-4 py-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              onChange={(e) => {
                // Normalizar: permitir V/E/J/G + dígitos (máx. 9)
                // Permitir eliminar la letra inicial y aceptar cadena vacía.
                const raw = e.target.value.toUpperCase();
                if (raw === "") {
                  setValue("idNumber", "", { shouldValidate: true });
                  return;
                }
                // Extraer dígitos y limitar a 10
                const digits = raw.replace(/[^0-9]/g, "").slice(0, 10);
                // Buscar prefijo válido si existe
                const prefixMatch = raw.match(/^[VEJG]/);
                const prefix = prefixMatch ? prefixMatch[0] : "";
                const value = prefix ? `${prefix}${digits}` : digits;
                setValue("idNumber", value, { shouldValidate: true });
              }}
              maxLength={10}
            />
            {errors.idNumber && (
              <p className="text-red-500 text-sm mt-1">
                {errors.idNumber.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Selector de Banco */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Banco
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={
                banksLoading ? "Cargando bancos..." : "Buscar banco..."
              }
              value={searchBank}
              onChange={(e) => {
                setSearchBank(e.target.value);
                setOpenBankDropdown(true);
              }}
              onFocus={() => setOpenBankDropdown(true)}
              className="w-full text-[16px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={banksLoading}
            />
            <button
              type="button"
              onClick={() => setOpenBankDropdown(!openBankDropdown)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {openBankDropdown ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>

            {openBankDropdown && !banksLoading && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredBanks.length > 0 ? (
                  filteredBanks.map((bank) => (
                    <button
                      key={bank.code}
                      type="button"
                      onClick={() => handleSelectBank(bank)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
                    >
                      <span className="font-medium">{bank.code}</span> -{" "}
                      {bank.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center">
                    No se encontraron bancos
                  </div>
                )}
              </div>
            )}
          </div>
          {errors.selectedBank && (
            <p className="text-red-500 text-sm mt-1">
              {errors.selectedBank.message}
            </p>
          )}
        </div>

        {/* Método de contacto */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de validación
          </label>
          <RadioGroup
            value={contactMethod}
            onValueChange={(val) =>
              handleToggleContactMethod(val as "telefono" | "cuenta")
            }
            className="grid grid-cols-2 gap-2 mb-3"
          >
            <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="telefono" />
              <TabletSmartphone className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-800">
                Teléfono
              </span>
            </label>
            <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="cuenta" />
              <CreditCard className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-800">
                Cuenta bancaria
              </span>
            </label>
          </RadioGroup>

          {contactMethod === "telefono" ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <div className="flex gap-2">
                {/* Select de prefijo (simple select sin búsqueda) */}
                <div className="relative w-32">
                  <select
                    {...register("phonePrefix")}
                    value={selectedPrefix ?? ""}
                    onChange={(e) => handleSelectPrefix(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Prefijo</option>
                    {PHONE_PREFIXES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input del número */}
                <Input
                  type="text"
                  placeholder="1234567"
                  maxLength={7}
                  {...register("phoneNumber")}
                  className="flex-1 text-[16px] px-3 py-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  onChange={(e) => {
                    // Solo permitir números
                    const value = e.target.value.replace(/\D/g, "");
                    setValue("phoneNumber", value);
                  }}
                />
              </div>
              {errors.phonePrefix && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.phonePrefix.message as string}
                </p>
              )}
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.phoneNumber.message as string}
                </p>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de cuenta
              </label>
              <Input
                type="text"
                placeholder="20 dígitos"
                maxLength={20}
                {...register("accountNumber")}
                className="w-full text-[16px] px-4 py-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setValue("accountNumber", value);
                }}
              />
              {errors.accountNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.accountNumber.message as string}
                </p>
              )}
            </>
          )}
        </div>

        {/* Mostrar alert de información/error encima del botón si hay un error */}
        {(requestError || banksError) && (
          <div className="mb-3 flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-3 rounded">
            <Info className="w-5 h-5 mt-0.5" />
            <div className="text-sm">{requestError ?? banksError}</div>
          </div>
        )}

        {/* Botón Solicitar Código */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleRequestCode}
            className={`w-full h-12 font-semibold text-base ${loading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""}`}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Solicitando...
              </span>
            ) : (
              "Solicitar Código"
            )}
          </Button>
        </div>
      </div>

      {/* Modal OTP */}
      <DebitoInmediatoOTPModal
        open={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onSubmit={handleOTPSubmit}
        getPayload={() => {
          const rawAccount =
            contactMethod === "telefono"
              ? `${watch("phonePrefix") ?? ""}${watch("phoneNumber") ?? ""}`
              : (watch("accountNumber") ?? "");

          // Si comienza con '04', quitar el 0 inicial y agregar '58'
          const normalizedAccount = rawAccount.startsWith("04")
            ? `58${rawAccount.slice(1)}`
            : rawAccount;

          return {
            invoice_id: selectedInvoice?.id ?? 0,
            debtor_data: {
              DebtorBank: selectedBank?.code ?? "",
              DebtorID: watch("idNumber") ?? "",
              DebtorAccount: normalizedAccount,
              DebtorAccountType: contactMethod === "telefono" ? "CELE" : "CNTA",
              DebtorName: watch("holderName") ?? "",
            },
          };
        }}
        phoneNumber={`${selectedPrefix?.startsWith("0") ? selectedPrefix.slice(1) : selectedPrefix}${watch("phoneNumber")}`}
      />
    </>
  );
}
