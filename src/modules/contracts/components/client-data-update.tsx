"use client";

import { useClientStore } from "@/shared/lib/store/client-store";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { OtpVerificationModal } from "./otp-verification-modal";
import { Loader2, AlertCircle } from "lucide-react";
import { useClientData } from "../hooks/use-client-data";
import { fetchContractsByClient } from "../hooks/use-contracts";
import { useOtp } from "../hooks/use-otp";

interface ClientDataUpdateProps {
  onBack: () => void;
}

export function ClientDataUpdate({ onBack }: ClientDataUpdateProps) {
  const { selectedClient, setContractsResult, setLoadingContracts, setContractsError } = useClientStore();
  const { client, loading, error, getClientById, patchClient } = useClientData();
  const { generateOtp, loading: otpLoading } = useOtp();

  const [formData, setFormData] = useState({
    identification: "",
    name: "",
    lastName: "",
    email: "",
    mobile: "",
  });

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(true);

  useEffect(() => {
    if (selectedClient?.id) {
      getClientById(selectedClient.id);
    }
  }, [selectedClient?.id, getClientById]);

  useEffect(() => {
    if (client) {
      setFormData({
        identification: client.identification || "",
        name: client.name || "",
        lastName: client.last_name || "",
        email: client.email || "",
        mobile: client.mobile || "",
      });
      setIsEmailVerified(client.is_email_validated ?? true);
      setIsPhoneVerified(client.is_phone_validated ?? true);
    }
  }, [client]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Actualización de Datos
          </h2>
          <p className="text-sm text-gray-500">
            Manten tu información actualizada y gestiona tu contrato.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-2" />
          <p className="text-gray-500 text-sm">Cargando datos del cliente...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-medium">Error al cargar datos</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <Button 
              variant="link" 
              className="p-0 h-auto text-red-700 font-bold mt-2"
              onClick={() => selectedClient?.id && getClientById(selectedClient.id)}
            >
              Intentar de nuevo
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="identification">Identificación</Label>
              <Input
                id="identification"
                value={formData.identification}
                readOnly
                className="bg-gray-50 text-gray-500 text-[16px]"
              />
            </div>

            <div className="hidden md:block"></div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombres</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="text-[16px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellidos</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="text-[16px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setIsEmailVerified(false);
                  }}
                  className="flex-1 text-[16px]"
                />
                {isEmailVerified ? (
                  <div className="flex items-center text-green-600 text-sm gap-1 pl-2 whitespace-nowrap">
                    <CheckCircle size={18} />
                    <span className="hidden sm:inline">Verificado</span>
                  </div>
                ) : (
                  <div
                    className={`flex items-center text-red-600 text-sm gap-1 pl-2 whitespace-nowrap cursor-pointer hover:underline ${otpLoading ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={async () => {
                      const success = await generateOtp("email", formData.email);
                      if (success) setShowOtpModal(true);
                    }}
                  >
                    <XCircle size={18} />
                    <span className="hidden sm:inline">
                      {otpLoading ? "Enviando..." : "No verif. (Validar)"}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Teléfono</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => {
                    setFormData({ ...formData, mobile: e.target.value });
                    setIsPhoneVerified(false);
                  }}
                  className="flex-1 text-[16px]"
                />
                {isPhoneVerified ? (
                  <div className="flex items-center text-green-600 text-sm gap-1 pl-2 whitespace-nowrap">
                    <CheckCircle size={18} />
                    <span className="hidden sm:inline">Verificado</span>
                  </div>
                ) : (
                  <div
                    className={`flex items-center text-red-600 text-sm gap-1 pl-2 whitespace-nowrap cursor-pointer hover:underline ${otpLoading ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={async () => {
                      const success = await generateOtp("sms", formData.mobile);
                      if (success) setShowPhoneOtpModal(true);
                    }}
                  >
                    <XCircle size={18} />
                    <span className="hidden sm:inline">
                      {otpLoading ? "Enviando..." : "No verif. (Validar)"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className="flex justify-end pt-6 mt-2">
            <Button
              className="w-full sm:w-auto bg-neutral-600 hover:bg-neutral-700 text-white"
              disabled={loading || isEmailVerified === false || isPhoneVerified === false}
              onClick={async () => {
                if (!client?.id) return;
                
                const result = await patchClient(client.id, {
                  name: formData.name,
                  last_name: formData.lastName,
                  identification: formData.identification,
                  mobile: formData.mobile,
                  email: formData.email,
                  is_email_validated: isEmailVerified,
                  is_phone_validated: isPhoneVerified,
                });

                if (result) {
                  console.log("Datos actualizados correctamente:", result);
                  
                  // Refetch contracts after update
                  if (client?.id) {
                    setLoadingContracts(true);
                    setContractsError(null);
                    try {
                      const contractsData = await fetchContractsByClient(client.id);
                      setContractsResult(contractsData);
                    } catch (error) {
                      console.error("Error refetching contracts:", error);
                      setContractsError(error instanceof Error ? error.message : "Error al actualizar contratos");
                    } finally {
                      setLoadingContracts(false);
                    }
                  }
                  
                  onBack();
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </div>
      </div>


      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        email={formData.email}
        type="email"
        onVerify={() => {
          setIsEmailVerified(true);
          setShowOtpModal(false);
        }}
      />

      <OtpVerificationModal
        isOpen={showPhoneOtpModal}
        onClose={() => setShowPhoneOtpModal(false)}
        email={formData.mobile} // se reusa el modal pasándole el teléfono
        type="sms"
        onVerify={() => {
          setIsPhoneVerified(true);
          setShowPhoneOtpModal(false);
        }}
      />
      </>
      )}
    </div>
  );
}
