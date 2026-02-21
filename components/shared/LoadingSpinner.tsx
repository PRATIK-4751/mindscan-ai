export default function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--amber-gold)] border-t-transparent" />
      Processing
    </div>
  );
}
