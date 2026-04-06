"use client";

import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { PAYMENT_METHODS } from "../data/landing-data";
import { useAnime } from "../hooks/useAnime";
import { stagger } from "animejs";

export function PaymentMethods() {
  const containerRef = useAnime<HTMLDivElement>({
    selector: ".method-card-anim",
    scale: [0.9, 1],
    opacity: [0, 1],
    delay: stagger(200),
    duration: 800,
    easing: 'easeOutBack'
  });

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Múltiples Métodos de Pago
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Elige el método que más te convenga. Aceptamos los principales
            medios de pago en Venezuela.
          </p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PAYMENT_METHODS.map((method) => (
            <div
              key={method.id}
              className={`method-card-anim opacity-0 group relative bg-linear-to-br ${method.bgColor} rounded-2xl p-6 border ${method.borderColor} hover:shadow-lg transition-all ${
                method.id === "zelle" ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center shadow-sm">
                  <Image
                    src={method.image}
                    alt={method.name}
                    width={40}
                    height={40}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {method.name}
                  </h3>
                  <p className="text-sm text-gray-600">{method.subtitle}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                {method.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className={`w-4 h-4 ${method.bulletColor} shrink-0 mt-0.5`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
