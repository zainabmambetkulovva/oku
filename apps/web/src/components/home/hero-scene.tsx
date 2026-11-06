'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { BookCover } from '../catalog/book-cover';
import type { SceneBook } from './hero-books-3d';

const HeroBooks3D = dynamic(() => import('./hero-books-3d'), { ssr: false, loading: () => null });

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Статичная версия: стопка обложек — пока грузится 3D или если WebGL недоступен. */
function StaticBooks({ books }: { books: SceneBook[] }) {
  return (
    <div
      className="relative mx-auto flex h-full max-w-md items-center justify-center"
      aria-hidden="true"
    >
      {books.slice(0, 3).map((book, index) => (
        <div
          key={book.slug}
          className="absolute w-[34%] animate-float"
          style={{
            transform: `translateX(${(index - 1) * 70}%) rotate(${(index - 1) * 8}deg)`,
            animationDelay: `${index * 0.6}s`,
            zIndex: index === 1 ? 2 : 1,
          }}
        >
          <BookCover slug={book.slug} title={book.title} author={book.author} coverUrl={null} />
        </div>
      ))}
    </div>
  );
}

export function HeroScene({ books, label }: { books: SceneBook[]; label: string }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(supportsWebGL()), []);

  if (books.length === 0) return null;
  return webgl ? <HeroBooks3D books={books} label={label} /> : <StaticBooks books={books} />;
}
