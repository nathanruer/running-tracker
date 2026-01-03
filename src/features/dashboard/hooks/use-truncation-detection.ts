import { useEffect, useRef, useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export function useTruncationDetection(content: string, delay = 50) {
  const [isTruncated, setIsTruncated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const checkTruncation = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    const isTruncatedHeight = element.scrollHeight > element.clientHeight;
    const isTruncatedWidth = element.scrollWidth > element.clientWidth;

    setIsTruncated(isTruncatedHeight || isTruncatedWidth);
  }, []);

  const debouncedCheck = useDebounce(checkTruncation, delay);

  useEffect(() => {
    debouncedCheck();

    const resizeObserver = new ResizeObserver(debouncedCheck);

    if (elementRef.current) {
      resizeObserver.observe(elementRef.current);
      const parent = elementRef.current.parentElement;
      if (parent) {
        resizeObserver.observe(parent);
      }
    }

    window.addEventListener('resize', debouncedCheck);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedCheck);
    };
  }, [content, debouncedCheck]);

  return { isTruncated, elementRef };
}
