interface LogoProps {
  className?: string;
  /** Цвет линий; по умолчанию — текущий цвет текста */
  title?: string;
}

/**
 * Логотип OKU24 — тонкие скруглённые линии, как в фирменном знаке.
 * Нарисован в SVG, чтобы был чётким на любом экране и в любом цвете.
 */
export function Logo({ className, title = 'OKU24' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 112 30"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{title}</title>
      <circle cx="13" cy="15" r="10" />
      <path d="M31 5v20M44 5 31.5 15.5 44 25" />
      <path d="M51 5v12a8 8 0 0 0 16 0V5" />
      <path d="M74 10c0-3.3 2.5-5.5 6-5.5s6 2.2 6 5.2c0 3-2.2 4.8-4.6 7.1L74 25h12.5" />
      <path d="M102 25V5L91 19.5h15" />
    </svg>
  );
}

/** Знак для иконки сайта: логотип на фирменном фиолетовом круге. */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#2d0a4b" />
      <g
        transform="translate(9 25) scale(0.41)"
        stroke="#fff"
        fill="none"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="13" cy="15" r="10" />
        <path d="M31 5v20M44 5 31.5 15.5 44 25" />
        <path d="M51 5v12a8 8 0 0 0 16 0V5" />
        <path d="M74 10c0-3.3 2.5-5.5 6-5.5s6 2.2 6 5.2c0 3-2.2 4.8-4.6 7.1L74 25h12.5" />
        <path d="M102 25V5L91 19.5h15" />
      </g>
    </svg>
  );
}
