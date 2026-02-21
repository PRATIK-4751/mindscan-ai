"use client";

interface RiskGaugeProps {
  score: number;
  riskLevel: string;
}

export default function RiskGauge({ score, riskLevel }: RiskGaugeProps) {
  const radius = 120;
  const circumference = Math.PI * radius;
  const clamped = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="card-shell flex flex-col items-center justify-center p-8 text-center">
      <svg width="280" height="160" viewBox="0 0 280 160">
        <path
          d="M20 140 A120 120 0 0 1 260 140"
          fill="none"
          stroke="#1a1410"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M20 140 A120 120 0 0 1 260 140"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f5a623" />
            <stop offset="100%" stopColor="#c0392b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="font-display text-4xl uppercase tracking-[0.4em] text-[var(--cream)]">{riskLevel}</div>
      <div className="font-mono mt-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
        {clamped.toFixed(0)}% Risk Index
      </div>
    </div>
  );
}
