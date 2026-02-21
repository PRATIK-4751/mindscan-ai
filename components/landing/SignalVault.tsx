const features = [
  {
    title: "Signal Vault",
    copy: "Securely cache multimodal fingerprints for longitudinal review.",
    meta: "Encrypted archive",
  },
  {
    title: "Trend Tracking",
    copy: "Compare daily deltas across text, face, voice, and PHQ-9.",
    meta: "30-day baseline",
  },
  {
    title: "Rapid Triage",
    copy: "Auto-rank sessions to surface urgent cases faster.",
    meta: "Priority alerts",
  },
];

const metrics = [
  { label: "Sessions Logged", value: "128" },
  { label: "Signals Synced", value: "4x" },
  { label: "Avg. Latency", value: "2.1s" },
];

export default function SignalVault() {
  return (
    <section className="relative px-6 py-20">
      <div className="absolute inset-0 bg-[url('/true-detective.jpg')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6 border-b border-white/10 pb-6">
          <h2 className="font-display text-2xl uppercase tracking-[0.3em] text-[var(--cream)] sm:text-3xl">
            Signal Vault
          </h2>
          <div className="flex flex-wrap gap-6 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="font-display text-lg text-[var(--amber-gold)]">{metric.value}</div>
                <div className="font-mono mt-1">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((item) => (
            <div key={item.title} className="card-shell p-6">
              <h3 className="font-display text-2xl uppercase tracking-[0.25em] text-[var(--cream)]">{item.title}</h3>
              <p className="font-body mt-4 text-sm text-[var(--text-muted)]">{item.copy}</p>
              <p className="font-mono mt-6 text-xs uppercase tracking-[0.3em] text-[var(--amber-gold)]">{item.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
