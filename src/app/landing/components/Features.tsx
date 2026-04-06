"use client";

import { FEATURES } from "../data/landing-data";
import { FeatureCard } from "./FeatureCard";
import { useAnime } from "../hooks/useAnime";
import { stagger } from "animejs";

export function Features() {
  const containerRef = useAnime<HTMLDivElement>({
    selector: ".feature-card-anim",
    translateY: [30, 0],
    opacity: [0, 1],
    delay: stagger(150),
    duration: 1000,
    easing: 'easeOutExpo'
  });

  return (
    <section id="features" className="px-4 py-16 sm:px-6 lg:px-8 bg-linear-to-br from-black via-gray-900 to-black text-white">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Características del Portal
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Diseñado con tecnología de vanguardia para garantizar tu comodidad y seguridad en cada transacción.
          </p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature) => (
            <div key={feature.id} className="feature-card-anim opacity-0">
              <FeatureCard feature={feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
