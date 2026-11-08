'use client';

import { Float } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

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
export default function HeroBooks3D() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

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
          <Floating still={still}>
            <OpenBook
              color="#8d6733"
              position={[-2.05, 1.65, 0]}
              rotation={[0.85, 0.35, 0.3]}
              scale={0.4}
            />
          </Floating>
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
