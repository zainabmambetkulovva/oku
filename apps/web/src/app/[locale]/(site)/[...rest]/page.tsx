import { notFound } from 'next/navigation';

/** Любой неизвестный адрес внутри языка — локализованная страница «не найдено». */
export default function CatchAll() {
  notFound();
}
