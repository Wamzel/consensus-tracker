import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Build trusted origins from the public URL + any extras in env
const trustedOrigins = [
  appUrl,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
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
  baseURL: appUrl,
  trustedOrigins,
});

export type Session = typeof auth.$Infer.Session;
