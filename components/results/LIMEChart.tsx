"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { LimeWord } from "../../lib/types";

interface LIMEChartProps {
  data: LimeWord[];
  title?: string;
}

export default function LIMEChart({ data, title = "LINGUISTIC EVIDENCE" }: LIMEChartProps) {
  return (
    <div className="h-full">
      <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">{title}</h4>
      <div className="mt-6 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" domain={[-1, 1]} hide />
            <YAxis dataKey="word" type="category" width={90} tick={{ fill: "#8b8680", fontSize: 10 }} />
            <Bar dataKey="score" barSize={12} radius={[0, 0, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`${entry.word}-${index}`} fill={entry.score >= 0 ? "#f5a623" : "#c0392b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
