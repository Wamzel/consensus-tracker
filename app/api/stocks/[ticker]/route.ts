import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getQuote, getRecommendations, getCandles } from "@/lib/finnhub";
import { yfQuote, yfCandles, yfRecommendations, YFRange } from "@/lib/yahoo";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "full";

  if (type === "quote") {
    try {
      return NextResponse.json(await getQuote(symbol));
    } catch {
      try {
        return NextResponse.json(await yfQuote(symbol));
      } catch {
        return NextResponse.json(null);
      }
    }
  }

  if (type === "candles") {
    const range = (url.searchParams.get("range") || "1M") as YFRange;
    const now = Math.floor(Date.now() / 1000);
    const rangeMap: Record<string, { from: number; resolution: string }> = {
      "1D": { from: now - 86400,    resolution: "5" },
      "1W": { from: now - 604800,   resolution: "15" },
      "1M": { from: now - 2592000,  resolution: "D" },
      "3M": { from: now - 7776000,  resolution: "D" },
      "1Y": { from: now - 31536000, resolution: "W" },
    };
    const { from, resolution } = rangeMap[range] || rangeMap["1M"];
    try {
      const candles = await getCandles(symbol, resolution, from, now);
      if (candles.s === "no_data") throw new Error("no_data");
      return NextResponse.json(candles);
    } catch {
      try {
        return NextResponse.json(await yfCandles(symbol, range));
      } catch {
        return NextResponse.json({ s: "no_data" });
      }
    }
  }

  // Full stock data — try Finnhub, fall back to Yahoo Finance
  const [fhQuote, fhTrends] = await Promise.allSettled([
    getQuote(symbol),
    getRecommendations(symbol),
  ]);

  const quote =
    fhQuote.status === "fulfilled"
      ? fhQuote.value
      : await yfQuote(symbol).catch(() => null);

  const recommendations =
    fhTrends.status === "fulfilled" && fhTrends.value.length > 0
      ? fhTrends.value
      : await yfRecommendations(symbol).catch(() => []);

  const watchlistItem = await db.watchlistItem.findUnique({
    where: { userId_ticker: { userId: session.user.id, ticker: symbol } },
    include: {
      consensusSnapshots: { orderBy: { recordedAt: "desc" }, take: 12 },
    },
  });

  return NextResponse.json({
    quote,
    recommendations,
    consensusHistory: watchlistItem?.consensusSnapshots ?? [],
  });
}
