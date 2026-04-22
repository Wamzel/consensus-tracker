import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { getRecommendations, computeConsensusScore } from "@/lib/finnhub";
import { yfRecommendations } from "@/lib/yahoo";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.watchlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { position: "asc" },
    include: {
      consensusSnapshots: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      alerts: { take: 1 },
    },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker, name, exchange } = await req.json();
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const symbol = ticker.toUpperCase();

  const existing = await db.watchlistItem.findUnique({
    where: { userId_ticker: { userId: session.user.id, ticker: symbol } },
  });
  if (existing) return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });

  const count = await db.watchlistItem.count({ where: { userId: session.user.id } });

  const item = await db.watchlistItem.create({
    data: {
      userId: session.user.id,
      ticker: symbol,
      name: name || symbol,
      exchange: exchange || null,
      position: count,
    },
  });

  // Always create a default alert for the new watchlist item
  await db.alert.create({
    data: {
      userId: session.user.id,
      watchlistItemId: item.id,
      ticker: symbol,
      threshold: 0.5,
      lastScore: null,
    },
  });

  // Seed initial consensus snapshot (best-effort, Finnhub then Yahoo Finance)
  try {
    let trends = await getRecommendations(symbol).catch(() => []);
    if (trends.length === 0) trends = await yfRecommendations(symbol).catch(() => []);
    if (trends.length > 0) {
      const latest = trends[0];
      const score = computeConsensusScore(latest);
      await db.consensusSnapshot.create({
        data: {
          watchlistItemId: item.id,
          ticker: symbol,
          period: latest.period,
          strongBuy: latest.strongBuy,
          buy: latest.buy,
          hold: latest.hold,
          sell: latest.sell,
          strongSell: latest.strongSell,
          score,
        },
      });
      // Update the alert with the initial score
      await db.alert.update({
        where: { userId_ticker: { userId: session.user.id, ticker: symbol } },
        data: { lastScore: score },
      });
    }
  } catch {
    // Non-fatal: snapshot will be fetched on next cron run
  }

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker } = await req.json();
  await db.watchlistItem.deleteMany({
    where: { userId: session.user.id, ticker: ticker.toUpperCase() },
  });
  return NextResponse.json({ ok: true });
}
