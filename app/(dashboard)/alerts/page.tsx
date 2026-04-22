"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface Alert {
  id: string;
  ticker: string;
  threshold: number;
  enabled: boolean;
  lastScore: number | null;
  lastTriggered: string | null;
  watchlistItem: { name: string | null };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, []);

  async function updateAlert(ticker: string, patch: Partial<{ threshold: number; enabled: boolean }>) {
    setSaving(ticker);
    const res = await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, ...patch }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.ticker === ticker ? { ...a, ...updated } : a)));
      toast.success("Alert updated");
    } else {
      toast.error("Failed to update");
    }
    setSaving(null);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Alerts</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Configure consensus change notifications per stock
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/8 rounded-xl">
          <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No alerts configured</p>
          <p className="text-xs text-zinc-600 mt-1">
            Add stocks to your{" "}
            <Link href="/" className="text-emerald-500 hover:text-emerald-400">watchlist</Link>{" "}
            first
          </p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className={cn(
            "bg-zinc-900 border-white/8 p-4",
            !alert.enabled && "opacity-60"
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Link href={`/stock/${alert.ticker}`}>
                    <span className="text-sm font-mono font-semibold text-zinc-100 hover:text-emerald-400 transition-colors">
                      {alert.ticker}
                    </span>
                  </Link>
                  <span className="text-xs text-zinc-600 truncate">{alert.watchlistItem.name}</span>
                  <Link href={`/stock/${alert.ticker}`} className="text-zinc-700 hover:text-zinc-400">
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">Notify if Δ ≥</span>
                  <Input
                    type="number"
                    min="0.1"
                    max="4"
                    step="0.1"
                    defaultValue={alert.threshold}
                    disabled={!alert.enabled}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== alert.threshold) updateAlert(alert.ticker, { threshold: v });
                    }}
                    className="w-20 h-7 text-xs font-mono bg-zinc-800/50 border-white/8 text-zinc-200"
                  />
                  <span className="text-xs text-zinc-600">points</span>
                  {saving === alert.ticker && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-zinc-600">
                  {alert.lastScore !== null && (
                    <span>Current score: <span className="text-zinc-400 font-mono">{alert.lastScore.toFixed(2)}</span></span>
                  )}
                  {alert.lastTriggered && (
                    <span>Last fired: <span className="text-zinc-400">{format(new Date(alert.lastTriggered), "MMM d, HH:mm")}</span></span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {alert.enabled ? (
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <BellOff className="w-3.5 h-3.5 text-zinc-600" />
                )}
                <Switch
                  checked={alert.enabled}
                  onCheckedChange={(v) => updateAlert(alert.ticker, { enabled: v })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
