import Link from "next/link";

const steps = [
  { id: "01", title: "Text", copy: "Interpret narrative tone, affect, and cognition." },
  { id: "02", title: "Face", copy: "Detect micro-expressions and emotional leakage." },
  { id: "03", title: "Voice", copy: "Measure cadence, energy, and spectral drift." },
  { id: "04", title: "PHQ-9", copy: "Score clinically validated screening metrics." },
];

const rotations = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

export default function HowItWorks() {
  return (
    <section className="bg-[var(--bg-secondary)] px-6 py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <h2 className="font-display text-3xl uppercase tracking-[0.35em] text-[var(--cream)]">How It Works</h2>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Multi-signal intake
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step.id} className={`border border-black/20 ${rotations[index]} bg-[#efe4d2] p-6 text-black`}>
              <p className="font-mono text-sm text-[var(--rust)]">{step.id}</p>
              <h3 className="font-display mt-2 text-3xl uppercase tracking-[0.2em]">{step.title}</h3>
              <p className="font-body mt-4 text-sm text-black/70">{step.copy}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link href="/screening" className="button-outline font-ui text-xs uppercase">
            Start Screening
          </Link>
        </div>
      </div>
    </section>
  );
}
