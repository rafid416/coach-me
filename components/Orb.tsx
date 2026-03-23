'use client';

import { useEffect, useRef } from 'react';
import { getSyntheticAmplitude } from '@/lib/amplitude';

export type OrbState = 'idle' | 'speaking' | 'listening' | 'processing' | 'static';
export type OrbSize = 'sm' | 'lg';

interface OrbProps {
  state: OrbState;
  size?: OrbSize;
}

const SIZE_PX: Record<OrbSize, number> = { sm: 120, lg: 240 };

interface Palette {
  primary: string;   // r,g,b
  accent: string;    // r,g,b
  rim: string;       // r,g,b
  core: string[];    // radial gradient stops
}

function getPalette(state: OrbState): Palette {
  switch (state) {
    case 'listening':
      return {
        primary: '0, 210, 200',
        accent:  '80, 255, 245',
        rim:     '0, 240, 220',
        core: ['#030e12', '#041820', '#062030', '#093040'],
      };
    case 'processing':
      return {
        primary: '110, 70, 255',
        accent:  '170, 130, 255',
        rim:     '140, 100, 255',
        core: ['#06030f', '#0d0620', '#130a30', '#180d40'],
      };
    default: // idle, speaking, static
      return {
        primary: '50, 100, 255',
        accent:  '100, 170, 255',
        rim:     '70, 140, 255',
        core: ['#020510', '#030a1e', '#05102e', '#071840'],
      };
  }
}

export default function Orb({ state, size = 'lg' }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef   = useRef<number | null>(null);
  const px = SIZE_PX[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = window.devicePixelRatio || 1;

    // 2× canvas so outer glow fully fades before hitting the edge
    canvas.width  = px * 2 * dpr;
    canvas.height = px * 2 * dpr;
    ctx.scale(dpr, dpr);

    const cx = px;          // centre in drawing coords (= px/2 in CSS px)
    const cy = px;
    const r  = px * 0.40;

    const pal = getPalette(state);
    const numRibbons = size === 'sm' ? 7 : 13;

    function getAmp(t: number): number {
      if (reduced) return 0.5;
      if (state === 'speaking') return getSyntheticAmplitude(t);
      const spd = state === 'listening' ? 0.0018 : state === 'processing' ? 0.0012 : 0.0007;
      return 0.5 + 0.5 * Math.sin(t * spd);
    }

    function drawFrame(t: number) {
      ctx.clearRect(0, 0, px * 2, px * 2);

      const amp = getAmp(t);
      const sr  = r * (1 + amp * 0.07);   // sphere radius, breathing slightly

      // ── Outer soft glow (beyond sphere) ──────────────────────────────────
      const ambR = sr * 1.75;
      const amb  = ctx.createRadialGradient(cx, cy, sr * 0.8, cx, cy, ambR);
      amb.addColorStop(0,   `rgba(${pal.primary}, ${(0.32 + amp * 0.22).toFixed(2)})`);
      amb.addColorStop(0.5, `rgba(${pal.primary}, ${(0.08 + amp * 0.06).toFixed(2)})`);
      amb.addColorStop(1,   'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, ambR, 0, Math.PI * 2);
      ctx.fillStyle = amb;
      ctx.fill();

      // ── Everything inside the sphere ──────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sr, 0, Math.PI * 2);
      ctx.clip();

      // Dark sphere base
      const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr);
      base.addColorStop(0,    pal.core[0]);
      base.addColorStop(0.40, pal.core[1]);
      base.addColorStop(0.75, pal.core[2]);
      base.addColorStop(1,    pal.core[3]);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, px * 2, px * 2);

      // ── Flow ribbons ──────────────────────────────────────────────────────
      if (!reduced) {
        ctx.lineCap = 'round';

        for (let i = 0; i < numRibbons; i++) {
          const frac = i / numRibbons;

          // Each ribbon = a great-circle at a different inclination, slowly drifting
          const tilt  = Math.sin(frac * Math.PI * 2.1 + t * 0.00025) * 0.88;
          const yScale = Math.sqrt(Math.max(0.01, 1 - tilt * tilt));
          const phase = frac * Math.PI * 1.7 + t * (0.00018 + frac * 0.00008);

          // Wave distortion along the ribbon
          const wAmp  = sr * (0.035 + 0.055 * Math.abs(Math.sin(frac * Math.PI + t * 0.0004)));
          const wFreq = 2 + (i % 3);            // 2, 3, or 4 waves around the loop
          const wSpd  = 0.0007 + frac * 0.0003; // each ribbon flows at its own speed

          // Ribbons near equator (tilt ≈ 0) are brighter
          const brightness = 0.18 + 0.55 * (1 - Math.abs(tilt) * 0.85);
          const useAccent  = i % 3 === 0;
          const col        = useAccent ? pal.accent : pal.primary;

          const steps = 90;

          // Pass 1 — wide glow
          ctx.beginPath();
          for (let s = 0; s <= steps; s++) {
            const a   = (s / steps) * Math.PI * 2;
            const wave = Math.sin(a * wFreq + t * wSpd + frac * Math.PI * 2) * wAmp;
            const rr  = sr * 0.87 + wave;
            const x   = cx + rr * Math.cos(a + phase);
            const y   = cy + rr * Math.sin(a + phase) * yScale + tilt * sr * 0.18;
            s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.shadowBlur   = size === 'sm' ? 5 : 10;
          ctx.shadowColor  = `rgba(${col}, 0.9)`;
          ctx.strokeStyle  = `rgba(${col}, ${(brightness * 0.55).toFixed(2)})`;
          ctx.lineWidth    = size === 'sm' ? 2.2 : 4;
          ctx.stroke();

          // Pass 2 — thin bright core (different random-feeling phase offset)
          ctx.beginPath();
          for (let s = 0; s <= steps; s++) {
            const a   = (s / steps) * Math.PI * 2;
            const wave = Math.sin(a * wFreq + t * wSpd + frac * Math.PI * 2) * wAmp;
            const rr  = sr * 0.87 + wave;
            const x   = cx + rr * Math.cos(a + phase);
            const y   = cy + rr * Math.sin(a + phase) * yScale + tilt * sr * 0.18;
            s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.shadowBlur   = 3;
          ctx.shadowColor  = '#ffffff';
          ctx.strokeStyle  = `rgba(200, 230, 255, ${(brightness * 0.75).toFixed(2)})`;
          ctx.lineWidth    = size === 'sm' ? 0.6 : 1.0;
          ctx.stroke();
          ctx.shadowBlur   = 0;
        }
      }

      // ── Rim light — bright edge giving the sphere its 3-D look ───────────
      const rim = ctx.createRadialGradient(cx, cy, sr * 0.60, cx, cy, sr);
      rim.addColorStop(0,    'transparent');
      rim.addColorStop(0.75, `rgba(${pal.rim}, ${(0.06 + amp * 0.05).toFixed(2)})`);
      rim.addColorStop(0.92, `rgba(${pal.rim}, ${(0.30 + amp * 0.18).toFixed(2)})`);
      rim.addColorStop(1,    `rgba(${pal.rim}, ${(0.55 + amp * 0.20).toFixed(2)})`);
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, px * 2, px * 2);

      ctx.restore();

      // ── Specular highlight (top-left) ─────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sr, 0, Math.PI * 2);
      ctx.clip();
      const spec = ctx.createRadialGradient(
        cx - sr * 0.30, cy - sr * 0.34, 0,
        cx - sr * 0.30, cy - sr * 0.34, sr * 0.48
      );
      spec.addColorStop(0, `rgba(255, 255, 255, ${(0.11 + amp * 0.07).toFixed(2)})`);
      spec.addColorStop(1, 'transparent');
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, px * 2, px * 2);
      ctx.restore();

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state, size, px]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: px, height: px, flexShrink: 0 }}
    />
  );
}
