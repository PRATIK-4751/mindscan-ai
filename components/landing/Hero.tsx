"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadFull } from "tsparticles";
import AsciiReveal from "../AsciiReveal";

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
      {/* Original background image */}
      <div className="absolute inset-0 bg-[url('/eye.jpg')] bg-cover bg-center" />

      {/* ASCII Reveal layer — covers the whole hero, hover reveals the photo */}
      <div className="absolute inset-0">
        <AsciiReveal
          image="/eye.jpg"
          columns={140}
          contrast={110}
          colorMode="mono"
          inkColor="#e8dcc8"
          reveal={true}
          revealOptions={{ size: 80, softness: 16 }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Particles */}
      <div className="absolute inset-0">{ready && <Particles id="hero-stars" options={options} className="h-full w-full" />}</div>

      {/* Text content */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col items-center justify-center px-6 py-24">
        <h1 className="font-display text-4xl uppercase tracking-[0.25em] text-[var(--cream)] sm:text-5xl sm:tracking-[0.35em] md:text-7xl md:tracking-[0.55em] lg:text-9xl">
          MINDSCAN
        </h1>
        <p className="font-ui mt-6 max-w-xl text-center text-base uppercase tracking-[0.2em] text-[var(--text-muted)] sm:text-lg">
          Multimodal AI Depression Screening
        </p>
        <p className="font-mono mt-4 text-center text-[10px] uppercase tracking-[0.35em] text-[var(--cream)]">
          [ PERCEPTION ENGINE v1.0 ]
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row justify-center">
          <Link href="/screening" className="button-outline w-full text-center font-ui text-xs uppercase sm:w-auto">
            Begin Screening
          </Link>
          <div className="scanlines border border-white/10 bg-black/30 px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] sm:text-xs">
            Clinical-grade perception stack
          </div>
        </div>
      </div>
    </section>
  );
}
