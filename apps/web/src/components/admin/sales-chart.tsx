'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import type { SalesSeries } from '@/lib/admin-api';

/**
 * Выручка по дням: тонкие столбцы одного цвета, скруглённые сверху,
 * подсказка при наведении и фокусе; для экранных дикторов — таблица.
 */
export function SalesChart({
  data,
  title,
  empty,
}: {
  data: SalesSeries;
  title: string;
  empty: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const points = data.series;
  const max = Math.max(...points.map((point) => point.revenue), 0);
  const width = 600;
  const height = 160;
  const step = width / Math.max(points.length, 1);
  const barWidth = Math.max(4, Math.min(14, step - 4));
  const day = (period: string) =>
    new Date(`${period}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  return (
    <figure className="card p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-sm font-bold text-cocoa">{formatPrice(data.totalRevenue)}</span>
      </figcaption>
      {max === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{empty}</p>
      ) : (
        <div className="relative mt-4">
          <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full" aria-hidden="true">
            <line x1="0" x2={width} y1={height} y2={height} stroke="#d8b898" strokeWidth="1" />
            {points.map((point, index) => {
              const barHeight =
                point.revenue > 0 ? Math.max(4, (point.revenue / max) * (height - 8)) : 0;
              const x = index * step + (step - barWidth) / 2;
              return (
                <g key={point.period}>
                  <rect
                    x={index * step}
                    y={0}
                    width={step}
                    height={height}
                    fill="transparent"
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                  />
                  {barHeight > 0 && (
                    <path
                      d={`M${x},${height} V${height - barHeight + 4} q0,-4 4,-4 h${barWidth - 8} q4,0 4,4 V${height} Z`}
                      fill={active === index ? '#c49a5e' : '#7f5f47'}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
            {[0, Math.floor(points.length / 2), points.length - 1].map((index) =>
              points[index] ? (
                <text
                  key={index}
                  x={index * step + step / 2}
                  y={height + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#8a7262"
                >
                  {day(points[index].period)}
                </text>
              ) : null,
            )}
          </svg>
          {active !== null && points[active] && (
            <div
              className="pointer-events-none absolute -top-2 rounded-xl bg-cocoa px-3 py-2 text-xs text-milk shadow-lg"
              style={{
                left: `${((active + 0.5) / points.length) * 100}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div>{day(points[active].period)}</div>
              <div className="font-semibold">{formatPrice(points[active].revenue)}</div>
            </div>
          )}
          <table className="sr-only">
            <caption>{title}</caption>
            <tbody>
              {points.map((point) => (
                <tr key={point.period}>
                  <th scope="row">{day(point.period)}</th>
                  <td>{formatPrice(point.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
