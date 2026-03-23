interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = (current / total) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-end mb-1">
        <span className="text-[#8B92B8] text-xs">
          Question {current} of {total}
        </span>
      </div>
      <div className="w-full h-1 bg-[#1E2235] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#6C63FF] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
