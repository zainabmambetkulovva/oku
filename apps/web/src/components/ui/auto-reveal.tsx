'use client';

import { useEffect } from 'react';

/** Что анимируется в содержимом страницы и в подвале. */
const TITLES = 'h1, h2';
const BLOCKS =
  'h3, h4, p, blockquote, figure, .eyebrow, .card, article, .feature-tile, form, table, [data-ar-item]';
const SCOPE = ['#main', 'footer#contacts'];

/**
 * Появление текста и блоков: при загрузке страницы и по мере прокрутки элементы
 * плавно поднимаются, заголовки «выезжают» из-под маски, соседние — по очереди.
 * Работает для всего сайта без правок в страницах: новые элементы (переход между
 * страницами, подгрузка данных) подхватываются MutationObserver.
 * Анимируются только opacity/transform/clip-path — без нагрузки на телефоны.
 * При «уменьшить движение» CSS-правила не действуют, всё видно сразу.
 */
export function AutoReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('anim-ready')) return;
    root.classList.add('ar-live');

    let queue: HTMLElement[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      // Элементы, вошедшие в экран вместе, появляются по очереди сверху вниз
      queue
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .forEach((element, index) => {
          element.style.setProperty('--ar-delay', `${Math.min(index, 8) * 70}ms`);
          // Атрибут, а не класс: React перезаписывает className при обновлении
          element.setAttribute('data-ar-in', '');
        });
      queue = [];
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          queue.push(entry.target as HTMLElement);
        }
        if (queue.length && !frame) frame = requestAnimationFrame(flush);
      },
      { rootMargin: '0px 0px -6% 0px' },
    );

    const mark = (element: Element) => {
      if (!(element instanceof HTMLElement) || element.dataset.ar !== undefined) return;
      if (element.closest('[data-no-ar], [role="dialog"]')) return;
      element.dataset.ar = element.matches(TITLES) ? 'title' : 'block';
      observer.observe(element);
    };
    const scan = (node: ParentNode) => {
      node.querySelectorAll(`${TITLES}, ${BLOCKS}`).forEach(mark);
    };

    const scopes = SCOPE.map((selector) => document.querySelector(selector)).filter(
      (element): element is Element => element !== null,
    );
    scopes.forEach(scan);

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(`${TITLES}, ${BLOCKS}`)) mark(node);
          scan(node);
        });
      }
    });
    scopes.forEach((scope) => mutations.observe(scope, { childList: true, subtree: true }));

    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
