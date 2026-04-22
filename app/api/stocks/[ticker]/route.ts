import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getQuote, getRecommendations, computeConsensusScore, getCandles } from "@/lib/finnhub";
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
    const quote = await getQuote(symbol);
    return NextResponse.json(quote);
  }

  if (type === "candles") {
    const range = url.searchParams.get("range") || "1M";
    const now = Math.floor(Date.now() / 1000);
    const rangeMap: Record<string, { from: number; resolution: string }> = {
      "1D": { from: now - 86400,         resolution: "5" },
      "1W": { from: now - 604800,        resolution: "15" },
      "1M": { from: now - 2592000,       resolution: "D" },
      "3M": { from: now - 7776000,       resolution: "D" },
      "1Y": { from: now - 31536000,      resolution: "W" },
    };
    const { from, resolution } = rangeMap[range] || rangeMap["1M"];
    const candles = await getCandles(symbol, resolution, from, now);
    return NextResponse.json(candles);
  }

  // Full stock data
  const [quote, trends] = await Promise.allSettled([
    getQuote(symbol),
    getRecommendations(symbol),
  ]);

  // Fetch consensus history from DB
  const watchlistItem = await db.watchlistItem.findUnique({
    where: { userId_ticker: { userId: session.user.id, ticker: symbol } },
    include: {
      consensusSnapshots: {
        orderBy: { recordedAt: "desc" },
        take: 12,
      },
    },
  });

  return NextResponse.json({
    quote: quote.status === "fulfilled" ? quote.value : null,
    recommendations: trends.status === "fulfilled" ? trends.value : [],
    consensusHistory: watchlistItem?.consensusSnapshots ?? [],
  });
}
