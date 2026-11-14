import { CornerOrnament } from '../ornaments/ornaments';

/** Карточка страниц входа, регистрации и восстановления пароля. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page relative flex justify-center py-14 sm:py-20">
      <div className="card relative w-full max-w-md overflow-hidden p-7 sm:p-10">
        <CornerOrnament className="pointer-events-none absolute -top-10 -right-10 size-32 text-gold/30" />
        <h1 className="text-3xl font-medium text-cocoa">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink/70">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

export function FormAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const styles = {
    error: 'bg-[#a3412c]/10 text-[#8a3524]',
    success: 'bg-[#e3ecd5] text-[#3f5a24]',
    info: 'bg-cocoa-100 text-cocoa',
  }[tone];
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </p>
  );
}
