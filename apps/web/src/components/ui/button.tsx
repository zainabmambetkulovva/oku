import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-forest text-milk hover:bg-forest-700 shadow-[0_6px_16px_-8px_rgb(31_61_43/0.8)]',
  outline: 'border border-forest/70 text-forest bg-milk/70 hover:bg-forest hover:text-milk',
  ghost: 'text-forest hover:bg-forest-100',
};

/** Классы кнопки — общие для <button> и ссылок. */
export function buttonClasses(variant: Variant = 'primary', className = '') {
  return [
    'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    className,
  ].join(' ');
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = 'primary', className = '', type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={buttonClasses(variant, className)} {...props} />;
});

export function ArrowRight({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}
