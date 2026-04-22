import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await db.alert.findMany({
    where: { userId: session.user.id },
    include: { watchlistItem: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(alerts);
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker, threshold, enabled } = await req.json();

  const alert = await db.alert.upsert({
    where: { userId_ticker: { userId: session.user.id, ticker: ticker.toUpperCase() } },
    update: {
      ...(threshold !== undefined && { threshold: Number(threshold) }),
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
    },
    create: {
      userId: session.user.id,
      watchlistItemId: (
        await db.watchlistItem.findUniqueOrThrow({
          where: { userId_ticker: { userId: session.user.id, ticker: ticker.toUpperCase() } },
        })
      ).id,
      ticker: ticker.toUpperCase(),
      threshold: Number(threshold ?? 0.5),
      enabled: enabled ?? true,
    },
  });

  return NextResponse.json(alert);
}
