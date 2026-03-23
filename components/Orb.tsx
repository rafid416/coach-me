'use client';

import { useEffect, useRef } from 'react';
import { getSyntheticAmplitude } from '@/lib/amplitude';

export type OrbState = 'idle' | 'speaking' | 'listening' | 'processing' | 'static';
export type OrbSize = 'sm' | 'lg';

interface OrbProps {
  state: OrbState;
  size?: OrbSize;
}

const SIZE_PX: Record<OrbSize, number> = { sm: 80, lg: 160 };

const GRADIENTS: Record<OrbState, string> = {
  idle:       'radial-gradient(circle at 35% 35%, #9B95FF, #6C63FF 50%, #3D35CC)',
  speaking:   'radial-gradient(circle at 35% 35%, #9B95FF, #6C63FF 50%, #3D35CC)',
  listening:  'radial-gradient(circle at 35% 35%, #5FFFF8, #00D4C8 50%, #008F8A)',
  processing: 'radial-gradient(circle at 35% 35%, #8580CC, #5A54B8 50%, #2E2A7A)',
  static:     'radial-gradient(circle at 35% 35%, #9B95FF, #6C63FF 50%, #3D35CC)',
};

const GLOW: Record<OrbState, string> = {
  idle:       '0 0 30px 6px rgba(108, 99, 255, 0.35)',
  speaking:   '0 0 50px 14px rgba(108, 99, 255, 0.6)',
  listening:  '0 0 40px 10px rgba(0, 212, 200, 0.45)',
  processing: '0 0 24px 4px rgba(90, 84, 184, 0.3)',
  static:     '0 0 28px 6px rgba(108, 99, 255, 0.3)',
};

const ANIMATION_CLASS: Record<OrbState, string> = {
  idle:       'orb orb-breathe',
  speaking:   'orb',
  listening:  'orb orb-listen',
  processing: 'orb orb-think',
  static:     'orb',
};

export default function Orb({ state, size = 'lg' }: OrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const px = SIZE_PX[size];

  // rAF loop for speaking state
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (state === 'speaking' && !prefersReduced) {
      const animate = () => {
        const t = performance.now();
        const amplitude = getSyntheticAmplitude(t);
        const scale = 1.0 + amplitude * 0.12;
        const glowOpacity = 0.4 + amplitude * 0.4;

        if (orbRef.current) {
          orbRef.current.style.transform = `scale(${scale})`;
          orbRef.current.style.boxShadow = `0 0 50px 14px rgba(108, 99, 255, ${glowOpacity})`;
        }

        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Reset inline styles when not speaking
      if (orbRef.current) {
        orbRef.current.style.transform = '';
        orbRef.current.style.boxShadow = GLOW[state];
      }
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state]);

  return (
    <div
      ref={orbRef}
      aria-hidden="true"
      className={ANIMATION_CLASS[state]}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: GRADIENTS[state],
        boxShadow: GLOW[state],
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
        flexShrink: 0,
      }}
    />
  );
}
