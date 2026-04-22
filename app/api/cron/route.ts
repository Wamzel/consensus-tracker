import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRecommendations, computeConsensusScore } from "@/lib/finnhub";
import { yfRecommendations } from "@/lib/yahoo";
import { sendPushNotification } from "@/lib/push";

// Called by Docker cron or external scheduler
// Protected by a shared secret
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickers = await db.watchlistItem.findMany({
    distinct: ["ticker"],
    select: { ticker: true, id: true, userId: true },
  });

  const results: string[] = [];

  for (const item of tickers) {
    try {
      let trends = await getRecommendations(item.ticker).catch(() => []);
      if (!trends.length) trends = await yfRecommendations(item.ticker).catch(() => []);
      if (!trends.length) continue;

      const latest = trends[0];
      const newScore = computeConsensusScore(latest);

      // Check if snapshot for this period already exists
      const existing = await db.consensusSnapshot.findFirst({
        where: { watchlistItemId: item.id, period: latest.period },
      });

      if (!existing) {
        await db.consensusSnapshot.create({
          data: {
            watchlistItemId: item.id,
            ticker: item.ticker,
            period: latest.period,
            strongBuy: latest.strongBuy,
            buy: latest.buy,
            hold: latest.hold,
            sell: latest.sell,
            strongSell: latest.strongSell,
            score: newScore,
          },
        });
      }

      // Check alert thresholds
      const alert = await db.alert.findUnique({
        where: { userId_ticker: { userId: item.userId, ticker: item.ticker } },
      });

      if (alert && alert.enabled && alert.lastScore !== null) {
        const delta = Math.abs(newScore - alert.lastScore);
        if (delta >= alert.threshold) {
          const direction = newScore > alert.lastScore ? "improved" : "declined";
          const title = `${item.ticker} consensus ${direction}`;
          const body = `Score moved from ${alert.lastScore.toFixed(2)} → ${newScore.toFixed(2)} (Δ${delta.toFixed(2)})`;

          // Store in-app notification
          await db.notification.create({
            data: { userId: item.userId, ticker: item.ticker, title, body },
          });

          // Send push to all user subscriptions
          const subs = await db.pushSubscription.findMany({
            where: { userId: item.userId },
          });

          for (const sub of subs) {
            try {
              await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
                title,
                body,
                url: `/stock/${item.ticker}`,
              });
            } catch (e: unknown) {
              const error = e as Error;
              if (error.message === "SUBSCRIPTION_EXPIRED") {
                await db.pushSubscription.delete({ where: { id: sub.id } });
              }
            }
          }

          // Update lastScore
          await db.alert.update({
            where: { id: alert.id },
            data: { lastScore: newScore, lastTriggered: new Date() },
          });
        } else {
          // Keep lastScore current even if no alert
          await db.alert.update({
            where: { id: alert.id },
            data: { lastScore: newScore },
          });
        }
      }

      results.push(`${item.ticker}: ${newScore.toFixed(2)}`);
    } catch (e) {
      results.push(`${item.ticker}: ERROR`);
    }
  }

  return NextResponse.json({ processed: results });
}
