import type { BookDetails } from './types';

/** Начало описания без названия и автора — чтобы подсказка не выдала книгу. */
export function teaser(book: Pick<BookDetails, 'description' | 'title' | 'author'>, length = 140) {
  if (!book.description) return null;
  let text = book.description.replace(/\s+/g, ' ').trim();
  for (const secret of [book.title, book.author, ...book.title.split(/[\s,.:;!?«»"]+/)]) {
    if (secret.length < 4) continue;
    const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escaped, 'giu'), '•••');
  }
  const cut = text.length > length ? text.slice(0, length).replace(/\s+\S*$/, '') : text;
  // Многоточие добавляет шаблон — конечные знаки препинания убираем
  return cut.replace(/[\s.!?…,;:]+$/u, '');
}
