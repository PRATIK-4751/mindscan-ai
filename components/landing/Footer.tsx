export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="barcode">
          {Array.from({ length: 14 }).map((_, index) => (
            <span key={index} style={{ height: index % 2 === 0 ? "42px" : "28px" }} />
          ))}
        </div>
        <div className="text-center md:text-right">
          <p className="font-mono text-sm uppercase tracking-[0.3em] text-[var(--amber-gold)]">
            iCall 9152987821
          </p>
          <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Not a substitute for professional medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
