interface EmotionSummaryProps {
  faceEmotion: string;
  voiceEmotion: string;
}

export default function EmotionSummary({ faceEmotion, voiceEmotion }: EmotionSummaryProps) {
  return (
    <div className="bg-[var(--cream)] p-6 text-black">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-display text-2xl uppercase tracking-[0.25em]">Emotional Profile</h4>
          <p className="font-mono mt-2 text-xs uppercase tracking-[0.3em] text-black/60">
            Facial + Vocal composite
          </p>
        </div>
        <span className="font-display -rotate-12 border border-[var(--rust)] px-3 py-1 text-sm uppercase tracking-[0.25em] text-[var(--rust)]">
          Verified
        </span>
      </div>
      <div className="mt-6 grid gap-4 text-sm uppercase tracking-[0.2em] text-black/70 sm:grid-cols-2">
        <div className="border-l-4 border-[var(--rust)] pl-4">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-black/50">Face</p>
          <p className="font-display text-xl">{faceEmotion || "Neutral"}</p>
        </div>
        <div className="border-l-4 border-[var(--rust)] pl-4">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-black/50">Voice</p>
          <p className="font-display text-xl">{voiceEmotion || "Neutral"}</p>
        </div>
      </div>
    </div>
  );
}
