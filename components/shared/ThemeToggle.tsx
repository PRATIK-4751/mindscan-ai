"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "mindscan-theme";
const DURATION    = 600;           // slightly longer = silkier

export default function ThemeToggle() {
  const [isDay, setIsDay]     = useState(false);
  const [mounted, setMounted] = useState(false);

  /* ── restore saved theme on first render ── */
  useEffect(() => {
    const stored  = localStorage.getItem(STORAGE_KEY);
    const dayMode = stored === "day";
    document.body.dataset.theme = dayMode ? "day" : "night";
    setIsDay(dayMode);
    setMounted(true);
  }, []);

  const toggle = () => {
    const btn = document.getElementById("theme-toggle-btn");
    if (!btn) return;

    /* position of the button — circle expands from here */
    const { top, left, width, height } = btn.getBoundingClientRect();
    const cx   = left + width  / 2;
    const cy   = top  + height / 2;
    const vw   = window.visualViewport?.width  ?? window.innerWidth;
    const vh   = window.visualViewport?.height ?? window.innerHeight;
    const maxR = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));

    const clipFrom = `circle(0px at ${cx}px ${cy}px)`;
    const clipTo   = `circle(${maxR}px at ${cx}px ${cy}px)`;

    const applyTheme = () => {
      const nextDay = !isDay;
      setIsDay(nextDay);
      document.body.dataset.theme = nextDay ? "day" : "night";
      localStorage.setItem(STORAGE_KEY, nextDay ? "day" : "night");
    };

    /* ── Fallback: no View Transitions support ── */
    if (typeof document.startViewTransition !== "function") {
      applyTheme();
      return;
    }

    /* ── Smooth circle-wipe via View Transitions API ── */
    const root = document.documentElement;
    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty("--magicui-theme-toggle-vt-duration", `${DURATION}ms`);

    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
    };

    const transition = document.startViewTransition(() => flushSync(applyTheme));

    transition.finished.finally(cleanup);

    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [clipFrom, clipTo] },
        {
          duration:      DURATION,
          easing:        "cubic-bezier(0.4, 0, 0.2, 1)",   // smooth material ease
          fill:          "forwards",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  if (!mounted) return <div className="w-9 h-9 opacity-0" />;

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggle}
      title={isDay ? "Switch to Night" : "Switch to Day"}
      aria-label="Toggle day/night mode"
      className="group relative flex items-center justify-center w-9 h-9"
      style={{
        border:     "1px solid rgba(245,166,35,0.35)",
        background: "rgba(0,0,0,0.3)",
        color:      "#F5A623",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(192,57,43,0.25)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,57,43,0.6)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.3)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,166,35,0.35)";
      }}
    >
      {isDay
        ? <Moon size={15} strokeWidth={1.5} />
        : <Sun  size={15} strokeWidth={1.5} />
      }
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
