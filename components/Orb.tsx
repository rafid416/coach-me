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

interface Colors {
  inner: string;
  mid: string;
  outer: string;
  lightning: string;
  glow: string; // r,g,b string for rgba()
}

function getColors(state: OrbState): Colors {
  switch (state) {
    case 'listening':
      return {
        inner: '#88ffff',
        mid: '#00aacc',
        outer: '#003344',
        lightning: '#00ffff',
        glow: '0, 212, 200',
      };
    case 'processing':
      return {
        inner: '#aaaaff',
        mid: '#5555cc',
        outer: '#111133',
        lightning: '#8888ff',
        glow: '100, 80, 255',
      };
    default: // idle, speaking, static
      return {
        inner: '#6699ff',
        mid: '#1133cc',
        outer: '#020b28',
        lightning: '#44aaff',
        glow: '68, 130, 255',
      };
  }
}

// Fractal midpoint displacement — adds points to the current canvas path
function bolt(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  spread: number,
  depth: number
): void {
  if (depth === 0) { ctx.lineTo(x2, y2); return; }
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * spread;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * spread;
  bolt(ctx, x1, y1, mx, my, spread / 2, depth - 1);
  bolt(ctx, mx, my, x2, y2, spread / 2, depth - 1);
}

export default function Orb({ state, size = 'lg' }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const px = SIZE_PX[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = window.devicePixelRatio || 1;
    // 2× buffer so the outer glow fades to transparent before hitting the edge
    canvas.width = px * 2 * dpr;
    canvas.height = px * 2 * dpr;
    ctx.scale(dpr, dpr);

    // Center lives at (px, px) in drawing coords → (px/2, px/2) in CSS pixels
    const cx = px;
    const cy = px;
    const r = px * 0.42;
    const colors = getColors(state);
    const numBolts = size === 'sm' ? 4 : 7;

    function drawFrame(time: number) {
      ctx.clearRect(0, 0, px, px);

      // Amplitude drives pulsation
      let amp: number;
      if (prefersReduced) {
        amp = 0.5;
      } else if (state === 'speaking') {
        amp = getSyntheticAmplitude(time);
      } else {
        const speed =
          state === 'listening'  ? 0.0020 :
          state === 'processing' ? 0.0014 : 0.0008;
        amp = 0.5 + 0.5 * Math.sin(time * speed);
      }

      const sr = r * (1 + amp * 0.09); // scaled sphere radius

      // ── Outer ambient glow ────────────────────────────────────────────────
      const ambR = sr * 1.9;
      const ambient = ctx.createRadialGradient(cx, cy, sr * 0.85, cx, cy, ambR);
      ambient.addColorStop(0, `rgba(${colors.glow}, ${(0.38 + amp * 0.28).toFixed(2)})`);
      ambient.addColorStop(0.5, `rgba(${colors.glow}, ${(0.12 + amp * 0.1).toFixed(2)})`);
      ambient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, ambR, 0, Math.PI * 2);
      ctx.fillStyle = ambient;
      ctx.fill();

      // ── Clip everything below to the sphere ──────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sr, 0, Math.PI * 2);
      ctx.clip();

      // Base sphere gradient
      const base = ctx.createRadialGradient(
        cx - r * 0.2, cy - r * 0.25, r * 0.04,
        cx, cy, r * 1.05
      );
      base.addColorStop(0,    colors.inner);
      base.addColorStop(0.30, colors.mid);
      base.addColorStop(0.72, colors.outer);
      base.addColorStop(1,    '#000308');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, px, px);

      // ── Lightning bolts ───────────────────────────────────────────────────
      if (!prefersReduced) {
        const spread = r * (0.28 + amp * 0.18);
        const rotation = time * 0.00022;

        for (let i = 0; i < numBolts; i++) {
          const angle = (Math.PI * 2 * i) / numBolts + rotation;
          const ex = cx + Math.cos(angle) * r * 0.9;
          const ey = cy + Math.sin(angle) * r * 0.9;

          // Glow pass — thick + blurred
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          bolt(ctx, cx, cy, ex, ey, spread, 5);
          ctx.shadowBlur = size === 'sm' ? 8 : 16;
          ctx.shadowColor = colors.lightning;
          ctx.strokeStyle = `rgba(${colors.glow}, 0.55)`;
          ctx.lineWidth = size === 'sm' ? 1.5 : 2.8;
          ctx.stroke();

          // Core pass — thin + white-hot (different random path = natural look)
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          bolt(ctx, cx, cy, ex, ey, spread, 5);
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ffffff';
          ctx.strokeStyle = 'rgba(210, 235, 255, 0.92)';
          ctx.lineWidth = size === 'sm' ? 0.5 : 0.9;
          ctx.stroke();

          ctx.shadowBlur = 0;
        }
      }

      // Inner core luminance
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
      core.addColorStop(0, `rgba(180, 215, 255, ${(0.10 + amp * 0.18).toFixed(2)})`);
      core.addColorStop(1, 'transparent');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, px, px);

      ctx.restore();

      // ── Specular highlight (top-left, outside clip) ───────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sr, 0, Math.PI * 2);
      ctx.clip();
      const spec = ctx.createRadialGradient(
        cx - r * 0.28, cy - r * 0.32, 0,
        cx - r * 0.28, cy - r * 0.32, r * 0.46
      );
      spec.addColorStop(0, `rgba(255, 255, 255, ${(0.10 + amp * 0.07).toFixed(2)})`);
      spec.addColorStop(1, 'transparent');
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, px, px);
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
