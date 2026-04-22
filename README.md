# Consensus Tracker

Track analyst consensus ("Analistenconsensus") for your personal stock watchlist. Notifies you via push notification and in-app inbox when a consensus score moves beyond your configured threshold.

## Features

- **Watchlist** — search and add stocks by ticker (powered by Finnhub)
- **Consensus bar** — visual strong-buy → strong-sell breakdown per stock
- **Price chart** — 15-min delayed price with 1D/1W/1M/3M/1Y ranges
- **Consensus history** — line chart of score over time (stored on every poll)
- **Per-stock alerts** — configurable Δ threshold; fires push + in-app notification
- **Login + 2FA** — email/password auth with optional TOTP (Google Authenticator, 1Password, etc.)
- **PWA** — install to iPhone home screen for push notification support

## Quick Start (Docker)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd consensus-tracker
cp .env.example .env
```

Edit `.env`:

| Variable | Where to get it |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `FINNHUB_API_KEY` | Free at [finnhub.io](https://finnhub.io) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_EMAIL` | `mailto:your@email.com` |
| `CRON_SECRET` | `openssl rand -base64 32` |

### 2. Run

```bash
docker compose up --build -d
```

The app starts at **http://localhost:3000**. On first boot the `app` container runs `prisma migrate deploy` automatically.

### 3. Enable push notifications (iPhone)

1. Open the app in **Safari** on your iPhone
2. Tap **Share → Add to Home Screen**
3. Open from the home screen icon
4. Go to **Settings → Push Notifications** and toggle on

### Consensus polling

The `cron` container runs daily at 06:00 UTC and hits `/api/cron`. Manual trigger:

```bash
curl -X POST http://localhost:3000/api/cron \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

## Consensus Score Scale

| Score | Rating |
|---|---|
| 4.5 – 5.0 | Strong Buy |
| 3.5 – 4.49 | Buy |
| 2.5 – 3.49 | Hold |
| 1.5 – 2.49 | Sell |
| 1.0 – 1.49 | Strong Sell |

Score = weighted average where Strong Buy=5, Buy=4, Hold=3, Sell=2, Strong Sell=1.

## Tech Stack

- **Framework**: Next.js 15 App Router (standalone Docker output)
- **Auth**: better-auth — email/password + TOTP 2FA
- **Database**: PostgreSQL · Prisma 7 · `@prisma/adapter-pg`
- **Data**: Finnhub API (free tier, 15-min delayed quotes)
- **Charts**: Recharts
- **Push**: web-push + PWA Service Worker
- **UI**: shadcn/ui (base-ui) · Tailwind · lucide-react
