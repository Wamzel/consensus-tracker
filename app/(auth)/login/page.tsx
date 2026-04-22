"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
        fetchOptions: {
          onResponse: (ctx) => {
            if (ctx.response.status === 200) {
              router.push("/");
              router.refresh();
            }
          },
          onError: (ctx) => {
            const msg = ctx.error?.message || "Invalid credentials";
            if (msg.includes("two_factor") || msg.includes("2fa")) {
              setShowTotp(true);
            } else {
              setError(msg);
            }
          },
        },
      });
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // @ts-expect-error better-auth 2fa verify
      await signIn.twoFactor({ code: totpCode, fetchOptions: {
        onSuccess: () => { router.push("/"); router.refresh(); },
        onError: (ctx: { error?: { message?: string } }) => setError(ctx.error?.message || "Invalid code"),
      }});
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-zinc-100">Consensus Tracker</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Sign in to your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-white/8 rounded-xl p-6 space-y-4">
          {!showTotp ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-zinc-400">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="bg-zinc-800/50 border-white/8 text-zinc-100 placeholder:text-zinc-600 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-zinc-400">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="bg-zinc-800/50 border-white/8 text-zinc-100 placeholder:text-zinc-600 h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                  >
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-9"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-zinc-200">Two-factor authentication</p>
                <p className="text-xs text-zinc-500">Enter the code from your authenticator app</p>
              </div>
              <Input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                className="bg-zinc-800/50 border-white/8 text-zinc-100 text-center tracking-widest text-lg h-11 font-mono"
                autoFocus
              />
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-9"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600">
          No account?{" "}
          <Link href="/register" className="text-emerald-500 hover:text-emerald-400">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
