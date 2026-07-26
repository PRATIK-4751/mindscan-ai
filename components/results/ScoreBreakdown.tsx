"use client";

import { motion } from "framer-motion";

interface ScoreBreakdownProps {
  scores: { label: string; value: number }[];
  finalScore?: number;
  riskLevel?: string;
}

const COLORS = {
  "Text": "#f5a623",
  "Face": "#c0392b",
  "Voice": "#16a085",
  "PHQ-9": "#8e44ad",
};

export default function ScoreBreakdown({ scores, finalScore, riskLevel }: ScoreBreakdownProps) {
  const avgScore = finalScore ?? (scores.reduce((a, s) => a + s.value, 0) / scores.length);
  const pct = Math.round(avgScore * 100);

  const riskColor = riskLevel === "High Risk"
    ? "#e74c3c"
    : riskLevel === "Medium Risk"
    ? "#f39c12"
    : "#27ae60";

  return (
    <div className="border border-white/10 bg-black/40 p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <h3 className="font-display text-lg uppercase tracking-[0.3em] text-[var(--cream)]">
          Data Readout
        </h3>
        {riskLevel && (
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Risk Index {pct}%
          </span>
        )}
      </div>

      <div className="space-y-5">
        {scores.map((item, i) => {
          const barPct = Math.round(item.value * 100);
          const color = COLORS[item.label as keyof typeof COLORS] || "#f5a623";
          return (
            <div key={item.label}>
              <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2">
                <span>{item.label}</span>
                <span className="text-[var(--cream)]">{barPct}%</span>
              </div>
              <div className="relative h-[3px] w-full bg-[#1a1410]">
                <motion.div
                  className="absolute inset-y-0 left-0"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2">
          <span>Combined Risk</span>
          <span className="text-[var(--cream)]">{pct}%</span>
        </div>
        <div className="relative h-2 w-full bg-[#1a1410]">
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ backgroundColor: riskColor }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
