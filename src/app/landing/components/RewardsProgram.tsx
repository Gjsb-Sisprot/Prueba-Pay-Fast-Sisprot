"use client";

import { EARLY_PAYMENT_BENEFITS } from "../data/landing-data";
import { Sparkles, Star } from "lucide-react";
import { useAnime } from "../hooks/useAnime";
import { stagger } from "animejs";

export function RewardsProgram() {
  const leftContentRef = useAnime<HTMLDivElement>({
    translateX: [-50, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo',
    delay: 200
  });

  const rightVisualRef = useAnime<HTMLDivElement>({
    translateX: [50, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo',
    delay: 400
  });

  const benefitsRef = useAnime<HTMLDivElement>({
    selector: ".benefit-item-anim",
    translateY: [20, 0],
    opacity: [0, 1],
    delay: stagger(100, { start: 600 }),
    duration: 800,
    easing: 'easeOutExpo'
  });

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 bg-[#f8f9fb]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floating {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-floating {
          animation: floating 3s ease-in-out infinite;
        }
      `}} />

      <div className="mx-auto max-w-5xl">
        <div className="bg-[#edeef0] rounded-[3rem] p-6 sm:p-12 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#785900]/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-[#785900]/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div ref={leftContentRef} className="w-full lg:w-1/2 opacity-0">
                <div className="inline-flex items-center gap-2 bg-[#ffffff] shadow-[0_20px_40px_rgba(25,28,30,0.04)] rounded-full px-4 py-2 text-sm text-[#785900] font-bold mb-6">
                  <Sparkles className="w-4 h-4" />
                  <span>Programa de Recompensas</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-[#191c1e] mb-6 leading-tight">
                  Próximamente: Beneficios por
                  <span className="text-[#785900]"> Pronto Pago</span>
                </h2>

                <p className="text-lg text-[#4f4632] mb-8 max-w-md">
                  Estamos construyendo un mundo de beneficios para ti. Muy
                  pronto, tu puntualidad tendrá recompensa.
                </p>

                <div ref={benefitsRef} className="space-y-4 sm:space-y-6">
                  {EARLY_PAYMENT_BENEFITS.map((benefit) => (
                    <div key={benefit.id} className="benefit-item-anim opacity-0 flex gap-4 group">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#ffffff] rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-300">
                        {benefit.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#191c1e] text-sm sm:text-base mb-0.5 sm:mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#4f4632] leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Visual (Card) */}
              <div ref={rightVisualRef} className="w-full lg:w-1/2 relative flex justify-center lg:justify-end py-12 sm:py-20 lg:py-10 opacity-0">
                <div className="animate-floating relative z-10 w-full max-w-[340px] sm:max-w-[400px] transition-transform duration-500">
                  {/* Floating Badge */}
                  <div className="absolute -top-4 -right-4 bg-[#ffc107] text-[#261a00] px-4 py-2 rounded-full font-black text-[10px] sm:text-xs shadow-[0_20px_40px_rgba(25,28,30,0.06)] z-20 flex items-center gap-1">
                    +150 Puntos
                  </div>

                  {/* Main Rewards Card */}
                  <div className="w-full sm:aspect-[1.6/1] min-h-[180px] bg-[#2e3132] rounded-[2rem] shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-5 sm:p-8 text-white relative overflow-hidden group flex flex-col justify-between">
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#785900]/40 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#ffffff]/10 backdrop-blur-[20px] rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                          <Star className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc107]" />
                        </div>
                        <div className="text-right">
                          <span className="text-[7px] sm:text-[9px] font-black tracking-[0.2em] opacity-60 block uppercase text-[#f8f9fb]">
                            SISPROT REWARDS
                          </span>
                        </div>
                      </div>

                      {/* Point Info */}
                      <div className="mb-4">
                        <p className="text-[8px] sm:text-[10px] font-bold tracking-wide opacity-80 mb-0.5 text-[#f8f9fb]">Puntos Acumulados</p>
                        <p className="text-2xl sm:text-5xl font-black tracking-tight leading-none text-[#ffffff]">1,250</p>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative h-1.5 sm:h-2 w-full bg-[#f8f9fb]/20 rounded-full mb-4 sm:mb-6 overflow-hidden backdrop-blur-sm">
                        <div className="absolute top-0 left-0 h-full bg-[#ffffff] w-[75%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex justify-between items-end relative z-10 mt-auto">
                      <div>
                        <p className="text-[7px] sm:text-[9px] font-black tracking-widest opacity-80 mb-0.5 uppercase text-[#f8f9fb]">Status</p>
                        <p className="text-sm sm:text-lg font-black tracking-tight bg-gradient-to-r from-[#ffdf9e] to-[#ffc107] text-transparent bg-clip-text">Cliente Gold</p>
                      </div>
                      
                      {/* Overlapping Circles */}
                      <div className="flex -space-x-3 sm:-space-x-4">
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-[#ffffff]/5" />
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-[#ffffff]/10" />
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-[#ffffff]/20 flex items-center justify-center shadow-[0_10px_20px_rgba(25,28,30,0.1)]">
                           <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-[#ffffff] text-[#ffffff]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[300px] sm:max-w-[350px] aspect-square bg-[#785900]/10 rounded-full blur-[60px] sm:blur-[80px] -z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
