'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Плавное появление блока при прокрутке: подъём и проявление.
 * Без JavaScript и при «уменьшить движение» содержимое видно сразу.
 */
export function Reveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return; // уже на экране — без анимации
    setState('hidden');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal={state} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
