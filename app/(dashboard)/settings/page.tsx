"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Smartphone,
  Bell,
  Check,
  Copy,
  Loader2,
  QrCode,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ totpURI: string; secret: string } | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");

  // Check if push is already subscribed
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    });
  }, []);

  async function togglePush() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
        toast.success("Push notifications disabled");
      } else {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        setPushEnabled(true);
        toast.success("Push notifications enabled");
      }
    } catch (e) {
      toast.error("Failed to update push settings");
    } finally {
      setPushLoading(false);
    }
  }

  async function setup2FA() {
    if (!password) { toast.error("Enter your password first"); return; }
    setTotpLoading(true);
    try {
      const res = await (authClient as any).twoFactor.getTotpUri({ password });
      if (res?.data) {
        setTotpSetup({ totpURI: res.data.totpURI, secret: res.data.secret ?? res.data.totpURI });
      }
    } catch {
      toast.error("Failed to set up 2FA");
    } finally {
      setTotpLoading(false);
    }
  }

  async function verify2FA() {
    setVerifying(true);
    try {
      const res = await (authClient as any).twoFactor.enable({ code: totpCode, password });
      if (res.data) {
        setIs2FAEnabled(true);
        setTotpSetup(null);
        setTotpCode("");
        toast.success("Two-factor authentication enabled");
      } else {
        toast.error("Invalid code");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  function copySecret() {
    if (totpSetup?.secret) {
      navigator.clipboard.writeText(totpSetup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Account & notification preferences</p>
      </div>

      {/* Account info */}
      <Card className="bg-zinc-900 border-white/8 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Account</h2>
        <Separator className="bg-white/6" />
        <div className="space-y-1">
          <p className="text-xs text-zinc-600">Name</p>
          <p className="text-sm text-zinc-200">{session?.user.name || "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-zinc-600">Email</p>
          <p className="text-sm text-zinc-200">{session?.user.email}</p>
        </div>
      </Card>

      {/* Push notifications */}
      <Card className="bg-zinc-900 border-white/8 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-300">Push Notifications</h2>
        </div>
        <Separator className="bg-white/6" />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm text-zinc-200">Browser / PWA push</p>
            <p className="text-xs text-zinc-600">
              Receive alerts when installed to home screen (iOS 16.4+ required)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pushLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />}
            <Switch
              checked={pushEnabled}
              onCheckedChange={togglePush}
              disabled={pushLoading || typeof window === "undefined" || !("serviceWorker" in navigator)}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>
        {typeof window !== "undefined" && !("serviceWorker" in navigator) && (
          <p className="text-xs text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Service workers not supported in this browser
          </p>
        )}
      </Card>

      {/* 2FA */}
      <Card className="bg-zinc-900 border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Two-Factor Authentication</h2>
          </div>
          {is2FAEnabled && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px]">
              Enabled
            </Badge>
          )}
        </div>
        <Separator className="bg-white/6" />

        {!totpSetup && !is2FAEnabled && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Add an extra layer of security using an authenticator app (Google Authenticator, 1Password, etc.)
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Confirm your password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-zinc-800/50 border-white/8 text-zinc-100 h-9 max-w-xs"
              />
            </div>
            <Button
              onClick={setup2FA}
              disabled={totpLoading || !password}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-8"
            >
              {totpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Set up 2FA"}
            </Button>
          </div>
        )}

        {totpSetup && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">
              Scan the QR code or copy the secret into your authenticator app.
            </p>
            {/* QR code via Google Chart API for simplicity */}
            <div className="flex items-start gap-4">
              <div className="w-36 h-36 bg-white rounded-lg p-1.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(totpSetup.totpURI)}&size=130x130&bgcolor=ffffff&color=000000`}
                  alt="TOTP QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs text-zinc-500">Manual secret:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-zinc-300 bg-zinc-800 rounded px-2 py-1 break-all flex-1">
                    {totpSetup.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copySecret}
                    className="h-7 w-7 shrink-0 text-zinc-500 hover:text-zinc-300"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Enter the 6-digit code to verify</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-36 bg-zinc-800/50 border-white/8 text-zinc-100 h-9 font-mono tracking-widest text-center"
                />
                <Button
                  onClick={verify2FA}
                  disabled={verifying || totpCode.length !== 6}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-9"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify & Enable"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {is2FAEnabled && (
          <p className="text-sm text-zinc-400">
            Your account is protected with two-factor authentication.
          </p>
        )}
      </Card>
    </div>
  );
}
