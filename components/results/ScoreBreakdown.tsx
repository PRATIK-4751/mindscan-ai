interface ScoreBreakdownProps {
  scores: { label: string; value: number }[];
}

export default function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <div className="card-shell p-6">
      <h3 className="font-display text-2xl uppercase tracking-[0.3em] text-[var(--cream)]">Data Readout</h3>
      <div className="mt-6 space-y-5">
        {scores.map((score) => (
          <div key={score.label}>
            <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              <span>{score.label}</span>
              <span>{Math.round(score.value * 100)}%</span>
            </div>
            <div className="mt-2 h-[3px] w-full bg-[#1a1410]">
              <div className="h-full bg-[var(--amber-gold)]" style={{ width: `${score.value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
