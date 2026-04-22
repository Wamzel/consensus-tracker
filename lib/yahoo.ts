const YF_BASE = "https://query1.finance.yahoo.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

export type YFRange = "1D" | "1W" | "1M" | "3M" | "1Y";

const RANGE_CONFIG: Record<YFRange, { range: string; interval: string }> = {
  "1D": { range: "1d",  interval: "5m" },
  "1W": { range: "5d",  interval: "15m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "1Y": { range: "1y",  interval: "1wk" },
};

// Number of calendar days to fetch per range key (for Stooq fallback)
const STOOQ_DAYS: Record<YFRange, number> = {
  "1D": 3, "1W": 9, "1M": 35, "3M": 95, "1Y": 370,
};

export interface YFQuote {
  c: number; d: number; dp: number;
  h: number; l: number; o: number; pc: number; t: number;
}

export interface YFCandle {
  s: string;
  c: number[]; h: number[]; l: number[];
  o: number[]; t: number[]; v: number[];
}

export interface YFRecommendation {
  strongBuy: number; buy: number; hold: number;
  sell: number; strongSell: number;
  period: string; symbol: string;
}

// ─── Stooq fallback ──────────────────────────────────────────────────────────

// Stooq uses AAPL.US for US stocks, BESI.AS for Amsterdam, BMW.DE for Frankfurt, etc.
function toStooqSymbol(symbol: string): string {
  return symbol.includes(".") ? symbol.toLowerCase() : `${symbol.toLowerCase()}.us`;
}

async function stooqCandles(symbol: string, rangeKey: YFRange): Promise<YFCandle> {
  const now = new Date();
  const from = new Date();
  from.setDate(from.getDate() - STOOQ_DAYS[rangeKey]);

  const interval = rangeKey === "1Y" ? "w" : "d";
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  const stooqSym = toStooqSymbol(symbol);
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSym)}&d1=${fmt(from)}&d2=${fmt(now)}&i=${interval}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stooq ${res.status} for ${stooqSym}`);

  const text = await res.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error(`Stooq: no data for ${stooqSym}`);

  const result: YFCandle = { s: "ok", t: [], c: [], h: [], l: [], o: [], v: [] };

  // Stooq CSV: Date,Open,High,Low,Close,Volume  (ascending date order)
  for (const line of lines.slice(1)) {
    const parts = line.split(",");
    if (parts.length < 5) continue;
    const [date, open, high, low, close, volume = "0"] = parts;
    const closeNum = parseFloat(close);
    if (!date || isNaN(closeNum)) continue;
    // Use noon UTC so timezone issues don't shift the date
    const ts = Math.floor(new Date(`${date.trim()}T12:00:00Z`).getTime() / 1000);
    if (isNaN(ts)) continue;
    result.t.push(ts);
    result.o.push(parseFloat(open) || closeNum);
    result.h.push(parseFloat(high) || closeNum);
    result.l.push(parseFloat(low) || closeNum);
    result.c.push(closeNum);
    result.v.push(parseInt(volume) || 0);
  }

  if (result.t.length === 0) throw new Error(`Stooq: all rows invalid for ${stooqSym}`);
  console.log(`[stooq] ${result.t.length} candles for ${symbol} (${rangeKey})`);
  return result;
}

// ─── Yahoo Finance chart (v8) ─────────────────────────────────────────────────

async function chartFetch(symbol: string, rangeKey: YFRange) {
  const { range, interval } = RANGE_CONFIG[rangeKey];
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[yahoo] chart ${res.status} for ${symbol}: ${body.slice(0, 150)}`);
    throw new Error(`Yahoo Finance chart failed: ${res.status}`);
  }
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    console.error(`[yahoo] empty chart result for ${symbol}:`, JSON.stringify(json).slice(0, 150));
    throw new Error("No chart data from Yahoo Finance");
  }
  return result;
}

export async function yfQuote(symbol: string): Promise<YFQuote> {
  try {
    const result = await chartFetch(symbol, "1D");
    const m = result.meta;
    return {
      c:  m.regularMarketPrice         ?? 0,
      d:  m.regularMarketChange        ?? 0,
      dp: m.regularMarketChangePercent ?? 0,
      h:  m.regularMarketDayHigh       ?? m.regularMarketPrice ?? 0,
      l:  m.regularMarketDayLow        ?? m.regularMarketPrice ?? 0,
      o:  m.regularMarketOpen          ?? m.regularMarketPrice ?? 0,
      pc: m.chartPreviousClose         ?? m.regularMarketPrice ?? 0,
      t:  m.regularMarketTime          ?? 0,
    };
  } catch {
    // Fall back to Stooq last close
    const candles = await stooqCandles(symbol, "1M");
    if (candles.s === "ok" && candles.c.length > 0) {
      const i = candles.c.length - 1;
      const close = candles.c[i];
      const prev  = candles.c[Math.max(0, i - 1)];
      const chg   = close - prev;
      return {
        c: close, d: chg,
        dp: prev !== 0 ? (chg / prev) * 100 : 0,
        h: candles.h[i] ?? close, l: candles.l[i] ?? close,
        o: candles.o[i] ?? close, pc: prev,
        t: candles.t[i] ?? Math.floor(Date.now() / 1000),
      };
    }
    throw new Error(`No quote data for ${symbol}`);
  }
}

export async function yfCandles(symbol: string, rangeKey: YFRange = "1M"): Promise<YFCandle> {
  // Try Yahoo Finance v8 first
  try {
    const result = await chartFetch(symbol, rangeKey);
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};

    const points = timestamps
      .map((t, i) => ({
        t, o: q.open?.[i] as number | null, h: q.high?.[i] as number | null,
        l: q.low?.[i] as number | null, c: q.close?.[i] as number | null,
        v: q.volume?.[i] as number | null,
      }))
      .filter((p) => p.c != null);

    if (points.length > 0) {
      return {
        s: "ok",
        t: points.map((p) => p.t),
        c: points.map((p) => p.c!),
        h: points.map((p) => p.h ?? p.c!),
        l: points.map((p) => p.l ?? p.c!),
        o: points.map((p) => p.o ?? p.c!),
        v: points.map((p) => p.v ?? 0),
      };
    }
    throw new Error("Yahoo Finance returned empty candles");
  } catch (err) {
    console.log(`[yahoo] candles fallback to Stooq for ${symbol} (${rangeKey}): ${err}`);
    return stooqCandles(symbol, rangeKey);
  }
}

// ─── Yahoo Finance quoteSummary (analyst recommendations) ────────────────────

export async function yfRecommendations(symbol: string): Promise<YFRecommendation[]> {
  const url = `${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend`;
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) {
    console.error(`[yahoo] recommendations ${res.status} for ${symbol}`);
    return [];
  }
  const json = await res.json();
  const trends: Array<Record<string, number | string>> =
    json?.quoteSummary?.result?.[0]?.recommendationTrend?.trend ?? [];

  if (trends.length === 0) {
    console.log(`[yahoo] no recommendation trends for ${symbol}`);
    return [];
  }

  return trends
    .filter((t) =>
      ((t.strongBuy as number) || 0) + ((t.buy as number) || 0) +
      ((t.hold as number) || 0) + ((t.sell as number) || 0) +
      ((t.strongSell as number) || 0) > 0
    )
    .map((t) => {
      // Yahoo Finance periods: "0m" = current month, "-1m" = last month, etc.
      const monthOffset = parseInt(t.period as string) || 0;
      const d = new Date();
      d.setMonth(d.getMonth() + monthOffset);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      return {
        strongBuy:  Number(t.strongBuy)  || 0,
        buy:        Number(t.buy)        || 0,
        hold:       Number(t.hold)       || 0,
        sell:       Number(t.sell)       || 0,
        strongSell: Number(t.strongSell) || 0,
        period,
        symbol,
      };
    });
}
