'use client';

import { Float } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { coverColors } from '@/lib/cover-palette';

export interface SceneBook {
  slug: string;
  title: string;
  author: string;
}

const BOOK_SIZE: [number, number, number] = [1.35, 2, 0.26];

/** Переносит название по словам для обложки. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Обложка-текстура: цвет, орнамент, название и автор. */
function useCoverTexture(book: SceneBook, ready: boolean) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 760;
    const ctx = canvas.getContext('2d')!;
    const colors = coverColors(book.slug);

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, 26, canvas.height);

    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, canvas.width - 92, canvas.height - 92);

    // орнамент «кочкор мүйүз»
    ctx.save();
    ctx.translate(canvas.width / 2 - 60, 250);
    ctx.scale(1.2, 1.2);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke(
      new Path2D(
        'M50 92V58M50 58c0-16-12-26-24-20-9 5-7 18 3 18 7 0 8-9 2-10M50 58c0-16 12-26 24-20 9 5 7 18-3 18-7 0-8-9-2-10M38 92h24',
      ),
    );
    ctx.restore();

    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.font = '600 22px "Manrope Variable", sans-serif';
    ctx.fillText(book.author.toUpperCase(), canvas.width / 2, 120, canvas.width - 140);

    ctx.font = '700 50px "Noto Serif Display", Georgia, serif';
    const lines = wrapText(ctx, book.title, canvas.width - 140);
    lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, 520 + index * 58));

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
    // ready — перерисовать, когда загрузились шрифты
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.slug, book.title, book.author, ready]);
}

/** Закрытая книга с обложкой из каталога. */
function ClosedBook({
  book,
  fontsReady,
  ...transform
}: {
  book: SceneBook;
  fontsReady: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const cover = useCoverTexture(book, fontsReady);
  const colors = coverColors(book.slug);
  const materials = useMemo(() => {
    const pages = new THREE.MeshStandardMaterial({ color: '#f7eedf', roughness: 0.9 });
    const spine = new THREE.MeshStandardMaterial({ color: colors.background, roughness: 0.6 });
    const front = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.55 });
    // порядок граней BoxGeometry: +x, -x, +y, -y, +z (лицо), -z
    return [pages, spine, pages, pages, front, spine];
  }, [cover, colors.background]);

  return (
    <mesh {...transform} material={materials}>
      <boxGeometry args={BOOK_SIZE} />
    </mesh>
  );
}

/** Раскрытая книга: две стопки страниц под углом и обложка снизу. */
function OpenBook({
  color,
  ...transform
}: {
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const pages = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fff7e8',
        emissive: '#f3dfbf',
        emissiveIntensity: 0.35,
        roughness: 0.85,
      }),
    [],
  );
  const cover = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 }),
    [color],
  );
  const half = (side: 1 | -1) => (
    <group rotation={[0, 0, side * -0.32]}>
      <mesh position={[side * 0.68, 0.06, 0]} material={pages}>
        <boxGeometry args={[1.3, 0.12, 1.9]} />
      </mesh>
      <mesh position={[side * 0.7, -0.02, 0]} material={cover}>
        <boxGeometry args={[1.42, 0.04, 2]} />
      </mesh>
    </group>
  );
  return (
    <group {...transform}>
      {half(-1)}
      {half(1)}
    </group>
  );
}

function Floating({ children, still }: { children: React.ReactNode; still: boolean }) {
  return still ? (
    <>{children}</>
  ) : (
    <Float speed={1.3} rotationIntensity={0.45} floatIntensity={0.8}>
      {children}
    </Float>
  );
}

/** Медленный общий наклон, чтобы книги «дышали» даже без движения мыши. */
function Drift({ children, still }: { children: React.ReactNode; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || still) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.12;
  });
  return <group ref={group}>{children}</group>;
}

/**
 * 3D-книги вокруг главной иллюстрации: закрытая книга из каталога и раскрытые книги.
 * Рендер останавливается, когда сцену не видно; при «уменьшить движение» — статика.
 */
export default function HeroBooks3D({ books }: { books: SceneBook[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Холст рисует текст сам: шрифты с кыргызскими буквами нужно загрузить явно
    const sample = 'АаБбҮүӨөҢң';
    void Promise.all([
      document.fonts?.load(`700 50px "Noto Serif Display"`, sample),
      document.fonts?.load(`600 22px "Manrope Variable"`, sample),
    ])
      .catch(() => undefined)
      .then(() => setFontsReady(true));
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const [first, second] = books;

  return (
    <div ref={container} className="size-full" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        frameloop={visible && !still ? 'always' : 'demand'}
        camera={{ position: [0, 0, 7], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} color="#fff1d6" />
        <directionalLight position={[-4, 2, -2]} intensity={0.4} color="#f2d9b5" />
        <Drift still={still}>
          {first && (
            <Floating still={still}>
              <ClosedBook
                book={first}
                fontsReady={fontsReady}
                position={[-2.05, 1.55, 0]}
                rotation={[0.15, 0.55, 0.2]}
                scale={0.42}
              />
            </Floating>
          )}
          {second && (
            <Floating still={still}>
              <ClosedBook
                book={second}
                fontsReady={fontsReady}
                position={[2.0, 0.35, 0.4]}
                rotation={[-0.1, -0.6, -0.18]}
                scale={0.34}
              />
            </Floating>
          )}
          <Floating still={still}>
            <OpenBook
              color="#8d6733"
              position={[1.95, 1.75, -0.3]}
              rotation={[0.9, -0.3, -0.25]}
              scale={0.36}
            />
          </Floating>
          <Floating still={still}>
            <OpenBook
              color="#56351f"
              position={[-2.05, 0.35, -0.4]}
              rotation={[1.05, 0.35, 0.3]}
              scale={0.26}
            />
          </Floating>
        </Drift>
      </Canvas>
    </div>
  );
}
