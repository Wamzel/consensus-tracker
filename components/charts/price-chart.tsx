"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, fromUnixTime } from "date-fns";
import { cn } from "@/lib/utils";

const RANGES = ["1D", "1W", "1M", "3M", "1Y"] as const;
type Range = typeof RANGES[number];

interface PricePoint {
  time: string;
  price: number;
  open: number;
  high: number;
  low: number;
}

interface PriceChartProps {
  ticker: string;
}

function formatLabel(range: Range, ts: number): string {
  const d = fromUnixTime(ts);
  if (range === "1D") return format(d, "HH:mm");
  if (range === "1W") return format(d, "EEE HH:mm");
  return format(d, "MMM d");
}

export function PriceChart({ ticker }: PriceChartProps) {
  const [range, setRange] = useState<Range>("1M");
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/stocks/${ticker}?type=candles&range=${range}`)
      .then((r) => r.json())
      .then((raw) => {
        if (!raw.c || raw.s === "no_data") {
          setData([]);
          return;
        }
        const pts: PricePoint[] = raw.t.map((ts: number, i: number) => ({
          time: formatLabel(range, ts),
          price: raw.c[i],
          open: raw.o[i],
          high: raw.h[i],
          low: raw.l[i],
        }));
        setData(pts);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [ticker, range]);

  const isUp = data.length > 1 ? data[data.length - 1].price >= data[0].price : true;
  const color = isUp ? "#10b981" : "#ef4444";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              range === r
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {loading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
          Failed to load price data
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
          No price data available
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#52525b" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#52525b" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              tickFormatter={(v) => v.toFixed(0)}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: color }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${ticker})`}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
