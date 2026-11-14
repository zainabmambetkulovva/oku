'use client';

import { useEffect, useState } from 'react';
import { Butterfly } from './decor';

/** Маршруты полёта: бабочки медленно пересекают экран по разным траекториям. */
const FLIGHTS = [
  { route: 'fly-a', duration: 38, delay: 0, size: 'size-9', start: 'top-[22%] left-[-4rem]' },
  { route: 'fly-b', duration: 46, delay: 9, size: 'size-7', start: 'top-[68%] right-[-4rem]' },
  { route: 'fly-c', duration: 42, delay: 18, size: 'size-8', start: 'top-[40%] left-[-4rem]' },
  { route: 'fly-d', duration: 52, delay: 27, size: 'size-6', start: 'top-[12%] right-[-4rem]' },
];

/**
 * Бабочки летают поверх всей страницы, как в макете. Не мешают кликам, не видны
 * экранным дикторам и не показываются при «уменьшить движение».
 */
export function FlyingButterflies() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {FLIGHTS.map(({ route, duration, delay, size, start }) => (
        <span
          key={route}
          className={`absolute ${start} ${size}`}
          style={{
            animation: `${route} ${duration}s linear ${delay}s infinite both`,
            opacity: 0,
          }}
        >
          <Butterfly className="inset-0 size-full" delay={delay % 5} />
        </span>
      ))}
    </div>
  );
}
