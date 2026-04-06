"use client";

import { SkeletonTheme } from "react-loading-skeleton";
import { ReactNode } from "react";

interface SkeletonProviderProps {
  children: ReactNode;
}

export function SkeletonProvider({ children }: SkeletonProviderProps) {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base-color, #f3f4f6)"
      highlightColor="var(--skeleton-highlight-color, #e5e7eb)"
      borderRadius="var(--skeleton-border-radius, 0.375rem)"
      duration={1.2}
      direction="ltr"
    >
      {children}
    </SkeletonTheme>
  );
}
