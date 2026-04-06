import { AIFeatureItem } from "../types/landing.types";

export function AIFeature({ item }: { item: AIFeatureItem }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-primary shrink-0">
        {item.icon}
      </div>
      <div>
        <p className="font-semibold">{item.title}</p>
        <p className="text-sm text-gray-400">{item.description}</p>
      </div>
    </div>
  );
}
