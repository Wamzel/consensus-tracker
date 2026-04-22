import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db";

// AUTH_URL is a plain runtime env var (not NEXT_PUBLIC_*, which is build-time).
// Set it in Portainer to your public domain, e.g. https://stocks.wgmns.com
const authUrl = process.env.AUTH_URL ?? "http://localhost:3000";

const trustedOrigins = [
  authUrl,
  ...( process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
];

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    twoFactor({
      issuer: "ConsensusTracker",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: authUrl,
  trustedOrigins,
});

export type Session = typeof auth.$Infer.Session;
