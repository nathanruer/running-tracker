import { useEffect, useRef } from 'react';

interface UseInfiniteScrollObserverOptions {
  enabled: boolean;
  onIntersect: () => void;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScrollObserver({
  enabled,
  onIntersect,
  threshold = 0.1,
  rootMargin = '400px',
}: UseInfiniteScrollObserverOptions) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onIntersect();
        }
      },
      { threshold, rootMargin }
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [enabled, onIntersect, threshold, rootMargin]);

  return { observerRef };
}
