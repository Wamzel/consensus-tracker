import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const unread = await db.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        <Sidebar unreadCount={unread} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </TooltipProvider>
  );
}
