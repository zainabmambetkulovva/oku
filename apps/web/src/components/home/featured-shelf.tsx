'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { FeaturedCover } from '@/lib/featured-covers';
import { formatPrice } from '@/lib/format';
import { ArrowRight } from '../ui/button';
import { HeadphonesIcon } from '../ui/icons';

export interface FeaturedProduct {
  slug: string;
  price: number;
}

export interface FeaturedShelfItem {
  cover: FeaturedCover;
  /** Товары из каталога с тем же названием; null — такого товара пока нет */
  book: FeaturedProduct | null;
  audiobook: FeaturedProduct | null;
}

const AUTOPLAY_MS = 4500;

/** Знаковое расстояние по кругу: соседи слева отрицательные, справа положительные. */
function circularOffset(index: number, active: number, total: number): number {
  let offset = index - active;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

/**
 * Витрина новых книг: объёмные обложки стоят веером, активная — впереди,
 * парит и наклоняется за курсором; витрина сама листается (с паузой),
 * листается свайпом, стрелками клавиатуры и кнопками.
 * При «уменьшить движение» — без автопрокрутки и парения.
 */
export function FeaturedShelf({ items }: { items: FeaturedShelfItem[] }) {
  const t = useTranslations('sections');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const swipe = useRef<number | null>(null);
  const total = items.length;

  const go = useCallback((step: number) => setActive((i) => (i + step + total) % total), [total]);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setEntered(true);
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const autoplay = visible && !paused && !hovered && !focused && !reduced && total > 1;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoplay, go]);

  if (total === 0) return null;
  const current = items[active];

  return (
    <section
      className="relative mt-12 overflow-x-clip py-4"
      aria-labelledby="featured-title"
      data-testid="featured-shelf"
    >
      {/* мягкое золотое свечение за витриной */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(214_168_92/0.28),transparent_65%)] lg:left-[65%]"
        aria-hidden="true"
      />
      <div className="container-page grid items-center gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
        <div className="order-2 lg:order-1">
          <h2
            id="featured-title"
            className="text-[1.75rem] leading-tight font-medium text-cocoa sm:text-[2.05rem]"
          >
            {t('featuredTitle')}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/70">
            {t('featuredSubtitle')}
          </p>

          <div className="mt-6 min-h-[8.5rem]" aria-live={autoplay ? 'off' : 'polite'}>
            <h3
              key={current.cover.key}
              className="font-display text-2xl leading-snug font-semibold text-ink motion-safe:animate-[page-in_0.5s_ease-out]"
              data-testid="featured-title"
            >
              {current.cover.title}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {current.book && (
                <Link
                  href={`/books/${current.book.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-milk transition-colors hover:bg-cocoa-500"
                  data-testid="featured-book-link"
                >
                  {t('featuredBook')} · {formatPrice(current.book.price)} <ArrowRight />
                </Link>
              )}
              {current.audiobook && (
                <Link
                  href={`/audiobooks/${current.audiobook.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-gold bg-gold/15 px-4 py-2 text-sm font-semibold text-cocoa transition-colors hover:bg-gold/30"
                  data-testid="featured-audio-link"
                >
                  <HeadphonesIcon className="size-4" />
                  {t('featuredAudio')} · {formatPrice(current.audiobook.price)}
                </Link>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('prev')}
              className="grid size-10 place-items-center rounded-full border border-cocoa/25 text-cocoa transition-colors hover:bg-cocoa hover:text-milk"
            >
              <ArrowRight className="size-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('next')}
              className="grid size-10 place-items-center rounded-full border border-cocoa/25 text-cocoa transition-colors hover:bg-cocoa hover:text-milk"
            >
              <ArrowRight className="size-4" />
            </button>
            {!reduced && total > 1 && (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-pressed={paused}
                className="ml-1 rounded-full px-3 py-2 text-xs font-semibold text-cocoa/80 underline-offset-4 hover:underline"
              >
                {paused ? t('featuredPlay') : t('featuredPause')}
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-2" role="group" aria-label={t('featuredLabel')}>
            {items.map((item, index) => (
              <button
                key={item.cover.key}
                type="button"
                onClick={() => setActive(index)}
                aria-label={t('featuredShow', { title: item.cover.title })}
                aria-current={index === active ? 'true' : undefined}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === active ? 'w-8 bg-gold' : 'w-2 bg-cocoa/25 hover:bg-cocoa/45'
                }`}
              />
            ))}
          </div>
        </div>

        <div
          ref={stage}
          className="relative order-1 h-[21rem] touch-pan-y select-none sm:h-[25rem] lg:order-2 lg:h-[30rem]"
          style={{ perspective: '1600px' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);
            setTilt({ x: 0, y: 0 });
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') go(-1);
            if (event.key === 'ArrowRight') go(1);
          }}
          onPointerDown={(event) => {
            swipe.current = event.clientX;
          }}
          onPointerUp={(event) => {
            const from = swipe.current;
            swipe.current = null;
            if (from === null) return;
            const dx = event.clientX - from;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
          onPointerMove={(event) => {
            if (reduced || event.pointerType !== 'mouse') return;
            const rect = event.currentTarget.getBoundingClientRect();
            setTilt({
              x: ((event.clientY - rect.top) / rect.height - 0.5) * -10,
              y: ((event.clientX - rect.left) / rect.width - 0.5) * 16,
            });
          }}
        >
          {/* тень-«полка» под книгами */}
          <div
            className="pointer-events-none absolute bottom-[4%] left-1/2 h-6 w-[70%] -translate-x-1/2 rounded-[50%] bg-cocoa-900/25 blur-xl"
            aria-hidden="true"
          />
          {items.map((item, index) => {
            const offset = circularOffset(index, active, total);
            const distance = Math.abs(offset);
            const isActive = offset === 0;
            const hidden = distance > 2;
            const transform = entered
              ? `translate(-50%, -50%) translateX(${offset * 52}%) translateZ(${-distance * 150}px) rotateY(${-offset * 26}deg) scale(${1 - distance * 0.1})`
              : `translate(-50%, -50%) translateY(18%) scale(0.85)`;
            return (
              <button
                key={item.cover.key}
                type="button"
                tabIndex={isActive || hidden ? -1 : 0}
                aria-hidden={isActive || hidden}
                aria-label={t('featuredShow', { title: item.cover.title })}
                onClick={() => setActive(index)}
                className="absolute top-1/2 left-1/2 w-[46%] max-w-[17rem] outline-none focus-visible:ring-2 focus-visible:ring-gold sm:w-[34%] lg:w-[38%]"
                style={{
                  transform,
                  zIndex: 10 - distance,
                  opacity: !entered || hidden ? 0 : 1,
                  filter: `brightness(${1 - distance * 0.12}) saturate(${1 - distance * 0.15})`,
                  pointerEvents: hidden ? 'none' : undefined,
                  transition: reduced
                    ? 'none'
                    : `transform 0.8s cubic-bezier(0.22,0.8,0.2,1) ${entered && !visible ? 0 : index * 0.06}s, opacity 0.6s ease ${index * 0.08}s, filter 0.8s ease`,
                  transformStyle: 'preserve-3d',
                }}
                data-active={isActive || undefined}
                data-testid="featured-cover"
              >
                <span
                  className="block"
                  style={{
                    transform: isActive ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined,
                    transition: 'transform 0.35s ease-out',
                  }}
                >
                  <span className={`relative block ${isActive && !reduced ? 'animate-float' : ''}`}>
                    <img
                      src={item.cover.src}
                      alt={isActive ? item.cover.title : ''}
                      width={item.cover.width}
                      height={item.cover.height}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="h-auto w-full drop-shadow-[0_22px_24px_rgb(43_29_21/0.45)]"
                    />
                    {item.audiobook && (
                      <span
                        className={`absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-cocoa-900 px-2.5 py-1 text-[0.7rem] font-semibold text-gold-light shadow-lg ring-1 ring-gold/50 transition-opacity duration-500 ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                        aria-hidden="true"
                      >
                        <HeadphonesIcon className="size-3.5" />
                        {t('featuredAudio')}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
