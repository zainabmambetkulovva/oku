'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { coverColors } from '@/lib/cover-palette';
import { BookCover } from '../catalog/book-cover';

interface Book3DProps {
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  /** Толщина корешка зависит от числа страниц */
  pages?: number | null;
}

const INITIAL = { x: -6, y: -26 };

/**
 * Объёмная книга (CSS 3D): обложка, корешок, обрез страниц, задняя обложка.
 * Поворачивается мышью, пальцем и стрелками клавиатуры; «Вернуть» — исходное положение.
 * Пока книгу не трогают, она слегка покачивается (кроме «уменьшить движение»).
 */
export function Book3D({ slug, title, author, coverUrl, pages }: Book3DProps) {
  const t = useTranslations('productPage');
  const colors = coverColors(slug);
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [width, setWidth] = useState(280);
  const [angle, setAngle] = useState(INITIAL);
  const [dragging, setDragging] = useState(false);
  const depth = Math.round(Math.min(56, Math.max(20, (pages ?? 240) / 9)));

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rotate = (dx: number, dy: number) =>
    setAngle((a) => ({ y: a.y + dy, x: Math.max(-30, Math.min(30, a.x + dx)) }));

  return (
    <div className="flex flex-col items-center">
      <div
        ref={box}
        role="img"
        tabIndex={0}
        aria-label={`${title} — ${author}. ${t('rotate')}`}
        data-testid="book-3d"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') rotate(0, -15);
          if (event.key === 'ArrowRight') rotate(0, 15);
          if (event.key === 'ArrowUp') rotate(8, 0);
          if (event.key === 'ArrowDown') rotate(-8, 0);
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          start.current = { px: event.clientX, py: event.clientY, ...angle };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const from = start.current;
          if (!from) return;
          setAngle({
            y: from.y + (event.clientX - from.px) * 0.6,
            x: Math.max(-30, Math.min(30, from.x - (event.clientY - from.py) * 0.3)),
          });
        }}
        onPointerUp={() => {
          start.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
        }}
        className="relative w-[min(19rem,52vw)] cursor-grab touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing"
        style={{ perspective: '1400px' }}
      >
        <div
          className={dragging ? '' : 'motion-safe:animate-[book-sway_7s_ease-in-out_infinite]'}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="relative aspect-[2/3] w-full"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)`,
              transition: dragging ? 'none' : 'transform 0.6s cubic-bezier(0.2,0.7,0.2,1)',
            }}
          >
            {/* Лицевая обложка */}
            <div
              className="absolute inset-0 overflow-hidden rounded-r-md shadow-[inset_4px_0_6px_rgb(0_0_0/0.25)]"
              style={{ transform: `translateZ(${depth / 2}px)`, backfaceVisibility: 'hidden' }}
            >
              <BookCover
                slug={slug}
                title={title}
                author={author}
                coverUrl={coverUrl}
                className="size-full"
              />
            </div>
            {/* Задняя обложка */}
            <div
              className="absolute inset-0 rounded-l-md"
              style={{
                transform: `rotateY(180deg) translateZ(${depth / 2}px)`,
                background: colors.background,
                backfaceVisibility: 'hidden',
              }}
            />
            {/* Корешок (слева) */}
            <div
              className="absolute top-0 h-full"
              style={{
                width: depth,
                left: -depth / 2,
                transform: `rotateY(-90deg)`,
                background: `linear-gradient(90deg, rgb(0 0 0 / 0.3), ${colors.background} 25%, ${colors.background} 75%, rgb(0 0 0 / 0.35))`,
              }}
            />
            {/* Обрез страниц (справа) */}
            <div
              className="absolute top-[1%] h-[98%]"
              style={{
                width: depth - 2,
                left: width - (depth - 2) / 2,
                transform: `rotateY(90deg)`,
                background: 'repeating-linear-gradient(90deg, #fbf3e3 0 2px, #e6d4b7 2px 3px)',
              }}
            />
          </div>
        </div>
      </div>
      <div
        className="mt-4 h-6 w-[min(16rem,44vw)] rounded-[50%] bg-[radial-gradient(ellipse,rgb(91_56_30/0.35),transparent_70%)]"
        aria-hidden="true"
      />
      <p className="mt-2 text-xs text-muted">{t('rotate')}</p>
      <button
        type="button"
        onClick={() => setAngle(INITIAL)}
        className="mt-1 text-xs font-semibold text-cocoa underline"
      >
        {t('resetView')}
      </button>
    </div>
  );
}
