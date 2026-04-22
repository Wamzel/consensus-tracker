"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Notification {
  id: string;
  ticker: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
    setMarkingAll(false);
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Notifications</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
            className="text-zinc-400 hover:text-zinc-200 gap-1.5 h-8 text-xs"
          >
            {markingAll
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCheck className="w-3.5 h-3.5" />
            }
            Mark all read
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/8 rounded-xl">
          <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No notifications yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            Alerts will appear here when consensus scores change
          </p>
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
              n.read
                ? "border-transparent bg-transparent hover:bg-white/2"
                : "border-emerald-500/15 bg-emerald-500/5 hover:bg-emerald-500/8"
            )}
          >
            <div className={cn(
              "mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-2",
              n.read ? "bg-zinc-700" : "bg-emerald-500"
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/stock/${n.ticker}`}>
                  <span className="text-xs font-mono font-bold text-zinc-400 hover:text-emerald-400 transition-colors">
                    {n.ticker}
                  </span>
                </Link>
                <span className={cn(
                  "text-sm font-medium",
                  n.read ? "text-zinc-400" : "text-zinc-200"
                )}>
                  {n.title}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>
            </div>
            <span className="text-[11px] text-zinc-700 shrink-0 whitespace-nowrap">
              {format(new Date(n.createdAt), "MMM d, HH:mm")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
