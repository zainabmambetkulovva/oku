/**
 * Мелкий декор из макета: искры, бабочки и ветки с листьями.
 * Всё в SVG и только для украшения — скрыто от экранных дикторов.
 */

/** Четырёхлучевая искра рядом с заголовками. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 0c.7 6.4 4.9 10.8 12 12-7.1 1.2-11.3 5.6-12 12-.7-6.4-4.9-10.8-12-12C7.1 10.8 11.3 6.4 12 0Z" />
    </svg>
  );
}

/** Бабочка: крылья взмахивают, сама она медленно дрейфует. */
export function Butterfly({
  className,
  delay = 0,
}: {
  className?: string;
  /** Сдвиг анимации, чтобы бабочки двигались не синхронно */
  delay?: number;
}) {
  return (
    <span
      className={`pointer-events-none absolute block animate-drift ${className ?? ''}`}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 40" className="size-full overflow-visible">
        <defs>
          <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fdf1d8" />
            <stop offset="1" stopColor="#d9a961" />
          </linearGradient>
        </defs>
        <g
          className="origin-center animate-flutter"
          style={{ transformBox: 'fill-box', animationDelay: `${delay / 3}s` }}
        >
          <path
            d="M24 20C19 6 6 2 3 8c-3 6 5 12 15 13-8 2-12 9-8 13 4 3 11-2 14-13Z"
            fill="url(#wing)"
            stroke="#a77a3c"
            strokeWidth="1"
          />
          <path
            d="M24 20c5-14 18-18 21-12 3 6-5 12-15 13 8 2 12 9 8 13-4 3-11-2-14-13Z"
            fill="url(#wing)"
            stroke="#c49a5e"
            strokeWidth="0.8"
          />
        </g>
        <path d="M24 12v18" stroke="#8d6733" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Ветка с листьями по краям секций. */
export function LeafBranch({ className, flip = false }: { className?: string; flip?: boolean }) {
  const leaves = [
    { x: 30, y: 30, r: -35 },
    { x: 52, y: 52, r: 20 },
    { x: 66, y: 82, r: -30 },
    { x: 88, y: 104, r: 25 },
    { x: 100, y: 136, r: -20 },
  ];
  return (
    <svg
      viewBox="0 0 140 180"
      className={className}
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M10 6c30 40 60 70 80 110 10 20 18 40 22 62"
        fill="none"
        stroke="#8a7a4a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {leaves.map(({ x, y, r }, index) => (
        <path
          key={index}
          d="M0 0c10-14 30-16 40-6-10 14-30 16-40 6Z"
          transform={`translate(${x} ${y}) rotate(${r})`}
          fill={index % 2 ? '#7d8a4e' : '#93a062'}
          opacity="0.9"
        />
      ))}
    </svg>
  );
}
