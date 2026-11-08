import { Sparkle } from '../ornaments/decor';

interface SectionHeadingProps {
  id: string;
  title: string;
  subtitle?: string;
  /** Ссылка или кнопка справа от заголовка */
  action?: React.ReactNode;
  /** Золотая искра перед заголовком, как у блока бестселлеров */
  sparkle?: boolean;
  className?: string;
}

/** Заголовок секции по макету: слева название с подписью и тонкой линией, справа — действие. */
export function SectionHeading({
  id,
  title,
  subtitle,
  action,
  sparkle = false,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`mb-6 flex items-end justify-between gap-4 sm:mb-8 ${className}`}>
      <div>
        <h2
          id={id}
          className="flex items-center gap-3 text-[1.75rem] leading-tight font-medium text-cocoa sm:text-[2.05rem]"
        >
          {sparkle && <Sparkle className="size-5 shrink-0 text-gold" />}
          {title}
        </h2>
        <span className="mt-2 block h-px w-40 bg-gradient-to-r from-gold/80 to-transparent" />
        {subtitle && <p className="mt-2 text-sm text-ink/70">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
