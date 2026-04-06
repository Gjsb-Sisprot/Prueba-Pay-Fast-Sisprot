"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { PenTool, Eraser, Loader2 } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useEffect } from "react";
import { useClientStore } from "@/shared/lib/store/client-store";
import { useContractSign } from "../hooks/use-contract-sign";
import { fetchContractsByClient } from "../hooks/use-contracts";
import { Contract } from "@/shared/lib/api-client";

interface SignContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: Contract;
}

export function SignContractModal({ isOpen, onClose, contract }: SignContractModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const { 
    contractSignature, 
    selectedContract: storeSelectedContract, 
    selectedClient,
    setContractsResult,
    setLoadingContracts,
    setContractsError
  } = useClientStore();
  const { signContract, loading, error: signError } = useContractSign();

  const targetContract = contract || storeSelectedContract;

  useEffect(() => {
    if (isOpen && contractSignature && sigCanvas.current) {
      sigCanvas.current.fromDataURL(contractSignature);
    }
  }, [isOpen, contractSignature]);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Por favor firme el documento antes de continuar.");
      return;
    }
    
    if (!targetContract?.id) {
      alert("Error: No se encontró el contrato seleccionado.");
      return;
    }

    let dataUrl: string | undefined;
    try {
      // Intenta obtener el canvas recortado (puede fallar en producción por problemas del bundler con trim-canvas)
      dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    } catch (e) {
      console.warn("Falling back to untrimmed canvas due to getTrimmedCanvas failure:", e);
      // Fallback al canvas completo si el recorte falla
      dataUrl = sigCanvas.current?.getCanvas().toDataURL("image/png");
    }
    
    if (dataUrl) {
      const result = await signContract(targetContract.id, dataUrl);
      if (result) {
        // Refetch contracts after successful signing
        if (selectedClient?.id) {
          setLoadingContracts(true);
          try {
            const contractsData = await fetchContractsByClient(selectedClient.id);
            setContractsResult(contractsData);
          } catch (error) {
            console.error("Error refetching contracts after sign:", error);
            setContractsError(error instanceof Error ? error.message : "Error al actualizar contratos");
          } finally {
            setLoadingContracts(false);
          }
        }
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Firmar Contrato Digitalmente
          </DialogTitle>
          <DialogDescription>
            Por favor confirme que desea firmar digitalmente el contrato actual.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 pt-2 pb-6 px-4 rounded-md border border-dashed border-gray-300 flex flex-col items-center justify-center mt-4 w-full">
          <div className="w-full flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-gray-500 hover:text-red-500 h-8"
            >
              <Eraser className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          </div>
          <div className="w-full h-40 bg-white border border-gray-200 rounded-md shadow-inner overflow-hidden">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="blue"
              canvasProps={{ className: "w-full h-full" }}
            />
          </div>

          <p className="text-xs text-center mt-3 text-gray-500 max-w-xs">
            Al firmar este documento está aceptando los términos y condiciones
            de la prestación de servicio.
          </p>
          {signError && <p className="text-sm text-red-500 mt-2">{signError}</p>}
        </div>

        <DialogFooter className="mt-6 flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Firmar Documento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
