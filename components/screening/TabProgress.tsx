import { Loader2 } from "lucide-react";

interface TabProgressProps {
  completed: { text: boolean; face: boolean; voice: boolean; phq9: boolean };
  onAnalyzeAll: () => void;
  loading?: boolean;
}

const labels = [
  { key: "text", label: "01_TEXT" },
  { key: "face", label: "02_FACE" },
  { key: "voice", label: "03_VOICE" },
  { key: "phq9", label: "04_PHQ-9" },
];

export default function TabProgress({ completed, onAnalyzeAll, loading }: TabProgressProps) {
  const completedCount = Object.values(completed).filter(Boolean).length;
  return (
    <div className="sticky bottom-0 border-t border-white/10 bg-black/80 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.3em]">
          {labels.map((item) => {
            const done = completed[item.key as keyof typeof completed];
            return (
              <span
                key={item.key}
                className={`border px-3 py-2 ${
                  done
                    ? "border-[var(--amber-gold)] bg-[var(--amber-gold)] text-black"
                    : "border-[var(--rust)] text-[var(--cream)]"
                }`}
              >
                {item.label}
                {done && " ✓"}
              </span>
            );
          })}
        </div>
        <div className="flex w-full items-center gap-3 md:w-auto">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            {completedCount} / 4 complete
          </span>
          <button
            onClick={onAnalyzeAll}
            disabled={completedCount < 1 || loading}
            className="font-display flex flex-1 items-center justify-center gap-2 border border-[var(--amber-gold)] bg-[var(--amber-gold)] px-6 py-2 text-xs font-bold uppercase tracking-[0.35em] text-black disabled:opacity-40 hover:bg-[var(--cream)] transition-colors md:flex-none"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                Analyzing...
              </>
            ) : completedCount >= 4 ? (
              "Submit & View Results"
            ) : (
              "Analyze & View Results"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
