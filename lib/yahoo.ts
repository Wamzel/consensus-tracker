const YF_BASE = "https://query1.finance.yahoo.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export type YFRange = "1D" | "1W" | "1M" | "3M" | "1Y";

const RANGE_CONFIG: Record<YFRange, { range: string; interval: string }> = {
  "1D": { range: "1d",  interval: "5m" },
  "1W": { range: "5d",  interval: "15m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "1Y": { range: "1y",  interval: "1wk" },
};

async function chartFetch(symbol: string, rangeKey: YFRange) {
  const { range, interval } = RANGE_CONFIG[rangeKey];
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`Yahoo Finance chart failed: ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("No chart data from Yahoo Finance");
  return result;
}

export interface YFQuote {
  c: number; d: number; dp: number;
  h: number; l: number; o: number; pc: number; t: number;
}

export async function yfQuote(symbol: string): Promise<YFQuote> {
  const result = await chartFetch(symbol, "1D");
  const m = result.meta;
  return {
    c:  m.regularMarketPrice       ?? 0,
    d:  m.regularMarketChange      ?? 0,
    dp: m.regularMarketChangePercent ?? 0,
    h:  m.regularMarketDayHigh     ?? m.regularMarketPrice ?? 0,
    l:  m.regularMarketDayLow      ?? m.regularMarketPrice ?? 0,
    o:  m.regularMarketOpen        ?? m.regularMarketPrice ?? 0,
    pc: m.chartPreviousClose       ?? m.regularMarketPrice ?? 0,
    t:  m.regularMarketTime        ?? 0,
  };
}

export interface YFCandle {
  s: string;
  c: number[]; h: number[]; l: number[];
  o: number[]; t: number[]; v: number[];
}

export async function yfCandles(symbol: string, rangeKey: YFRange = "1M"): Promise<YFCandle> {
  const result = await chartFetch(symbol, rangeKey);
  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};

  // Filter out null entries (holidays / pre-market gaps)
  const points = timestamps
    .map((t, i) => ({
      t,
      o: q.open?.[i]   as number | null,
      h: q.high?.[i]   as number | null,
      l: q.low?.[i]    as number | null,
      c: q.close?.[i]  as number | null,
      v: q.volume?.[i] as number | null,
    }))
    .filter((p) => p.c != null);

  if (points.length === 0) return { s: "no_data", c: [], h: [], l: [], o: [], t: [], v: [] };

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

export interface YFRecommendation {
  strongBuy: number; buy: number; hold: number;
  sell: number; strongSell: number;
  period: string; symbol: string;
}

export async function yfRecommendations(symbol: string): Promise<YFRecommendation[]> {
  const url = `${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend`;
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  const trends: Array<Record<string, number | string>> =
    json?.quoteSummary?.result?.[0]?.recommendationTrend?.trend ?? [];

  return trends
    .filter((t) => (t.strongBuy as number) + (t.buy as number) + (t.hold as number) + (t.sell as number) + (t.strongSell as number) > 0)
    .map((t) => {
      // "0m" → current month, "-1m" → last month, etc.
      const monthOffset = parseInt(t.period as string) || 0;
      const d = new Date();
      d.setMonth(d.getMonth() + monthOffset);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      return {
        strongBuy:  (t.strongBuy  as number) ?? 0,
        buy:        (t.buy        as number) ?? 0,
        hold:       (t.hold       as number) ?? 0,
        sell:       (t.sell       as number) ?? 0,
        strongSell: (t.strongSell as number) ?? 0,
        period,
        symbol,
      };
    });
}
