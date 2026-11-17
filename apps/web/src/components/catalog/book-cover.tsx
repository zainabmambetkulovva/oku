import { coverColors } from '@/lib/cover-palette';
import { featuredCoverFor } from '@/lib/featured-covers';
import { HornMotif } from '../ornaments/ornaments';
import { HeadphonesIcon } from '../ui/icons';

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
 * Отметка аудиокниги на обложке: наушники и «Аудио» (слово одинаково в KG и RU).
 * На маленьких миниатюрах остаётся только значок.
 */
function AudioBadge() {
  return (
    <span
      className="absolute right-[6%] bottom-[6%] z-10 inline-flex items-center gap-1 rounded-full bg-cocoa-900/85 px-[0.4em] py-[0.25em] text-[clamp(0.5rem,1.4vw,0.72rem)] font-semibold tracking-wide text-gold-light shadow-md ring-1 ring-gold/40 backdrop-blur-sm"
      data-testid="audio-badge"
      aria-hidden="true"
    >
      <HeadphonesIcon className="size-[1.3em]" />
      <span className="hidden @[7rem]:inline">Аудио</span>
    </span>
  );
}

/**
 * Обложка книги. Если в админке загружена своя обложка — показываем её;
 * если для этого названия есть присланная магазином обложка — её;
 * иначе рисуем аккуратную заглушку в цветах палитры с названием и автором.
 * Аудиокниги (square) всегда отмечены значком «Аудио».
 */
export function BookCover(props: BookCoverProps) {
  if (!props.square) return <CoverFace {...props} />;
  return (
    <div className="@container relative w-full">
      <CoverFace {...props} />
      <AudioBadge />
    </div>
  );
}

function CoverFace({
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

  const featured = featuredCoverFor(title);
  if (featured && !square) {
    return (
      <img
        src={featured.flat}
        alt={title}
        loading="lazy"
        decoding="async"
        className={`${ratio} w-full rounded-md object-cover shadow-[4px_6px_14px_-6px_rgb(0_0_0/0.45)] ${className}`}
      />
    );
  }
  if (featured) {
    // Аудиокнига с той же обложкой: книга целиком на тёплом квадратном фоне
    return (
      <div
        className={`${ratio} relative flex w-full items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(circle_at_30%_25%,#5a3a24,#2b1d15_75%)] shadow-[4px_6px_14px_-6px_rgb(0_0_0/0.45)] ${className}`}
      >
        <img
          src={featured.flat}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-[82%] w-auto max-w-[82%] rounded-[3px] object-contain shadow-[0_8px_18px_-6px_rgb(0_0_0/0.7)]"
        />
      </div>
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
      <span className="relative text-[clamp(0.5rem,1.6vw,0.7rem)] uppercase tracking-[0.12em] opacity-95">
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
