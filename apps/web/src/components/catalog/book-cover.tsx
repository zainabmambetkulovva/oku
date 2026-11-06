import { coverColors } from '@/lib/cover-palette';
import { HornMotif } from '../ornaments/ornaments';

interface BookCoverProps {
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  className?: string;
  /** Для аудиокниги — квадратная обложка */
  square?: boolean;
}

/**
 * Обложка книги. Если в админке загружена своя обложка — показываем её,
 * иначе рисуем аккуратную заглушку в цветах палитры с названием и автором.
 */
export function BookCover({
  slug,
  title,
  author,
  coverUrl,
  className = '',
  square = false,
}: BookCoverProps) {
  const ratio = square ? 'aspect-square' : 'aspect-[2/3]';

  if (coverUrl) {
    return (
      // Обычный <img>: обложки приходят с CDN, размеры заранее неизвестны
      <img
        src={coverUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        className={`${ratio} w-full rounded-md object-cover shadow-[4px_6px_14px_-6px_rgb(0_0_0/0.45)] ${className}`}
      />
    );
  }

  const colors = coverColors(slug);
  return (
    <div
      role="img"
      aria-label={title}
      className={`${ratio} relative flex w-full flex-col justify-between overflow-hidden rounded-md p-[9%] shadow-[4px_6px_14px_-6px_rgb(0_0_0/0.45)] ${className}`}
      style={{ background: colors.background, color: colors.text }}
    >
      {/* корешок */}
      <span className="absolute inset-y-0 left-0 w-[6%] bg-black/15" aria-hidden="true" />
      <span className="relative text-[clamp(0.5rem,1.6vw,0.7rem)] uppercase tracking-[0.12em] opacity-80">
        {author}
      </span>
      <HornMotif className="relative mx-auto w-1/3" />
      <span
        className="relative font-display text-[clamp(0.68rem,1.9vw,0.95rem)] leading-tight font-semibold"
        style={{ color: colors.text }}
      >
        {title}
      </span>
      <span
        className="absolute inset-x-[9%] bottom-[5%] h-px"
        style={{ background: colors.accent }}
        aria-hidden="true"
      />
    </div>
  );
}
