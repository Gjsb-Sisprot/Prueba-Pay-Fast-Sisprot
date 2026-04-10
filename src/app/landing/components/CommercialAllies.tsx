"use client";

import { Star,  Store } from "lucide-react";
import Image from "next/image";

const ALLIES = [
  { id: 1, name: "Colbox", logo: "/assets/aliados/colbox.webp", bgColor: "bg-[#043310]" },
  { id: 2, name: "Elite", logo: "/assets/aliados/elite.png", bgColor: "bg-[#0a1da8]" },
  { id: 3, name: "Colbox ", logo: "/assets/aliados/colbox.webp", bgColor: "bg-[#043310]" },
  { id: 4, name: "Elite ", logo: "/assets/aliados/elite.png", bgColor: "bg-[#0a1da8]" },
  { id: 5, name: "Colbox ", logo: "/assets/aliados/colbox.webp", bgColor: "bg-[#043310]" },
  { id: 6, name: "Elite ", logo: "/assets/aliados/elite.png", bgColor: "bg-[#0a1da8]" },
];

export function CommercialAllies() {
  return (
    <section className="px-4 sm:py-16 sm:px-6 lg:px-8 bg-black">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />

      <div className="mx-auto max-w-5xl">
        <div className="text-center  flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-4 mt-4 lg:mt-0">
            <Store className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl sm:text-2xl font-bold text-white">
           Nuestros  Aliados Comerciales
          </h3>
          </div>

           {/* <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-4">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <p className="text-sm text-gray-400 mt-2">
            Trabajamos con las mejores marcas
          </p>
          </div> */}
        
          
        </div>
        
        <div className="relative flex overflow-hidden w-full group">
          {/* Fading Edges for black background */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

          {/* Marquee Content */}
          <div className="flex w-max animate-marquee space-x-6 sm:space-x-8 px-4 whitespace-nowrap py-4">
            {/* Double the array for seamless loop */}
            {[...ALLIES, ...ALLIES].map((ally, index) => (
              <div 
                key={`${ally.id}-${index}`} 
                className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pr-6 pl-2 py-2 transition-all duration-300 hover:bg-white/10 hover:scale-105 shrink-0"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${ally.bgColor} rounded-full flex items-center justify-center p-2 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
                  <Image 
                    src={ally.logo} 
                    alt={ally.name} 
                    width={48}
                    height={48}
                    className="w-full h-full object-contain filter grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  />
                </div>
                <span className="text-white font-medium text-sm sm:text-base flex items-center gap-2">
                  {ally.name}
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffc107] fill-[#ffc107]" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
