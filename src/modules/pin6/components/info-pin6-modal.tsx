"use client";

import { usePin6Modal } from "@/modules/pin6/hooks/use-pin6-modal";
import { useState } from "react";
import Image from "next/image";

export function InfoPin6Modal() {
  const { visible, hideModal } = usePin6Modal();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] text-gray-200 rounded-2xl p-6 md:p-8 w-full max-w-[420px] shadow-xl border border-gray-700">

        {/* Imagen de candado */}
        <div className="flex justify-center mb-4">
          <Image
            src="/assets/icons/candado.png"
            alt="Lock Icon"
            width={120}
            height={80}
            className="object-contain"
          />
        </div>

        <h2 className="text-lg md:text-xl font-semibold text-center">
          Información importante del PIN6
        </h2>

        {/* Mock PIN6 */}
        <div className="flex justify-center gap-2 mt-6">
          {[...Array(6).keys()].map(i => (
            <div
              key={i}
              className="w-9 md:w-10 h-10 md:h-12 bg-black border border-gray-600 rounded-md flex items-center justify-center text-lg font-bold"
            >
              *
            </div>
          ))}
        </div>

        {/* Texto convertido en lista elegante */}
        <ul className="text-xs md:text-sm text-gray-300 mt-5 space-y-2 list-disc list-outside px-5">
          <li>Tu PIN6 es único, no es necesario solicitarlo cada vez que ingreses al portal.</li>
          <li>Puedes cambiarlo en el botón “Cambiar mi PIN6”.</li>
          <li>Guárdalo en un lugar seguro y no lo compartas con nadie.</li>
          <li>Si no lo recuerdas puedes solicitarlo vía Email o SMS.</li>
        </ul>

        {/* Checkbox */}
        <label className="flex items-center gap-2 mt-5 text-xs md:text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 accent-gray-300"
          />
          No mostrar más este mensaje
        </label>

        {/* Botón de cierre */}
        <button
          onClick={() => hideModal(dontShowAgain)}
          className="w-full bg-gray-300 text-black mt-6 py-2 rounded-md font-semibold hover:bg-gray-200 transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
