"use client";

import { useEffect, useRef, useState } from "react";

interface RiskGaugeProps {
  score:     number;   // 0–100
  riskLevel: string;
}

const COLORS = {
  "Low Risk":    { stroke: "#2ecc71", glow: "rgba(46,204,113,0.4)",  label: "#2ecc71" },
  "Medium Risk": { stroke: "#F5A623", glow: "rgba(245,166,35,0.4)",  label: "#F5A623" },
  "High Risk":   { stroke: "#C0392B", glow: "rgba(192,57,43,0.5)",   label: "#C0392B" },
} as const;

export default function RiskGauge({ score, riskLevel }: RiskGaugeProps) {
  const radius        = 110;
  const circumference = Math.PI * radius;
  const clamped       = Math.min(Math.max(score, 0), 100);
  const offset        = circumference * (1 - clamped / 100);

  // Animate the arc on mount
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  const palette = COLORS[riskLevel as keyof typeof COLORS] ?? COLORS["Low Risk"];

  // Tick marks along the arc
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const pct   = i / 10;
    const angle = Math.PI + pct * Math.PI;           // 180° → 360°
    const cx    = 140 + (radius + 22) * Math.cos(angle);
    const cy    = 140 + (radius + 22) * Math.sin(angle);
    return { cx, cy, major: i % 5 === 0 };
  });

  return (
    <div
      className="relative flex flex-col items-center justify-center p-8 text-center overflow-hidden"
      style={{
        background:   "rgba(10, 7, 4, 0.8)",
        border:       `1px solid ${palette.stroke}22`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Ambient glow behind arc */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 85%, ${palette.glow}, transparent)`,
          opacity: 0.35,
        }}
      />

      <svg
        width="280"
        height="160"
        viewBox="0 0 280 160"
        className="relative"
        overflow="visible"
      >
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#F5A623" />
            <stop offset="100%" stopColor={palette.stroke} />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <circle
            key={i}
            cx={t.cx}
            cy={t.cy}
            r={t.major ? 2.5 : 1.2}
            fill={t.major ? palette.stroke : "rgba(232,220,200,0.25)"}
          />
        ))}

        {/* Track — visible contrast in night mode */}
        <path
          d="M20 140 A110 110 0 0 1 260 140"
          fill="none"
          stroke="rgba(232,220,200,0.08)"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Track gutter line */}
        <path
          d="M20 140 A110 110 0 0 1 260 140"
          fill="none"
          stroke="rgba(232,220,200,0.04)"
          strokeWidth="22"
          strokeLinecap="round"
        />

        {/* Active arc */}
        <path
          d="M20 140 A110 110 0 0 1 260 140"
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          filter="url(#gauge-glow)"
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />

        {/* Needle dot at arc tip */}
        {animated && clamped > 2 && (() => {
          const pct   = clamped / 100;
          const angle = Math.PI + pct * Math.PI;
          const nx    = 140 + radius * Math.cos(angle);
          const ny    = 140 + radius * Math.sin(angle);
          return (
            <circle
              cx={nx}
              cy={ny}
              r={6}
              fill={palette.stroke}
              filter="url(#gauge-glow)"
            />
          );
        })()}

        {/* Centre score */}
        <text
          x="140"
          y="128"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="13"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="2"
          fill="rgba(232,220,200,0.45)"
        >
          {clamped.toFixed(0)}%
        </text>
      </svg>

      {/* Risk label */}
      <div
        className="font-display text-5xl uppercase leading-none"
        style={{
          fontFamily:    "var(--font-display), sans-serif",
          letterSpacing: "0.35em",
          color:         palette.label,
          textShadow:    `0 0 28px ${palette.glow}`,
          marginTop:     "-8px",
        }}
      >
        {riskLevel}
      </div>

      {/* Sub-label */}
      <div
        className="mt-3 uppercase"
        style={{
          fontFamily:    "var(--font-mono), monospace",
          fontSize:      "0.6rem",
          letterSpacing: "0.35em",
          color:         "rgba(232,220,200,0.4)",
        }}
      >
        RISK INDEX · {clamped.toFixed(0)}%
      </div>

      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none scanlines"
        style={{ opacity: 0.4 }}
      />
    </div>
  );
}
