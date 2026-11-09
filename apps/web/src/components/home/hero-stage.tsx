'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Butterfly, Sparkle } from '../ornaments/decor';
import { HeroScene } from './hero-scene';
import { heroBook } from '@/assets/illustrations';

/**
 * Сцена первого экрана: арка с горами, подиум, раскрытая книга-мир, золотые кольца,
 * бабочки и объёмные 3D-книги вокруг. Слои слегка смещаются за курсором (параллакс);
 * при «уменьшить движение» всё стоит на месте.
 */
export function HeroStage({ label }: { label: string }) {
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
      className="relative mx-auto aspect-[1.3/1] w-full max-w-[44rem] select-none lg:-mr-10 lg:max-w-none xl:-mr-20"
    >
      {/* Каменные арки за сценой, внутри — светлое небо */}
      <div
        className="arch absolute top-[1%] left-1/2 h-[96%] w-[86%] -translate-x-1/2 [mask-image:linear-gradient(to_bottom,black_55%,transparent_96%)] border-[18px] border-[#f6e2cf]/70 bg-gradient-to-b from-[#f3dcc7]/60 to-transparent shadow-[inset_0_0_40px_rgb(160_110_70/0.12)]"
        style={layer(-6)}
        aria-hidden="true"
      />
      <div
        className="arch absolute top-[5%] left-1/2 h-[80%] w-[58%] -translate-x-1/2 [mask-image:linear-gradient(to_bottom,black_55%,transparent_96%)] border-[14px] border-[#f8e8d8] bg-[radial-gradient(ellipse_at_50%_35%,#fffaf2_0%,#fbe7d3_45%,#f1d3b8_100%)] shadow-[0_30px_60px_-30px_rgb(91_56_30/0.45),inset_0_0_30px_rgb(160_110_70/0.15)] transition-transform duration-300 ease-out"
        style={layer(-10)}
        aria-hidden="true"
      />
      {/* Солнце за аркой */}
      <div
        className="absolute top-[6%] left-1/2 size-[34%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_236_200/0.9),transparent_70%)] blur-md"
        aria-hidden="true"
      />

      {/* Подиум */}
      <div
        className="absolute bottom-[3%] left-1/2 h-[17%] w-[66%] -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 bottom-0 h-[70%] rounded-[50%] bg-gradient-to-b from-[#f6e4d2] to-[#d9b796] shadow-[0_28px_44px_-18px_rgb(91_56_30/0.6)]" />
        <div className="absolute inset-x-[7%] top-0 h-[62%] rounded-[50%] bg-gradient-to-b from-[#fff6ec] to-[#efd6bd] shadow-[0_0_24px_rgb(242_190_110/0.55)] ring-2 ring-[#e9b86a]/70" />
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
        className="absolute bottom-[12%] left-1/2 w-[84%] -translate-x-1/2 transition-transform duration-300 ease-out"
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

      {/* Раскрытые 3D-книги парят вокруг */}
      <div className="pointer-events-none absolute inset-0" style={layer(16)}>
        <HeroScene />
      </div>

      <Butterfly className="top-[12%] left-[8%] size-12" />
      <Butterfly className="top-[3%] right-[10%] size-10" delay={2.5} />
      <Butterfly className="top-[44%] right-[1%] size-9" delay={5} />
      <Sparkle className="absolute top-[20%] right-[30%] size-3 animate-pulse text-gold" />
      <Sparkle className="absolute bottom-[34%] left-[6%] size-4 animate-pulse text-gold-light [animation-delay:1s]" />
    </div>
  );
}
