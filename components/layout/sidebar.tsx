"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { signOut, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/",              icon: LayoutDashboard, label: "Dashboard" },
  { href: "/alerts",        icon: TriangleAlert,   label: "Alerts" },
  { href: "/notifications", icon: Bell,            label: "Notifications" },
  { href: "/settings",      icon: Settings,        label: "Settings" },
];

interface SidebarProps {
  unreadCount?: number;
}

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-white/8 bg-zinc-950 transition-all duration-300 shrink-0",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-5 border-b border-white/8",
        collapsed && "justify-center px-0"
      )}>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shrink-0">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-zinc-100 whitespace-nowrap">
            Consensus
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          if (collapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger>
                  <Link href={href}>
                    <span className={cn(
                      "relative flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors",
                      active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    )}>
                      <Icon className="w-4 h-4" />
                      {label === "Notifications" && unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }
          return (
            <Link key={href} href={href}>
              <span className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-emerald-500/12 text-emerald-400 font-medium"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {label === "Notifications" && unreadCount > 0 && (
                  <Badge className="h-4 px-1 text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn(
        "border-t border-white/8 p-2",
        collapsed ? "flex justify-center" : ""
      )}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 w-9 h-9"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="text-[11px] bg-zinc-800 text-zinc-300">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-zinc-600 truncate">{user?.email}</p>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 w-7 h-7 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-10 w-6 h-6 rounded-full border border-white/10 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 shadow"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </Button>
    </aside>
  );
}
