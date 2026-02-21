"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mindscan-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"night" | "day">("night");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = stored === "day" ? "day" : "night";
    setTheme(nextTheme);
    document.body.dataset.theme = nextTheme;
  }, []);

  const playTone = (frequency: number) => {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.1);
    oscillator.onended = () => audio.close();
  };

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "night" ? "day" : "night";
      document.body.dataset.theme = next;
      window.localStorage.setItem(STORAGE_KEY, next);
      playTone(next === "day" ? 880 : 220);
      return next;
    });
  };

  return (
    <button
      onClick={toggle}
      className="border border-[var(--cream)] px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-[var(--cream)]"
    >
      {theme === "day" ? "DAY MODE" : "NIGHT MODE"}
    </button>
  );
}
