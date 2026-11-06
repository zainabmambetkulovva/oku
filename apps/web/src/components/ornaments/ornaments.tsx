/**
 * Кыргызский орнамент «кочкор мүйүз» (рога барана) — собственная стилизация.
 * Используется в углах блоков и в разделителях заголовков.
 */
const HORN =
  'M50 92V58M50 58c0-16-12-26-24-20-9 5-7 18 3 18 7 0 8-9 2-10M50 58c0-16 12-26 24-20 9 5 7 18-3 18-7 0-8-9-2-10';

export function HornMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
    >
      <path d={HORN} />
      <path d="M38 92h24" />
    </svg>
  );
}

/** Угловой орнамент: четыре мотива вокруг ромба. */
export function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
    >
      <g transform="translate(50 0)">
        <path d={HORN} />
      </g>
      <g transform="translate(150 200) rotate(180)">
        <path d={HORN} />
      </g>
      <g transform="translate(0 150) rotate(-90)">
        <path d={HORN} />
      </g>
      <g transform="translate(200 50) rotate(90)">
        <path d={HORN} />
      </g>
      <path d="M100 82l18 18-18 18-18-18z" />
      <path d="M100 92l8 8-8 8-8-8z" />
    </svg>
  );
}

/** Линия с ромбами — по бокам заголовков секций, как в макете. */
export function DividerLine({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 160 12" className={className} aria-hidden="true" preserveAspectRatio="none">
      <g transform={flip ? 'translate(160 0) scale(-1 1)' : undefined} fill="currentColor">
        <rect x="0" y="5.5" width="140" height="1" />
        <path d="M146 1l5 5-5 5-5-5z" />
        <circle cx="134" cy="6" r="1.6" />
      </g>
    </svg>
  );
}
