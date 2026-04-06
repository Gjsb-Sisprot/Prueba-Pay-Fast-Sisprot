"use client";

import { Button } from "@/shared/components/ui/button";
import { FileText, Download, PenTool, ArrowLeft } from "lucide-react";
import { ContractFile } from "@/shared/lib/api-client";

interface ContractViewDetailProps {
  onBack: () => void;
  contractUrl?: string;
  contractFile?: ContractFile;
  onSign?: () => void;
}

export function ContractViewDetail({
  onBack,
  contractUrl,
  contractFile,
  onSign,
}: ContractViewDetailProps) {
  const handleDownload = () => {
    if (contractUrl) {
      window.open(contractUrl, "_blank");
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-150px)] sm:h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
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
              Detalle del Contrato
            </h2>
            <p className="text-sm text-gray-500">
              Visualiza y gestiona tu documento.
            </p>
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 w-full bg-gray-50 rounded-xl overflow-hidden border shadow-inner relative flex justify-center min-h-0">
        <div className="w-full h-full overflow-hidden flex justify-center bg-gray-200">
          {contractUrl ? (
            <div className="w-full h-full bg-white shadow-2xl">
              <iframe
                src={`${contractUrl}#toolbar=0&navpanes=0&view=FitH`}
                className="w-full h-full border-none shadow-inner"
                title="Contrato PDF"
              />
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20 flex flex-col items-center justify-center w-full bg-gray-50">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-900">Documento no disponible</p>
              <p className="text-sm text-gray-500">No hay un PDF asociado a este contrato para visualizar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
        {contractFile && !contractFile.is_signed && onSign && (
          <Button
            onClick={onSign}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold px-8 rounded-xl shadow-lg shadow-green-100"
          >
            <PenTool size={20} />
            Firmar Contrato
          </Button>
        )}
        {contractFile?.is_signed && contractFile.accept_conditions_and_terms !== null && (
          <Button
            onClick={handleDownload}
            variant="outline"
            size="lg"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-2 font-bold px-8 rounded-xl"
          >
            <Download size={20} />
            Descargar Copia Firmada
          </Button>
        )}
        <Button onClick={onBack} variant="secondary" size="lg" className="px-8 rounded-xl font-bold">
          Volver
        </Button>
      </div>
    </div>
  );
}
