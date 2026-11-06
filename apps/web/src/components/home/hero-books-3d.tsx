'use client';

import { ContactShadows, Float } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

function Book({
  book,
  position,
  rotation,
  fontsReady,
  still,
}: {
  book: SceneBook;
  position: [number, number, number];
  rotation: [number, number, number];
  fontsReady: boolean;
  still: boolean;
}) {
  const cover = useCoverTexture(book, fontsReady);
  const colors = coverColors(book.slug);
  const materials = useMemo(() => {
    const pages = new THREE.MeshStandardMaterial({ color: '#f5ecda', roughness: 0.9 });
    const spine = new THREE.MeshStandardMaterial({ color: colors.background, roughness: 0.6 });
    const front = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.55 });
    const back = new THREE.MeshStandardMaterial({ color: colors.background, roughness: 0.6 });
    // порядок граней BoxGeometry: +x, -x, +y, -y, +z (лицо), -z
    return [pages, spine, pages, pages, front, back];
  }, [cover, colors.background]);

  const mesh = (
    <mesh position={position} rotation={rotation} material={materials} castShadow>
      <boxGeometry args={BOOK_SIZE} />
    </mesh>
  );
  return still ? (
    mesh
  ) : (
    <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.6}>
      {mesh}
    </Float>
  );
}

/** Плавный поворот всей сцены за курсором. */
function Parallax({ children, still }: { children: React.ReactNode; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, delta) => {
    if (!group.current || still) return;
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      pointer.x * 0.35,
      3,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      -pointer.y * 0.12,
      3,
      delta,
    );
  });
  return <group ref={group}>{children}</group>;
}

const LAYOUT: { position: [number, number, number]; rotation: [number, number, number] }[] = [
  { position: [0, 0.15, 0.6], rotation: [0.05, -0.25, 0.02] },
  { position: [-1.75, -0.2, -0.2], rotation: [0.02, 0.45, -0.08] },
  { position: [1.75, -0.1, -0.3], rotation: [0.04, -0.55, 0.07] },
  { position: [-0.95, 1.05, -1.3], rotation: [0.2, 0.3, 0.16] },
  { position: [1.05, 1.1, -1.5], rotation: [0.16, -0.35, -0.14] },
];

/**
 * 3D-сцена главной: объёмные книги парят и поворачиваются за курсором.
 * Рендер останавливается, когда сцену не видно; при «уменьшить движение» — статика.
 */
export default function HeroBooks3D({ books, label }: { books: SceneBook[]; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const [still, setStill] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setCompact(window.matchMedia('(max-width: 640px)').matches);
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

  const items = books.slice(0, compact ? 3 : 5);

  return (
    <div ref={container} className="size-full" role="img" aria-label={label}>
      <Canvas
        shadows
        dpr={[1, compact ? 1.5 : 1.75]}
        frameloop={visible && !still ? 'always' : 'demand'}
        camera={{ position: [0, 0.3, 6.8], fov: compact ? 40 : 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.6}
          color="#fff4dc"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4, 2, -2]} intensity={0.45} color="#c9d8c6" />
        <Parallax still={still}>
          {items.map((book, index) => (
            <Book
              key={book.slug}
              book={book}
              fontsReady={fontsReady}
              still={still}
              {...LAYOUT[index]}
            />
          ))}
        </Parallax>
        <ContactShadows
          position={[0, -1.45, 0]}
          opacity={0.35}
          scale={9}
          blur={2.6}
          far={3}
          color="#1f3d2b"
        />
      </Canvas>
    </div>
  );
}
