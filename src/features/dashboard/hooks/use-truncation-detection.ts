import { useEffect, useRef, useState } from 'react';

/**
 * Hook to detect if text content is truncated (overflow)
 * @param content - The content to check for truncation
 * @param delay - Delay in ms before checking truncation (default: 50ms)
 * @returns Object containing truncation state and ref to attach to element
 */
export function useTruncationDetection(content: string, delay = 50) {
  const [isTruncated, setIsTruncated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      const element = elementRef.current;
      if (!element) return;

      const isTruncatedHeight = element.scrollHeight > element.clientHeight;
      const isTruncatedWidth = element.scrollWidth > element.clientWidth;

      setIsTruncated(isTruncatedHeight || isTruncatedWidth);
    };

    const timer = setTimeout(checkTruncation, delay);

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(checkTruncation, delay);
    });

    if (elementRef.current) {
      resizeObserver.observe(elementRef.current);
      const parent = elementRef.current.parentElement;
      if (parent) {
        resizeObserver.observe(parent);
      }
    }

    const handleWindowResize = () => {
      setTimeout(checkTruncation, delay);
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [content, delay]);

  return { isTruncated, elementRef };
}
