import { DividerLine } from '../ornaments/ornaments';

interface SectionTitleProps {
  id?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

/** Заголовок секции с орнаментальными линиями по бокам, как в макете. */
export function SectionTitle({ id, children, action }: SectionTitleProps) {
  return (
    <div className="mb-6 flex flex-col items-center gap-3 sm:mb-8">
      <div className="flex w-full items-center justify-center gap-3 sm:gap-5">
        <DividerLine className="hidden h-3 w-24 text-gold sm:block md:w-40" />
        <h2 id={id} className="text-center text-2xl font-semibold sm:text-3xl lg:text-[2.1rem]">
          {children}
        </h2>
        <DividerLine className="hidden h-3 w-24 text-gold sm:block md:w-40" flip />
      </div>
      {action}
    </div>
  );
}
