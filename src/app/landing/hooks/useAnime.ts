"use client";

import { useEffect, useRef } from 'react';
import { animate, type AnimationParams } from 'animejs';

type AnimeOptions = AnimationParams & {
  triggerOnce?: boolean;
  selector?: string;
};

export function useAnime<T extends HTMLElement = HTMLElement>(options: AnimeOptions) {
  const ref = useRef<T>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const { triggerOnce = true, selector, ...animeParams } = options;

    const startAnimation = () => {
      animate(
        selector ? currentRef.querySelectorAll(selector) : currentRef,
        animeParams
      );
    };

    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          if (triggerOnce && observer.current) {
            observer.current.disconnect();
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.current.observe(currentRef);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [options]);

  return ref;
}
