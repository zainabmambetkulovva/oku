import { LeafBranch, Sparkle } from '../ornaments/decor';
import { CornerOrnament } from '../ornaments/ornaments';
import { Reveal } from '../ui/reveal';

/** Общий вид информационных страниц: заголовок с орнаментом, вводный текст и содержимое. */
export function PageShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-x-clip pb-6">
      <CornerOrnament className="pointer-events-none absolute top-6 -left-16 hidden size-44 text-gold/35 md:block" />
      <LeafBranch
        className="pointer-events-none absolute top-10 -right-4 hidden h-40 w-28 lg:block"
        flip
      />
      <header className="container-page pt-12 pb-8 text-center sm:pt-16">
        <Sparkle className="mx-auto size-5 text-gold" />
        <h1 className="mt-4 text-[2.3rem] leading-tight font-medium text-cocoa sm:text-[3rem]">
          {title}
        </h1>
        <span className="mx-auto mt-4 block h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent" />
        {lead && (
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/75 sm:text-lg">
            {lead}
          </p>
        )}
      </header>
      <Reveal className="container-page">{children}</Reveal>
    </div>
  );
}

/** Карточка-раздел с заголовком. */
export function PageSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card lift p-6 sm:p-8">
      <h2 className="text-xl font-medium text-cocoa sm:text-2xl">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-ink/80 sm:text-base">{children}</div>
    </section>
  );
}
