'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const HeroBooks3D = dynamic(() => import('./hero-books-3d'), { ssr: false, loading: () => null });

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** 3D только на компьютере с мышью и не самым слабым процессором. */
function capableDevice(): boolean {
  const desktop = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  const cores = navigator.hardwareConcurrency ?? 4;
  return desktop.matches && cores >= 4;
}

/**
 * 3D-книги поверх иллюстрации. На телефонах, планшетах и без WebGL сцена не
 * показывается (и three.js не загружается) — главная иллюстрация и анимации остаются.
 */
export function HeroScene() {
  const [webgl, setWebgl] = useState(false);
  useEffect(() => setWebgl(capableDevice() && supportsWebGL()), []);
  return webgl ? <HeroBooks3D /> : null;
}
