"use client";

import { useEffect, useState } from "react";

type HistoryEntry = {
  id: string;
  timestamp: number;
  risk_level: string;
  final_score: number;
  text_score: number;
  face_score: number;
  voice_score: number;
  phq9_score: number;
};

const STORAGE_KEY = "mindscan-history";

export default function SessionHistory() {
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed: HistoryEntry[] = JSON.parse(stored);
    setItems(parsed.slice(0, 6));
  }, []);

  return (
    <div className="card-shell p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-display text-2xl uppercase tracking-[0.3em] text-[var(--cream)]">Session History</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Local archive</p>
      </div>
      <div className="mt-6 grid gap-4">
        {items.length === 0 && (
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">No previous sessions stored.</p>
        )}
        {items.map((entry) => (
          <div key={entry.id} className="border border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg uppercase tracking-[0.25em] text-[var(--cream)]">{entry.risk_level}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] sm:grid-cols-4">
              <span>Text {Math.round(entry.text_score * 100)}%</span>
              <span>Face {Math.round(entry.face_score * 100)}%</span>
              <span>Voice {Math.round(entry.voice_score * 100)}%</span>
              <span>PHQ-9 {Math.round(entry.phq9_score * 100)}%</span>
            </div>
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--amber-gold)]">
              Final {Math.round(entry.final_score * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
