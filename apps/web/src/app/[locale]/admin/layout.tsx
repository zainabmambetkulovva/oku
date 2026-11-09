import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminShell>{children}</AdminShell>;
}
