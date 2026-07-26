"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { ShapValue } from "../../lib/types";

interface ShapChartProps {
  data: ShapValue[];
  title?: string;
  maxItems?: number;
}

function getBarColor(value: number): string {
  if (value > 0.3) return "#e74c3c";
  if (value > 0.15) return "#f5a623";
  if (value > 0) return "#f0c75e";
  if (value > -0.15) return "#7ec8e3";
  return "#3498db";
}

function getRiskLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs > 0.3) return "High";
  if (abs > 0.15) return "Moderate";
  if (abs > 0.05) return "Mild";
  return "Minimal";
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ShapValue;
  return (
    <div className="bg-[var(--deep-black)] border border-[var(--warm-gray)] rounded-lg px-3 py-2 shadow-lg max-w-xs">
      <p className="text-[var(--cream)] text-xs font-display uppercase tracking-wider">
        {d.display_name || d.feature}
      </p>
      <p className="text-[var(--cream)] text-[10px] mt-1">
        SHAP: <span className={d.shap_value >= 0 ? "text-red-400" : "text-blue-400"}>
          {d.shap_value >= 0 ? "+" : ""}{d.shap_value.toFixed(3)}
        </span>
        {" "}({getRiskLabel(d.shap_value)} impact)
      </p>
      {d.depression_note && (
        <p className="text-[var(--warm-gray)] text-[10px] mt-1 italic">
          {d.depression_note}
        </p>
      )}
    </div>
  );
};

export default function ShapChart({ data, title = "SHAP FEATURE CONTRIBUTIONS", maxItems = 12 }: ShapChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full">
        <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">{title}</h4>
        <div className="mt-6 flex items-center justify-center h-56">
          <p className="text-[var(--warm-gray)] text-sm">No explanation data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.slice(0, maxItems).map((item) => ({
    ...item,
    label: item.display_name
      ? item.display_name.length > 22
        ? item.display_name.slice(0, 20) + "..."
        : item.display_name
      : item.feature.length > 18
        ? item.feature.slice(0, 16) + "..."
        : item.feature,
  }));

  const maxAbs = Math.max(...chartData.map((d) => Math.abs(d.shap_value)), 0.01);

  return (
    <div className="h-full">
      <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">{title}</h4>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--warm-gray)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-red-500" /> Increases risk
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-blue-400" /> Decreases risk
        </span>
      </div>

      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis
              type="number"
              domain={[-maxAbs * 1.1, maxAbs * 1.1]}
              tick={{ fill: "#8b8680", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={130}
              tick={{ fill: "#d4cdc4", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="shap_value" barSize={14} radius={[0, 0, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`${entry.feature}-${index}`} fill={getBarColor(entry.shap_value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
