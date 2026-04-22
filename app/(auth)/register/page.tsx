"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Eye, EyeOff, Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp.email({
        name,
        email,
        password,
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
          onError: (ctx) => {
            setError(ctx.error?.message || "Registration failed");
          },
        },
      });
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-zinc-100">Create account</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Start tracking analyst consensus</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/8 rounded-xl p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-zinc-400">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="bg-zinc-800/50 border-white/8 text-zinc-100 placeholder:text-zinc-600 h-9"
              />
            </div>
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
                  minLength={8}
                  autoComplete="new-password"
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
              <p className="text-[11px] text-zinc-600">Minimum 8 characters</p>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-9"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-500 hover:text-emerald-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
