'use client';

import { useEffect, useRef } from 'react';

/**
 * Золотые искры над книгой: медленно поднимаются и мерцают.
 * На телефоне их меньше; рисование останавливается, когда сцену не видно,
 * и не запускается при «уменьшить движение».
 */
export function HeroParticles({ className = '' }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = element.getContext('2d');
    if (!context) return;

    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const count = mobile ? 22 : 56;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      element.width = width * dpr;
      element.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.8,
      speed: 0.00025 + Math.random() * 0.0006,
      drift: (Math.random() - 0.5) * 0.0004,
      phase: Math.random() * Math.PI * 2,
    }));

    let visible = true;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) frame = requestAnimationFrame(draw);
    });
    observer.observe(element);

    function draw(time: number) {
      if (!visible || !context) return;
      context.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(time / 1500 + p.phase) * 0.0002;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time / 900 + p.phase));
        const x = p.x * width;
        const y = p.y * height;
        const glow = context.createRadialGradient(x, y, 0, x, y, p.r * 4);
        glow.addColorStop(0, `rgba(255, 222, 150, ${0.9 * twinkle})`);
        glow.addColorStop(1, 'rgba(233, 183, 92, 0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, p.r * 4, 0, Math.PI * 2);
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvas} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}
