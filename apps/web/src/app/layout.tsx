import type { ReactNode } from 'react';

/** Корневой макет — только обёртка: <html> и <body> задаёт app/[locale]/layout.tsx. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
