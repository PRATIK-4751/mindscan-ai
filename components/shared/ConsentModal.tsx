"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mindscan-consent";

export default function ConsentModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) setOpen(true);
  }, []);

  const handleAccept = () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
      <div className="w-full max-w-2xl border border-[var(--cream)] bg-[#0f0f0f] p-8 text-center">
        <h2 className="font-display text-4xl tracking-[0.3em] text-[var(--cream)]">BEFORE WE BEGIN</h2>
        <p className="font-ui mt-4 text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">
          This experience is not a medical diagnosis. If you are in crisis, seek professional help immediately.
        </p>
        <button
          onClick={handleAccept}
          className="font-ui mt-8 w-full border-2 border-[var(--amber-gold)] bg-[var(--amber-gold)] py-3 text-xs uppercase tracking-[0.3em] text-black"
        >
          I UNDERSTAND — PROCEED
        </button>
      </div>
    </div>
  );
}
