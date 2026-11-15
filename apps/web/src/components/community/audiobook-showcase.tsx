'use client';

import { useState } from 'react';
import type { AudiobookDetails } from '@/lib/types';
import { BookCover } from '../catalog/book-cover';
import { AudioPlayer } from '../home/audio-player';

/** Витрина аудиокниг: выберите обложку — плеер переключится, бесплатные главы играют сразу. */
export function AudiobookShowcase({ audiobooks }: { audiobooks: AudiobookDetails[] }) {
  const [current, setCurrent] = useState(0);
  if (audiobooks.length === 0) return null;
  const audiobook = audiobooks[current] ?? audiobooks[0];

  return (
    <div className="space-y-4" data-testid="audiobook-showcase">
      {audiobooks.length > 1 && (
        <ul className="scroll-row gap-3" role="tablist">
          {audiobooks.map((item, index) => (
            <li key={item.id} className="w-24 shrink-0 sm:w-28">
              <button
                type="button"
                role="tab"
                aria-selected={index === current}
                aria-label={item.title}
                onClick={() => setCurrent(index)}
                className={`block w-full rounded-xl p-1 transition ${index === current ? 'bg-gold/40 ring-2 ring-gold' : 'opacity-75 hover:opacity-100'}`}
              >
                <BookCover
                  slug={item.slug}
                  title={item.title}
                  author={item.author}
                  coverUrl={item.coverUrl}
                  square
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AudioPlayer key={audiobook.slug} audiobook={audiobook} />
    </div>
  );
}
