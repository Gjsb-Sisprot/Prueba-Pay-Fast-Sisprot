
"use client";

import { Bot, Sparkles, Clock } from "lucide-react";

export function ComingSoonMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-gray-600" />
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-gray-900">Muy Pronto</h3>
        <Sparkles className="w-5 h-5 text-yellow-500" />
      </div>
      
      <p className="text-sm text-gray-600 mb-4 max-w-[250px]">
        Estamos trabajando en nuestro asistente virtual con inteligencia artificial.
      </p>
      
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
        <Clock className="w-3.5 h-3.5" />
        <span>Próximamente disponible</span>
      </div>
      
      <div className="mt-6 space-y-2 text-left w-full max-w-[280px]">
        <p className="text-xs font-medium text-gray-700">
          Próximas funcionalidades:
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            Consulta de facturas y pagos
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            Información de contratos
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            Ayuda con métodos de pago
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            Soporte en tiempo real
          </li>
        </ul>
      </div>
    </div>
  );
}
