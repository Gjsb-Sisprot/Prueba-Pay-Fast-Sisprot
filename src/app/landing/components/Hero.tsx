"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, Clock, Zap } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAnime } from "../hooks/useAnime";

export function Hero() {
  const logoRef = useAnime<HTMLDivElement>({
    translateY: [20, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo',
    delay: 200
  });

  const titleRef = useAnime<HTMLHeadingElement>({
    translateY: [30, 0],
    opacity: [0, 1],
    duration: 1200,
    easing: 'easeOutExpo',
    delay: 400
  });

  const descriptionRef = useAnime<HTMLParagraphElement>({
    translateY: [20, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo',
    delay: 600
  });

  const buttonsRef = useAnime<HTMLDivElement>({
    translateY: [20, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo',
    delay: 800
  });

  const badgesRef = useAnime<HTMLDivElement>({
    translateY: [20, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo',
    delay: 1000
  });

  return (
    <section className="relative overflow-hidden px-4 pt-16 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl text-center">
        {/* Logo */}
        <div ref={logoRef} className="flex justify-center mb-8 opacity-0">
          <Image
            src="/assets/logo/logo_sgf.png"
            alt="Sisprot Global Fiber"
            width={120}
            height={120}
            className="drop-shadow-lg"
            priority
          />
        </div>

        {/* Headline */}
        <h1 ref={titleRef} className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-6 opacity-0">
          Pago Rápido
          <span className="block text-primary">Sisprot</span>
        </h1>

        <p ref={descriptionRef} className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 opacity-0">
          Paga tus facturas de internet de forma rápida, segura y sin
          complicaciones. Ahora con asistente de IA para ayudarte 24/7.
        </p>

        {/* CTA Buttons */}
        <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4 justify-center opacity-0">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
              Pagar Ahora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="#features">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6"
            >
              Ver Características
            </Button>
          </Link>
        </div>

        {/* Trust badges */}
        <div ref={badgesRef} className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-gray-500 opacity-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span>Pagos Seguros</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>24/7 Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Proceso Instantáneo</span>
          </div>
        </div>
      </div>
    </section>
  );
}
