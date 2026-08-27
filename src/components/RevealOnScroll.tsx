import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export default function RevealOnScroll({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    element.style.transform = 'translateY(38px)';

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;

      element.animate(
        [
          { transform: 'translateY(38px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 700, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' },
      );
      observer.unobserve(element);
    }, { threshold: 0.15 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={elementRef}>{children}</div>;
}
