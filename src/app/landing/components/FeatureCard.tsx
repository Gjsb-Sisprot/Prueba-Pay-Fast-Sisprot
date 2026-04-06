import { Feature } from "../types/landing.types";
import { CheckCircle } from "lucide-react";

export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="group bg-white/5 backdrop-blur-sm rounded-3xl h-full p-8 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/[0.08] relative overflow-hidden">
      {/* Decorative inner glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
      
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-900 mb-6 shrink-0 shadow-lg group-hover:scale-110 group-hover:text-yellow-500 group-hover:bg-neutral-900 group-hover:border-1 border-white transition-transform duration-300 ">
        <div className="scale-110">
          {feature.icon}
        </div>
      </div>
      
      <h3 className="font-bold text-xl text-white mb-4 tracking-tight group-hover:text-yellow-500 transition-colors">
        {feature.title}
      </h3>
      
      <ul className="space-y-4">
        {feature.features.map((item, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
            <div className="mt-1 bg-yellow-400/20 rounded-full p-0.5">
              <CheckCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            </div>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
