'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Butterfly, Sparkle } from '../ornaments/decor';
import { MountainLandscape } from '../ornaments/landscape';
import type { SceneBook } from './hero-books-3d';
import { HeroScene } from './hero-scene';
import { heroBook } from '@/assets/illustrations';

/**
 * Сцена первого экрана: арка с горами, подиум, раскрытая книга-мир, золотые кольца,
 * бабочки и объёмные 3D-книги вокруг. Слои слегка смещаются за курсором (параллакс);
 * при «уменьшить движение» всё стоит на месте.
 */
export function HeroStage({ books, label }: { books: SceneBook[]; label: string }) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = stage.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--px', x.toFixed(3));
        element.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  const layer = (depth: number) => ({
    transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px), 0)`,
  });

  return (
    <div
      ref={stage}
      role="img"
      aria-label={label}
      className="relative mx-auto aspect-[1.08/1] w-full max-w-[40rem] select-none lg:max-w-none"
    >
      {/* Арка-окно с горами */}
      <div
        className="arch absolute top-[2%] left-1/2 h-[78%] w-[60%] -translate-x-1/2 overflow-hidden border-[10px] border-white/75 bg-cream shadow-[0_30px_60px_-30px_rgb(91_56_30/0.45)] transition-transform duration-300 ease-out"
        style={layer(-10)}
        aria-hidden="true"
      >
        <MountainLandscape className="absolute inset-0 size-full" withYurt={false} soft />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-milk/70" />
      </div>
      {/* Солнце за аркой */}
      <div
        className="absolute top-[4%] right-[16%] size-[22%] rounded-full bg-[radial-gradient(circle,rgb(250_226_170/0.85),transparent_70%)] blur-sm"
        aria-hidden="true"
      />

      {/* Подиум */}
      <div
        className="absolute bottom-[4%] left-1/2 h-[16%] w-[78%] -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 bottom-0 h-[70%] rounded-[50%] bg-gradient-to-b from-[#f4e9da] to-[#dcc6a8] shadow-[0_24px_40px_-18px_rgb(91_56_30/0.55)]" />
        <div className="absolute inset-x-[7%] top-0 h-[62%] rounded-[50%] bg-gradient-to-b from-white to-[#efe1cd] ring-2 ring-gold/50" />
      </div>

      {/* Золотые светящиеся кольца */}
      <svg
        viewBox="0 0 600 560"
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e7cfa3" stopOpacity="0" />
            <stop offset="0.5" stopColor="#e9b75c" />
            <stop offset="1" stopColor="#e7cfa3" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow)" fill="none" strokeLinecap="round">
          <ellipse
            cx="300"
            cy="330"
            rx="270"
            ry="70"
            transform="rotate(-8 300 330)"
            stroke="url(#ring)"
            strokeWidth="4"
            strokeDasharray="300 120"
            className="animate-orbit"
          />
          <ellipse
            cx="300"
            cy="300"
            rx="230"
            ry="110"
            transform="rotate(12 300 300)"
            stroke="url(#ring)"
            strokeWidth="3"
            strokeDasharray="220 180"
            className="animate-orbit [animation-direction:reverse] [animation-duration:24s]"
          />
        </g>
      </svg>

      {/* Раскрытая книга-мир */}
      <div
        className="absolute bottom-[11%] left-1/2 w-[94%] -translate-x-1/2 transition-transform duration-300 ease-out"
        style={layer(8)}
      >
        <div className="animate-float [animation-duration:7s]">
          <Image
            src={heroBook}
            alt=""
            width={1400}
            height={942}
            priority
            sizes="(min-width: 1024px) 50vw, 94vw"
            className="h-auto w-full drop-shadow-[0_24px_30px_rgb(91_56_30/0.35)]"
          />
        </div>
      </div>

      {/* Объёмные книги из каталога парят вокруг */}
      <div className="pointer-events-none absolute inset-0" style={layer(16)}>
        <HeroScene books={books} />
      </div>

      <Butterfly className="top-[12%] left-[8%] size-12" />
      <Butterfly className="top-[3%] right-[10%] size-10" delay={2.5} />
      <Butterfly className="top-[44%] right-[1%] size-9" delay={5} />
      <Sparkle className="absolute top-[20%] right-[30%] size-3 animate-pulse text-gold" />
      <Sparkle className="absolute bottom-[34%] left-[6%] size-4 animate-pulse text-gold-light [animation-delay:1s]" />
    </div>
  );
}
