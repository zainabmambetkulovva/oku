/**
 * Горный пейзаж: небо, снежные вершины, холмы и юрта. Рисуется в SVG,
 * поэтому лёгкий и чёткий на любом экране. Варианты — для hero, баннера и подвала.
 */
export function MountainLandscape({
  className,
  withYurt = true,
}: {
  className?: string;
  withYurt?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 1200 520"
      className={className}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6efe0" />
          <stop offset="0.65" stopColor="#f3e4c6" />
          <stop offset="1" stopColor="#ecd7b0" />
        </linearGradient>
        <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9c4c0" />
          <stop offset="1" stopColor="#d9d6c6" />
        </linearGradient>
        <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7f9785" />
          <stop offset="1" stopColor="#a9b59a" />
        </linearGradient>
        <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#56794f" />
          <stop offset="1" stopColor="#3e6b4a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="520" fill="url(#sky)" />
      <circle cx="930" cy="120" r="54" fill="#f7dfa6" opacity="0.7" />
      {/* дальние снежные хребты */}
      <path
        d="M0 300 140 190l70 50 110-120 90 80 120-110 110 100 100-70 130 120 90-60 120 90 120-60v300H0z"
        fill="url(#far)"
      />
      <path
        d="m320 120 35 40-18-6-17 18-12-20-28 18zM560 110l40 36-20-6-12 16-14-14-24 10zM900 130l36 34-18-4-16 14-14-12-20 8z"
        fill="#fbf7ef"
        opacity="0.95"
      />
      {/* средний план */}
      <path
        d="M0 360 120 300l110 40 150-90 130 80 140-60 160 70 130-50 140 60 120-30v240H0z"
        fill="url(#mid)"
      />
      {/* ближние холмы */}
      <path d="M0 430c140-50 260-40 380-10s250 30 380-10 300-40 440 10v100H0z" fill="url(#near)" />
      <path d="M0 470c180-30 330-20 470 0s330 20 480-10 180-10 250 5v65H0z" fill="#2a5139" />
      {withYurt && (
        <g transform="translate(860 384)">
          <ellipse cx="60" cy="58" rx="74" ry="8" fill="#1f3d2b" opacity="0.25" />
          <path
            d="M4 56V30c0-4 4-8 10-10l46-18 46 18c6 2 10 6 10 10v26z"
            fill="#f4ead8"
            stroke="#c9b38a"
            strokeWidth="2"
          />
          <path d="M14 20 60 2l46 18" fill="none" stroke="#b8975a" strokeWidth="3" />
          <path d="M4 34h112" stroke="#b8975a" strokeWidth="2" />
          <path d="M48 56V38h24v18z" fill="#8c6b2f" />
          <path d="M60 2V-6" stroke="#8c6b2f" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}

/** Силуэт гор для подвала. */
export function MountainSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 160" className={className} preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 160V90l90-40 80 30 120-70 100 60 90-30 110 50 120-60 100 40 130-50 110 60 150-40v120z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M0 160v-40l120-30 110 30 150-50 120 40 140-30 130 40 120-20 140 30 170-20v80z"
        fill="currentColor"
      />
    </svg>
  );
}
