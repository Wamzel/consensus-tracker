"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Bell,
  BellOff,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PriceChart } from "@/components/charts/price-chart";
import { ConsensusBar } from "@/components/charts/consensus-bar";
import { ConsensusHistoryChart } from "@/components/charts/consensus-history-chart";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Quote {
  c: number; d: number; dp: number; h: number; l: number; o: number; pc: number;
}

interface RecommendationTrend {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface ConsensusSnapshot {
  id: string;
  period: string;
  score: number;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  recordedAt: string;
}

interface StockData {
  quote: Quote | null;
  recommendations: RecommendationTrend[];
  consensusHistory: ConsensusSnapshot[];
}

interface AlertData {
  threshold: number;
  enabled: boolean;
  lastScore: number | null;
}

function computeScore(r: RecommendationTrend): number {
  const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
  if (!total) return 3;
  return (r.strongBuy * 5 + r.buy * 4 + r.hold * 3 + r.sell * 2 + r.strongSell * 1) / total;
}

function scoreLabel(s: number) {
  if (s >= 4.5) return "Strong Buy";
  if (s >= 3.5) return "Buy";
  if (s >= 2.5) return "Hold";
  if (s >= 1.5) return "Sell";
  return "Strong Sell";
}

function scoreColorClass(s: number) {
  if (s >= 4.5) return "text-emerald-400";
  if (s >= 3.5) return "text-emerald-300";
  if (s >= 2.5) return "text-amber-400";
  if (s >= 1.5) return "text-red-400";
  return "text-red-500";
}

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const symbol = ticker.toUpperCase();

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState("0.5");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [savingAlert, setSavingAlert] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/stocks/${symbol}`).then((r) => r.json()),
      fetch(`/api/alerts`).then((r) => r.json()),
    ]).then(([stock, alerts]) => {
      setStockData(stock);
      const tickerAlert = Array.isArray(alerts)
        ? alerts.find((a: AlertData & { ticker: string }) => a.ticker === symbol)
        : null;
      if (tickerAlert) {
        setAlert(tickerAlert);
        setThreshold(String(tickerAlert.threshold));
        setAlertEnabled(tickerAlert.enabled);
      }
    }).finally(() => setLoading(false));
  }, [symbol]);

  async function saveAlert() {
    setSavingAlert(true);
    const res = await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: symbol,
        threshold: Number(threshold),
        enabled: alertEnabled,
      }),
    });
    if (res.ok) {
      toast.success("Alert saved");
      const data = await res.json();
      setAlert(data);
    } else {
      toast.error("Failed to save alert");
    }
    setSavingAlert(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  const quote = stockData?.quote;
  const latestRec = stockData?.recommendations?.[0];
  const consensusScore = latestRec ? computeScore(latestRec) : null;
  const isUp = quote ? quote.d >= 0 : true;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-mono font-bold text-zinc-100">{symbol}</h1>
            {consensusScore !== null && (
              <span className={cn("text-sm font-semibold", scoreColorClass(consensusScore))}>
                {scoreLabel(consensusScore)}
              </span>
            )}
          </div>
          {quote && (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold text-zinc-100 tabular-nums">
                ${quote.c.toFixed(2)}
              </span>
              <div className={cn(
                "flex items-center gap-1 text-sm font-mono font-medium",
                isUp ? "text-emerald-400" : "text-red-400"
              )}>
                {isUp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isUp ? "+" : ""}{quote.d.toFixed(2)} ({isUp ? "+" : ""}{quote.dp.toFixed(2)}%)
              </div>
              <span className="text-xs text-zinc-600">15-min delayed</span>
            </div>
          )}
        </div>

        {/* Consensus score gauge */}
        {consensusScore !== null && (
          <div className="text-right">
            <div className={cn("text-4xl font-mono font-bold tabular-nums", scoreColorClass(consensusScore))}>
              {consensusScore.toFixed(2)}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">/ 5.00 consensus</p>
          </div>
        )}
      </div>

      {/* Price chart */}
      <Card className="bg-zinc-900 border-white/8 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Price History</h2>
        <PriceChart ticker={symbol} />
      </Card>

      {/* Consensus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current consensus */}
        <Card className="bg-zinc-900 border-white/8 p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300">Analyst Consensus</h2>
            {latestRec && (
              <p className="text-xs text-zinc-600 mt-0.5">Period: {latestRec.period}</p>
            )}
          </div>
          {latestRec ? (
            <ConsensusBar
              data={{
                ...latestRec,
                score: consensusScore ?? 3,
              }}
            />
          ) : (
            <p className="text-sm text-zinc-600">No analyst data available</p>
          )}
          {latestRec && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/6">
              {[
                { label: "Strong Buy", v: latestRec.strongBuy, c: "text-emerald-400" },
                { label: "Buy", v: latestRec.buy, c: "text-emerald-300" },
                { label: "Hold", v: latestRec.hold, c: "text-amber-400" },
                { label: "Sell", v: latestRec.sell, c: "text-red-400" },
                { label: "Strong Sell", v: latestRec.strongSell, c: "text-red-500" },
              ].map(({ label, v, c }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{label}</span>
                  <span className={cn("text-sm font-mono font-semibold tabular-nums", c)}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Consensus history */}
        <Card className="bg-zinc-900 border-white/8 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">Consensus History</h2>
          <ConsensusHistoryChart data={stockData?.consensusHistory ?? []} />
        </Card>
      </div>

      {/* Quote stats */}
      {quote && (
        <Card className="bg-zinc-900 border-white/8 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Today's Range</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Open", value: `$${quote.o.toFixed(2)}` },
              { label: "High", value: `$${quote.h.toFixed(2)}` },
              { label: "Low", value: `$${quote.l.toFixed(2)}` },
              { label: "Prev. Close", value: `$${quote.pc.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-zinc-600">{label}</p>
                <p className="text-sm font-mono font-semibold text-zinc-200 tabular-nums mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alert config */}
      <Card className="bg-zinc-900 border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Alert Settings</h2>
          <div className="flex items-center gap-2">
            {alertEnabled ? (
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <Switch
              checked={alertEnabled}
              onCheckedChange={setAlertEnabled}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>
        <Separator className="bg-white/6" />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Notify when score changes by ≥
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0.1"
                max="4"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={!alertEnabled}
                className="w-28 bg-zinc-800/50 border-white/8 text-zinc-100 h-9 font-mono"
              />
              <span className="text-xs text-zinc-600">points (scale 1–5)</span>
            </div>
            <p className="text-[11px] text-zinc-600">
              Current score: {alert?.lastScore?.toFixed(2) ?? "—"} · Threshold: {threshold}
            </p>
          </div>
          <Button
            onClick={saveAlert}
            disabled={savingAlert}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-8"
          >
            {savingAlert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Alert"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
