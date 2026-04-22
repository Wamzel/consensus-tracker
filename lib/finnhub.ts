const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY!;

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set("token", API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 900 } }); // 15 min cache
  if (!res.ok) throw new Error(`Finnhub ${path} failed: ${res.status}`);
  return res.json();
}

export interface Quote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percent change
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // prev close
  t: number;   // timestamp
}

export interface RecommendationTrend {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

export interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface Candle {
  c: number[];  // close
  h: number[];  // high
  l: number[];  // low
  o: number[];  // open
  s: string;    // status
  t: number[];  // timestamps
  v: number[];  // volume
}

export function getQuote(symbol: string): Promise<Quote> {
  return get<Quote>("/quote", { symbol });
}

export function getRecommendations(symbol: string): Promise<RecommendationTrend[]> {
  return get<RecommendationTrend[]>("/stock/recommendation", { symbol });
}

export function searchSymbol(query: string): Promise<{ count: number; result: SearchResult[] }> {
  return get("/search", { q: query });
}

export function getCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<Candle> {
  return get<Candle>("/stock/candle", {
    symbol,
    resolution,
    from: String(from),
    to: String(to),
  });
}

// Consensus score: weighted average where 1=StrongSell, 5=StrongBuy
export function computeConsensusScore(trend: RecommendationTrend): number {
  const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
  if (total === 0) return 3;
  const weighted =
    trend.strongBuy * 5 +
    trend.buy * 4 +
    trend.hold * 3 +
    trend.sell * 2 +
    trend.strongSell * 1;
  return weighted / total;
}

export function scoreLabel(score: number): string {
  if (score >= 4.5) return "Strong Buy";
  if (score >= 3.5) return "Buy";
  if (score >= 2.5) return "Hold";
  if (score >= 1.5) return "Sell";
  return "Strong Sell";
}

export function scoreColor(score: number): string {
  if (score >= 4.5) return "text-emerald-400";
  if (score >= 3.5) return "text-emerald-300";
  if (score >= 2.5) return "text-amber-400";
  if (score >= 1.5) return "text-red-400";
  return "text-red-500";
}
