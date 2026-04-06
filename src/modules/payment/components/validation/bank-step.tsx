"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useClientStore } from "@/shared/lib/store/client-store";
import { Search } from "lucide-react";

const BANKS = [
  { code: "0102", name: "BANCO DE VENEZUELA" },
  { code: "0104", name: "BANCO VENEZOLANO DE CREDITO" },
  { code: "0105", name: "BANCO MERCANTIL" },
  { code: "0108", name: "BBVA PROVINCIAL" },
  { code: "0114", name: "BANCARIBE" },
  { code: "0115", name: "BANCO EXTERIOR" },
  { code: "0128", name: "BANCO CARONI" },
  { code: "0134", name: "BANESCO" },
  { code: "0137", name: "BANCO SOFITASA" },
  { code: "0138", name: "BANCO PLAZA" },
  { code: "0146", name: "BANGENTE" },
  { code: "0151", name: "BANCO FONDO COMUN" },
  { code: "0156", name: "100% BANCO" },
  { code: "0157", name: "DELSUR BANCO UNIVERSAL" },
  { code: "0163", name: "BANCO DEL TESORO" },
  { code: "0168", name: "BANCRECER" },
  { code: "0169", name: "R4 BANCO MICROFINANCIERO C.A." },
  { code: "0171", name: "BANCO ACTIVO" },
  { code: "0172", name: "BANCAMIGA BANCO UNIVERSAL, C.A." },
  { code: "0173", name: "BANCO INTERNACIONAL DE DESARROLLO" },
  { code: "0174", name: "BANPLUS" },
  { code: "0175", name: "BANCO DIGITAL DE LOS TRABAJADORES, BANCO UNIVERSAL" },
  { code: "0177", name: "BANFANB" },
  { code: "0178", name: "N58 BANCO DIGITAL BANCO MICROFINANCIERO S A" },
  { code: "0191", name: "BANCO NACIONAL DE CREDITO" },
];

export function PaymentBankStep() {
  const { selectedBank, setSelectedBank, setValidationStep } = useClientStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [localSelectedBank, setLocalSelectedBank] = useState(selectedBank);

  const filteredBanks = BANKS.filter((bank) =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBankSelect = (bank: { code: string; name: string }) => {
    setLocalSelectedBank(bank);
  };

  const handleConfirm = () => {
    if (localSelectedBank) {
      setSelectedBank(localSelectedBank);
      setValidationStep("date");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center px-2">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-3 leading-tight">
          ¿Desde qué banco realizaste el pago?
        </h3>
      </div>

      <div className="space-y-2 sm:space-y-3 px-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Busca tu banco aquí"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 sm:h-12 text-base rounded-xl placeholder:text-gray-400"
          />
        </div>

        <div className="space-y-2 max-h-60 sm:max-h-64 overflow-y-auto">
          {filteredBanks.map((bank) => (
            <button
              key={bank.code}
              type="button"
              onClick={() => handleBankSelect(bank)}
              className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${
                localSelectedBank?.code === bank.code
                  ? "bg-black text-white border-black shadow-lg"
                  : "bg-white text-gray-900 border-gray-200 hover:border-gray-400 hover:shadow-sm active:scale-[0.99]"
              }`}
            >
              <div className="w-full">
                <div className="text-sm font-bold leading-tight mb-1">
                  {bank.code} - {bank.name}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredBanks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-base">No se encontraron bancos</p>
            <p className="text-gray-400 text-sm mt-1">
              Intenta con otro término de búsqueda
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-3 px-2">
        <Button
          variant="outline"
          onClick={() => setValidationStep("reference")}
          className="flex-1 h-12 font-black text-sm rounded-xl"
        >
          Paso anterior
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!localSelectedBank}
          className="flex-1 h-12 font-black text-sm rounded-xl disabled:opacity-50"
        >
          Confirmar banco
        </Button>
      </div>
    </div>
  );
}
