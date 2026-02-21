"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadFull } from "tsparticles";

export default function Hero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadFull(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo<ISourceOptions>(
    () => ({
      background: { color: "transparent" },
      fullScreen: { enable: false },
      fpsLimit: 60,
      particles: {
        number: { value: 80, density: { enable: true, area: 800 } },
        color: { value: "#e8dcc8" },
        opacity: { value: 0.35 },
        size: { value: { min: 1, max: 3 } },
        move: { enable: true, speed: 0.4 },
      },
    }),
    []
  );

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 bg-[url('/eye.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0">{ready && <Particles id="hero-stars" options={options} className="h-full w-full" />}</div>
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 py-24">
        <div className="relative mb-10 h-32 w-32">
          <svg className="saturn-ring absolute inset-0 h-full w-full text-[var(--cream)]" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            <ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          </svg>
        </div>
        <h1 className="font-display text-6xl uppercase tracking-[0.6em] text-[var(--cream)] md:text-8xl lg:text-9xl">
          MINDSCAN
        </h1>
        <p className="font-ui mt-6 max-w-xl text-lg uppercase tracking-[0.25em] text-[var(--text-muted)]">
          Multimodal AI Depression Screening
        </p>
        <p className="font-mono mt-4 text-xs uppercase tracking-[0.4em] text-[var(--cream)]">
          [ PERCEPTION ENGINE v1.0 ]
        </p>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <Link href="/screening" className="button-outline font-ui text-xs uppercase">
            Begin Screening
          </Link>
          <div className="scanlines border border-white/10 bg-black/30 px-6 py-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Clinical-grade perception stack
          </div>
        </div>
      </div>
    </section>
  );
}
