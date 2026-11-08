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

/**
 * 3D-книги поверх иллюстрации. Без WebGL сцена просто не показывается —
 * главная иллюстрация и анимации остаются.
 */
export function HeroScene() {
  const [webgl, setWebgl] = useState(false);
  useEffect(() => setWebgl(supportsWebGL()), []);
  return webgl ? <HeroBooks3D /> : null;
}
