/** Иконки интерфейса (линейные, 24×24). */
type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const SearchIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
export const HeartIcon = ({
  className = 'size-5',
  filled = false,
}: IconProps & { filled?: boolean }) => (
  <svg {...base} className={className} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const CartIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
    <circle cx="9.5" cy="19.5" r="1.3" />
    <circle cx="17" cy="19.5" r="1.3" />
  </svg>
);
export const UserIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
);
export const MenuIcon = ({ className = 'size-6' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const CloseIcon = ({ className = 'size-6' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const ChevronDown = ({ className = 'size-4' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const PlayIcon = ({ className = 'size-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);
export const PauseIcon = ({ className = 'size-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
export const BackIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
    <text
      x="12"
      y="15.5"
      fontSize="7"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontFamily="sans-serif"
    >
      15
    </text>
  </svg>
);
export const ForwardIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" />
    <text
      x="12"
      y="15.5"
      fontSize="7"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontFamily="sans-serif"
    >
      15
    </text>
  </svg>
);
export const LockIcon = ({ className = 'size-4' }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const VolumeIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);
export const HeadphonesIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </svg>
);
export const GlobeBookIcon = ({ className = 'size-7' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 5.5C6.5 4.5 9.3 4.5 12 6c2.7-1.5 5.5-1.5 8-.5V19c-2.5-1-5.3-1-8 .5-2.7-1.5-5.5-1.5-8-.5z" />
    <path d="M12 6v13.5" />
  </svg>
);
export const TruckIcon = ({ className = 'size-7' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17.5" cy="17.5" r="1.8" />
  </svg>
);
export const ShieldIcon = ({ className = 'size-7' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const PhoneIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);
export const MailIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);
export const InstagramIcon = ({ className = 'size-5' }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" />
  </svg>
);
export const CheckIcon = ({ className = 'size-4' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
