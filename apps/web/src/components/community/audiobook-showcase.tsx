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
        <div className="scroll-row gap-3" role="tablist">
          {audiobooks.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === current}
              onClick={() => setCurrent(index)}
              className={`block w-24 shrink-0 rounded-xl p-1 transition sm:w-28 ${index === current ? 'bg-gold/40 ring-2 ring-gold' : 'saturate-50 hover:saturate-100'}`}
            >
              <span aria-hidden="true" className="block">
                <BookCover
                  slug={item.slug}
                  title={item.title}
                  author={item.author}
                  coverUrl={item.coverUrl}
                  square
                />
              </span>
              <span className="sr-only">{item.title}</span>
            </button>
          ))}
        </div>
      )}
      <AudioPlayer key={audiobook.slug} audiobook={audiobook} />
    </div>
  );
}
