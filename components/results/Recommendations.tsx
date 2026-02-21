interface RecommendationsProps {
  riskLevel: string;
}

const recommendationData = [
  {
    level: "Low Risk",
    title: "Maintain baseline routines",
    detail: "Continue healthy sleep, hydration, and support check-ins.",
  },
  {
    level: "Medium Risk",
    title: "Schedule a check-in",
    detail: "Reach out to a counselor or trusted contact this week.",
  },
  {
    level: "High Risk",
    title: "Prioritize immediate support",
    detail: "Contact a mental health professional or helpline now.",
  },
];

export default function Recommendations({ riskLevel }: RecommendationsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {recommendationData.map((item) => {
        const highlight = item.level === riskLevel;
        return (
          <div
            key={item.level}
            className={`border-l-4 p-6 ${
              highlight ? "border-[var(--rust)] bg-[#1a1410]" : "border-white/10 bg-black/40"
            }`}
          >
            <h4 className="font-display text-xl uppercase tracking-[0.25em] text-[var(--cream)]">{item.level}</h4>
            <p className="font-mono mt-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {item.title}
            </p>
            <p className="mt-4 text-sm text-[var(--text-muted)]">{item.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
