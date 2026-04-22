"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

interface HistoryPoint {
  period: string;
  score: number;
  recordedAt: string;
}

interface ConsensusHistoryChartProps {
  data: HistoryPoint[];
}

const SCORE_LABELS: Record<number, string> = {
  1: "Strong Sell",
  2: "Sell",
  3: "Hold",
  4: "Buy",
  5: "Strong Buy",
};

function scoreColor(score: number): string {
  if (score >= 4.5) return "#10b981";
  if (score >= 3.5) return "#34d399";
  if (score >= 2.5) return "#f59e0b";
  if (score >= 1.5) return "#f87171";
  return "#ef4444";
}

export function ConsensusHistoryChart({ data }: ConsensusHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">
        No history available yet
      </div>
    );
  }

  const chartData = [...data]
    .reverse()
    .map((d) => ({
      label: d.period,
      score: Number(d.score.toFixed(2)),
    }));

  const latest = chartData[chartData.length - 1]?.score ?? 3;
  const lineColor = scoreColor(latest);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#52525b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 10, fill: "#52525b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => SCORE_LABELS[v] ?? v}
          width={60}
        />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(v) => {
            const n = Number(v);
            const label = n >= 4.5 ? "Strong Buy" : n >= 3.5 ? "Buy" : n >= 2.5 ? "Hold" : n >= 1.5 ? "Sell" : "Strong Sell";
            return [`${n.toFixed(2)} — ${label}`, "Score"];
          }}
        />
        <ReferenceLine y={3} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="score"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
