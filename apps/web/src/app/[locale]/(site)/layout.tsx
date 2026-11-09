import type { ReactNode } from 'react';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { FlyingButterflies } from '@/components/ornaments/flying-butterflies';

/** Страницы магазина: шапка, летающие бабочки и подвал. Админка — со своим макетом. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <FlyingButterflies />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
