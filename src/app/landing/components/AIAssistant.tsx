"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { AI_FEATURES } from "../data/landing-data";
import { AIFeature } from "./AIFeature";
import { ChatPreview } from "./ChatPreview";
import { useAnime } from "../hooks/useAnime";
import { stagger } from "animejs";

export function AIAssistant() {
  const leftContentRef = useAnime<HTMLDivElement>({
    translateX: [-50, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo'
  });

  const rightVisualRef = useAnime<HTMLDivElement>({
    scale: [0.9, 1],
    opacity: [0, 1],
    duration: 1200,
    easing: 'easeOutExpo',
    delay: 300
  });

  const featuresListRef = useAnime<HTMLUListElement>({
    selector: ".ai-feature-anim",
    translateY: [20, 0],
    opacity: [0, 1],
    delay: stagger(100, { start: 500 }),
    duration: 800,
    easing: 'easeOutExpo'
  });

  return (
    <section className="px-4 mt-8 py-16 sm:px-6 lg:px-8 bg-linear-to-br from-gray-900 to-black text-white overflow-hidden">
      <div className="mx-auto max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div ref={leftContentRef} className="opacity-0">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Potenciado por Gemini AI</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6 ml-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Ya está disponible</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Asistente Virtual
              <span className="text-white"> Inteligente</span>
            </h2>

            <p className="text-gray-300 text-lg mb-8">
              Nuestro asistente de IA está disponible para ayudarte con
              cualquier duda sobre tus pagos, facturas y servicios.
            </p>

            <ul ref={featuresListRef} className="space-y-4 mb-8">
              {AI_FEATURES.map((feature) => (
                <li key={feature.id} className="ai-feature-anim opacity-0">
                  <AIFeature item={feature} />
                </li>
              ))}
            </ul>

            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100"
              disabled
            >
              Probar Asistente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div ref={rightVisualRef} className="opacity-0 lg:flex lg:justify-end">
            <ChatPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
