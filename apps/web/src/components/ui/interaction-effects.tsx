'use client';

import { useEffect, useRef } from 'react';

/**
 * Эффекты для мыши (только компьютер, без «уменьшить движение»):
 * — кнопки с классом .magnetic слегка тянутся к курсору;
 * — мягкий тёплый свет следует за курсором.
 */
export function InteractionEffects() {
  const light = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduced) return;

    let frame = 0;
    let active: HTMLElement | null = null;

    const release = () => {
      if (active) active.style.transform = '';
      active = null;
    };

    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (light.current) {
          light.current.style.transform = `translate3d(${event.clientX - 200}px, ${event.clientY - 200}px, 0)`;
          light.current.style.opacity = '1';
        }
        const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.magnetic');
        if (target !== active) release();
        if (!target) return;
        active = target;
        const rect = target.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
        target.style.transform = `translate3d(${dx * 10}px, ${dy * 8}px, 0)`;
      });
    };
    const onLeave = () => {
      release();
      if (light.current) light.current.style.opacity = '0';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      release();
    };
  }, []);

  return (
    <div
      ref={light}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-20 size-[400px] rounded-full opacity-0 mix-blend-soft-light transition-opacity duration-500"
      style={{ background: 'radial-gradient(circle, rgb(255 236 200 / 0.55), transparent 65%)' }}
    />
  );
}
