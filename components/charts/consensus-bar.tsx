"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConsensusData {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  score: number;
}

interface ConsensusBarProps {
  data: ConsensusData;
  showLabels?: boolean;
  compact?: boolean;
}

const SEGMENTS = [
  { key: "strongBuy",  label: "Strong Buy",  color: "#10b981", textColor: "text-emerald-400" },
  { key: "buy",        label: "Buy",         color: "#34d399", textColor: "text-emerald-300" },
  { key: "hold",       label: "Hold",        color: "#f59e0b", textColor: "text-amber-400" },
  { key: "sell",       label: "Sell",        color: "#f87171", textColor: "text-red-400" },
  { key: "strongSell", label: "Strong Sell", color: "#ef4444", textColor: "text-red-500" },
] as const;

export function ConsensusBar({ data, showLabels = true, compact = false }: ConsensusBarProps) {
  const total = data.strongBuy + data.buy + data.hold + data.sell + data.strongSell;
  if (total === 0) return <div className="text-xs text-zinc-600">No analyst data</div>;

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className={`flex rounded-md overflow-hidden ${compact ? "h-2" : "h-4"}`}>
        {SEGMENTS.map(({ key, label, color }) => {
          const count = data[key];
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <Tooltip key={key}>
              <TooltipTrigger>
                <div
                  style={{ width: `${pct}%`, background: color }}
                  className="h-full transition-all duration-500 cursor-default"
                />
              </TooltipTrigger>
              <TooltipContent>
                {label}: {count} ({pct.toFixed(0)}%)
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SEGMENTS.map(({ key, label, color, textColor }) => {
            const count = data[key];
            if (count === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-xs text-zinc-500">{label}</span>
                <span className={`text-xs font-mono font-semibold ${textColor}`}>{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
