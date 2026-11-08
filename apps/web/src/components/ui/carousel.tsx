'use client';

import { useRef } from 'react';
import { ArrowRight } from './button';

/**
 * Лента карточек со стрелками по бокам, как в макете. На телефоне листается пальцем,
 * стрелки прокручивают на ширину видимой части.
 */
export function Carousel({
  children,
  prevLabel,
  nextLabel,
  className = '',
}: {
  children: React.ReactNode;
  prevLabel: string;
  nextLabel: string;
  className?: string;
}) {
  const row = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const element = row.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: 'smooth' });
  };
  const arrow =
    'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-milk/90 text-cocoa shadow-md transition hover:bg-white sm:grid';

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={prevLabel}
        className={`${arrow} -left-5`}
      >
        <ArrowRight className="size-4 rotate-180" />
      </button>
      <ul ref={row} className="scroll-row py-2">
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
    </div>
  );
}
