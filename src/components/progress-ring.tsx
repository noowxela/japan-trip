export function ProgressRing({
  value,
  total,
  size = 72,
}: {
  value: number;
  total: number;
  size?: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`${value} of ${total} places visited`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#b42318"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-medium leading-none">{value}</span>
        <span className="text-[10px] uppercase tracking-wide text-stone-500">
          /{total}
        </span>
      </div>
    </div>
  );
}
