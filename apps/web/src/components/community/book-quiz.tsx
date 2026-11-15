'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetchPage } from '@/lib/api';
import type { AudiobookListItem, BookListItem } from '@/lib/types';
import { Button, buttonClasses } from '../ui/button';
import { MiniCard, type MiniProduct } from './mini-card';

const CATEGORIES = ['psychology', 'self-development', 'islamic-literature', 'kids'] as const;
const FORMATS = ['BOOK', 'AUDIOBOOK', 'ANY'] as const;
const LANGUAGES = ['ky', 'ru', 'ANY'] as const;

type Answers = {
  category?: (typeof CATEGORIES)[number];
  format?: (typeof FORMATS)[number];
  language?: (typeof LANGUAGES)[number];
};

/**
 * Подбор книг из каталога по ответам. Если точных совпадений нет, условия
 * постепенно ослабляются (сначала язык, потом жанр) — и это честно сообщается.
 */
export async function findBooks(answers: Required<Answers>, limit = 3) {
  const tries: { category?: string; language?: string }[] = [
    {
      category: answers.category,
      language: answers.language === 'ANY' ? undefined : answers.language,
    },
    { category: answers.category },
    {},
  ];
  for (const [index, filter] of tries.entries()) {
    const query = new URLSearchParams({ sort: 'popular', limit: String(limit) });
    if (filter.category) query.set('category', filter.category);
    if (filter.language) query.set('language', filter.language);
    const [books, audio] = await Promise.all([
      answers.format === 'AUDIOBOOK'
        ? null
        : apiFetchPage<BookListItem>(`/books?${query.toString()}&inStock=true`).catch(() => null),
      answers.format === 'BOOK'
        ? null
        : apiFetchPage<AudiobookListItem>(`/audiobooks?${query.toString()}`).catch(() => null),
    ]);
    const items: MiniProduct[] = [
      ...(books?.data ?? []).map((book) => ({ type: 'BOOK' as const, ...book })),
      ...(audio?.data ?? []).map((item) => ({ type: 'AUDIOBOOK' as const, ...item })),
    ].slice(0, limit + 1);
    if (items.length > 0) return { items, relaxed: index > 0 };
  }
  return { items: [] as MiniProduct[], relaxed: false };
}

export function BookQuiz() {
  const t = useTranslations('quiz');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<{ items: MiniProduct[]; relaxed: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const questions = [
    { key: 'category', title: t('q1'), options: CATEGORIES, labels: 'q1Options' },
    { key: 'format', title: t('q2'), options: FORMATS, labels: 'q2Options' },
    { key: 'language', title: t('q3'), options: LANGUAGES, labels: 'q3Options' },
  ] as const;

  const restart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  const choose = async (key: keyof Answers, value: string) => {
    const next = { ...answers, [key]: value } as Answers;
    setAnswers(next);
    if (step < questions.length - 1) return setStep(step + 1);
    setLoading(true);
    setResult(await findBooks(next as Required<Answers>));
    setLoading(false);
  };

  const question = questions[step];

  return (
    <section
      id="quiz"
      className="card scroll-mt-24 p-6 sm:p-8"
      aria-labelledby="quiz-title"
      data-testid="quiz"
    >
      <h2 id="quiz-title" className="font-display text-2xl text-cocoa sm:text-[1.9rem]">
        {t('title')}
      </h2>
      {loading ? (
        <p role="status" className="mt-6 animate-pulse text-sm text-muted">
          {t('loading')}
        </p>
      ) : result ? (
        <div className="mt-5" aria-live="polite">
          <p className="font-semibold text-ink">{t('result')}</p>
          {result.relaxed && <p className="mt-1 text-sm text-ink/70">{t('relaxed')}</p>}
          {result.items.length === 0 ? (
            <p className="mt-3 text-sm text-ink/75">{t('empty')}</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {result.items.map((item) => (
                <li key={`${item.type}:${item.slug}`}>
                  <MiniCard product={item} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" onClick={restart}>
              {t('restart')}
            </Button>
            <Link href="/books" className={buttonClasses('primary')}>
              {t('toCatalog')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-ink/70">
            {step === 0 ? t('intro') : t('step', { current: step + 1, total: questions.length })}
          </p>
          <fieldset className="mt-4">
            <legend className="font-semibold text-ink">{question.title}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => void choose(question.key, option)}
                  className="rounded-2xl border border-sand bg-white/70 px-4 py-3 text-left text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-gold hover:bg-white hover:shadow-md"
                >
                  {t(`${question.labels}.${option}`)}
                </button>
              ))}
            </div>
          </fieldset>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="mt-4 text-sm font-semibold text-cocoa underline"
            >
              {t('back')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
