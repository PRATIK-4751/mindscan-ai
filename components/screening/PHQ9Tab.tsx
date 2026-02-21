"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoadingSpinner from "../shared/LoadingSpinner";
import { analyzePHQ9 } from "../../lib/api";

export interface PHQ9TabResult {
  phq9_score: number;
  phq9_total: number;
  phq9_severity: string;
  answers: number[];
}

interface PHQ9TabProps {
  onComplete: (data: PHQ9TabResult) => void;
}

const questions = [
  "Little interest or pleasure in doing things?",
  "Feeling down, depressed, or hopeless?",
  "Trouble falling or staying asleep, or sleeping too much?",
  "Feeling tired or having little energy?",
  "Poor appetite or overeating?",
  "Feeling bad about yourself or that you are a failure?",
  "Trouble concentrating on things?",
  "Moving or speaking slowly / being fidgety or restless?",
  "Thoughts that you would be better off dead or hurting yourself?",
];

const options = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

export default function PHQ9Tab({ onComplete }: PHQ9TabProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (value: number) => {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
    if (index < questions.length - 1) {
      setIndex(index + 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzePHQ9(answers.map((v) => (v < 0 ? 0 : v)));
      onComplete({
        phq9_score: result.phq9_score,
        phq9_total: result.phq9_total,
        phq9_severity: result.phq9_severity,
        answers,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze PHQ-9.");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((index + 1) / questions.length) * 100;
  const complete = answers.every((value) => value >= 0);

  return (
    <div className="space-y-8">
      <div className="relative border border-white/10 bg-black/40 p-8">
        <span className="font-display absolute right-8 top-6 text-6xl text-white/5">{index + 1}</span>
        <div className="h-[3px] w-full bg-[#1a1410]">
          <div className="h-full bg-[var(--amber-gold)]" style={{ width: `${progress}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <h3 className="font-display text-2xl uppercase tracking-[0.2em] text-[var(--cream)]">
              {questions[index]}
            </h3>
            <div className="mt-6 grid gap-4">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="flex w-full items-center justify-between border border-white/20 px-4 py-3 text-left text-xs uppercase tracking-[0.3em] text-[var(--cream)]"
                >
                  <span>{option.label}</span>
                  <span>{option.value}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!complete || loading}
        className="font-display w-full bg-[var(--rust)] py-3 text-lg uppercase tracking-[0.35em] text-[var(--cream)] disabled:opacity-40"
      >
        Submit Analysis
      </button>
      {loading && (
        <div className="card-shell p-6">
          <LoadingSpinner />
        </div>
      )}
      {error && <div className="border border-[var(--danger)] p-4 text-sm text-[var(--danger)]">{error}</div>}
    </div>
  );
}
