"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import LoadingSpinner from "../shared/LoadingSpinner";
import { analyzeText } from "../../lib/api";
import type { LimeWord } from "../../lib/types";
import LIMEChart from "../results/LIMEChart";

export interface TextTabResult {
  text: string;
  text_score: number;
  lime_words: LimeWord[];
}

interface TextTabProps {
  onComplete: (data: TextTabResult) => void;
  value?: string;
}

export default function TextTab({ onComplete, value = "" }: TextTabProps) {
  const { register, handleSubmit, watch, formState } = useForm<{ text: string }>({
    defaultValues: { text: value },
    mode: "onChange",
  });
  const [loading, setLoading] = useState(false);
  const [limeWords, setLimeWords] = useState<LimeWord[]>([]);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const textValue = watch("text") ?? "";

  const wordMap = useMemo(() => {
    const map = new Map<string, number>();
    limeWords.forEach((item) => map.set(item.word.toLowerCase(), item.score));
    return map;
  }, [limeWords]);

  const onSubmit = handleSubmit(async ({ text }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeText(text);
      setLimeWords(result.lime_words);
      setScore(result.text_score);
      onComplete({ text, text_score: result.text_score, lime_words: result.lime_words });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze text.");
    } finally {
      setLoading(false);
    }
  });

  const renderedText = textValue.split(/\s+/).filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="border border-white/10 bg-[#efe4d2] p-6 text-black">
        <textarea
          {...register("text", { minLength: 50, required: true })}
          className="font-body h-48 w-full resize-none bg-transparent text-sm uppercase tracking-[0.12em] outline-none"
        />
        <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.3em]">
          <span className="text-[var(--rust)]">{textValue.length} / 50</span>
          <span className="text-black/50">Minimum 50 characters</span>
        </div>
      </div>
      <button
        onClick={onSubmit}
        disabled={!formState.isValid || loading}
        className="font-display w-full border border-[var(--cream)] py-3 text-lg uppercase tracking-[0.4em] text-[var(--cream)] disabled:opacity-40"
      >
        Analyze Text
      </button>
      {loading && (
        <div className="card-shell p-6">
          <LoadingSpinner />
        </div>
      )}
      {error && <div className="border border-[var(--danger)] p-4 text-sm text-[var(--danger)]">{error}</div>}
      {limeWords.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="card-shell p-6">
            <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">Signal Highlights</h4>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {renderedText.map((word, index) => {
                const clean = word.replace(/[^\w-]/g, "").toLowerCase();
                const scoreValue = wordMap.get(clean);
                const style =
                  scoreValue === undefined
                    ? "text-[var(--text-muted)]"
                    : scoreValue >= 0
                    ? "text-[var(--amber-gold)] underline decoration-[var(--amber-gold)]"
                    : "text-[var(--rust)] underline decoration-[var(--rust)]";
                return (
                  <span key={`${word}-${index}`} className={`font-body uppercase tracking-[0.12em] ${style}`}>
                    {word}
                  </span>
                );
              })}
            </div>
            <div className="mt-6 font-mono text-xs uppercase tracking-[0.35em] text-[var(--text-muted)]">
              Text score: {(score * 100).toFixed(0)}%
            </div>
          </div>
          <div className="card-shell p-6">
            <LIMEChart title="Linguistic Evidence" data={limeWords} />
          </div>
        </div>
      )}
    </div>
  );
}
