'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight } from './button';

/**
 * Лента карточек со стрелками и точками, как в макете. Сама листается
 * (останавливается при наведении, фокусе и «уменьшить движение»), на телефоне —
 * пальцем. В конце возвращается к началу.
 */
export function Carousel({
  children,
  prevLabel,
  nextLabel,
  autoplay = 5000,
  className = '',
}: {
  children: React.ReactNode;
  prevLabel: string;
  nextLabel: string;
  /** Интервал автопрокрутки, мс; 0 — выключить */
  autoplay?: number;
  className?: string;
}) {
  const row = useRef<HTMLUListElement>(null);
  const paused = useRef(false);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const element = row.current;
    if (!element) return;
    const total = Math.max(1, Math.ceil(element.scrollWidth / element.clientWidth - 0.05));
    setPages(total);
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;
    setPage(atEnd ? total - 1 : Math.round(element.scrollLeft / element.clientWidth));
  }, []);

  const scroll = useCallback((direction: 1 | -1) => {
    const element = row.current;
    if (!element) return;
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;
    if (direction === 1 && atEnd) {
      element.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    measure();
    const element = row.current;
    if (!element) return;
    element.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      element.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  useEffect(() => {
    if (!autoplay || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      if (!paused.current && !document.hidden) scroll(1);
    }, autoplay);
    return () => clearInterval(timer);
  }, [autoplay, scroll]);

  const arrow =
    'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-milk/90 text-cocoa shadow-md transition hover:scale-110 hover:bg-white sm:grid';

  return (
    <div
      className={`relative min-w-0 ${className}`}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
    >
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={prevLabel}
        className={`${arrow} -left-5`}
      >
        <ArrowRight className="size-4 rotate-180" />
      </button>
      <ul ref={row} className="scroll-row -mb-6 pt-3 pb-10">
        {children}
      </ul>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={nextLabel}
        className={`${arrow} -right-5`}
      >
        <ArrowRight className="size-4" />
      </button>
      {pages > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: pages }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === page ? 'w-5 bg-cocoa' : 'w-1.5 bg-cocoa/25'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
