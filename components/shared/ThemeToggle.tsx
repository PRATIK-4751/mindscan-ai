"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mindscan-grain";

export default function ThemeToggle() {
  const [grain, setGrain] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const enabled = stored ? stored === "on" : true;
    setGrain(enabled);
    document.body.dataset.grain = enabled ? "on" : "off";
  }, []);

  const toggle = () => {
    setGrain((prev) => {
      const next = !prev;
      document.body.dataset.grain = next ? "on" : "off";
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  };

  return (
    <button onClick={toggle} className="border border-[var(--cream)] px-3 py-2 text-[10px] uppercase tracking-[0.25em]">
      {grain ? "GRAIN ON" : "GRAIN OFF"}
    </button>
  );
}
