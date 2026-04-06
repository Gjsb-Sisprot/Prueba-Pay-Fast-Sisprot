"use client";

import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ label = "Volver" }: { label?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
