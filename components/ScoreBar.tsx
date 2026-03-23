'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreBarProps {
  label: string;
  score: number;
  index: number;
}

function getColor(score: number): string {
  if (score >= 7) return '#4ADE80';
  if (score >= 4) return '#FBBF24';
  return '#F87171';
}

export default function ScoreBar({ label, score, index }: ScoreBarProps) {
  const [width, setWidth] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const timer = setTimeout(() => {
      setWidth(score * 10);
    }, index * 100);
    return () => clearTimeout(timer);
  }, [score, index]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-[#8B92B8] text-sm w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-[#1E2235] rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: getColor(score),
            transition: 'width 600ms ease-out',
          }}
        />
      </div>
      <span className="text-[#F0F2FF] text-sm w-10 text-right flex-shrink-0">
        {score}/10
      </span>
    </div>
  );
}
