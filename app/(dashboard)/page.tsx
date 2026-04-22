"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConsensusBar } from "@/components/charts/consensus-bar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WatchlistItem {
  id: string;
  ticker: string;
  name: string | null;
  consensusSnapshots: Array<{
    score: number;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    period: string;
  }>;
  alerts: Array<{ threshold: number; enabled: boolean }>;
}

interface SearchResult {
  symbol: string;
  description: string;
  type: string;
}

function ScorePill({ score }: { score: number }) {
  const label =
    score >= 4.5 ? "Strong Buy" :
    score >= 3.5 ? "Buy" :
    score >= 2.5 ? "Hold" :
    score >= 1.5 ? "Sell" : "Strong Sell";
  const color =
    score >= 4.5 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    score >= 3.5 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
    score >= 2.5 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
    score >= 1.5 ? "bg-red-500/10 text-red-400 border-red-500/20" :
                   "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", color)}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/watchlist");
    const data = await res.json();
    setWatchlist(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.result?.slice(0, 8) ?? []);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  async function addTicker(symbol: string, name: string) {
    setAdding(symbol);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: symbol, name }),
    });
    if (res.ok) {
      toast.success(`${symbol} added to watchlist`);
      setAddOpen(false);
      setQuery("");
      fetchWatchlist();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to add");
    }
    setAdding(null);
  }

  async function removeTicker(ticker: string) {
    setRemoving(ticker);
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    toast.success(`${ticker} removed`);
    setWatchlist((prev) => prev.filter((i) => i.ticker !== ticker));
    setRemoving(null);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Watchlist</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {watchlist.length} stock{watchlist.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchWatchlist}
            className="text-zinc-500 hover:text-zinc-300 h-8 w-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-8 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stock
              </Button>
            } />
            <DialogContent className="bg-zinc-900 border-white/8 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-zinc-100 text-base">Add to watchlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ticker or company..."
                    className="pl-9 bg-zinc-800/50 border-white/8 text-zinc-100 placeholder:text-zinc-600 h-9"
                    autoFocus
                  />
                </div>
                {searchLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                  </div>
                )}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.symbol}
                        onClick={() => addTicker(r.symbol, r.description)}
                        disabled={adding === r.symbol}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono font-semibold text-zinc-200">{r.symbol}</span>
                          <p className="text-xs text-zinc-500 truncate">{r.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500 shrink-0">
                          {r.type}
                        </Badge>
                        {adding === r.symbol && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
        </div>
      ) : watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 border border-dashed border-white/8 rounded-xl">
          <TrendingUp className="w-8 h-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">No stocks tracked yet</p>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add your first stock
          </Button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/8 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_120px_100px] gap-0 border-b border-white/6 px-4 py-2.5">
            <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Ticker</span>
            <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Consensus</span>
            <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider text-right">Score</span>
            <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider text-right">Rating</span>
          </div>
          <div className="divide-y divide-white/4">
            {watchlist.map((item) => {
              const snap = item.consensusSnapshots[0];
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_2fr_120px_100px] gap-0 items-center px-4 py-3 hover:bg-white/2 group transition-colors"
                >
                  <Link href={`/stock/${item.ticker}`} className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                      {item.ticker}
                    </p>
                    <p className="text-xs text-zinc-600 truncate">{item.name}</p>
                  </Link>
                  <div className="pr-6">
                    {snap ? (
                      <ConsensusBar data={snap} showLabels={false} compact />
                    ) : (
                      <span className="text-xs text-zinc-700">No data</span>
                    )}
                  </div>
                  <div className="text-right">
                    {snap ? (
                      <span className="text-sm font-mono font-semibold text-zinc-200 tabular-nums">
                        {snap.score.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {snap && <ScorePill score={snap.score} />}
                    <button
                      onClick={() => removeTicker(item.ticker)}
                      disabled={removing === item.ticker}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-700 hover:text-red-400 ml-1"
                    >
                      {removing === item.ticker
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
