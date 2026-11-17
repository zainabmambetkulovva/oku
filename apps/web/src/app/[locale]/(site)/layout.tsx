import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { FlyingButterflies } from '@/components/ornaments/flying-butterflies';
import { InteractionEffects } from '@/components/ui/interaction-effects';
import { Toaster } from '@/components/ui/toaster';
import { StoreSync } from '@/components/layout/store-sync';

/** Страницы магазина: шапка, летающие бабочки и подвал. Админка — со своим макетом. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('nav');
  return (
    <>
      {/* Для клавиатуры: первый Tab — сразу к содержимому, минуя меню */}
      <a
        href="#main"
        className="sr-only z-[70] rounded-full bg-cocoa px-5 py-3 text-sm font-semibold text-milk focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('skipToContent')}
      </a>
      <Header />
      <FlyingButterflies />
      <InteractionEffects />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <Toaster />
      <StoreSync />
    </>
  );
}
