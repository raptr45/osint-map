"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  MessageSquareQuote, 
  Users, 
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  Database,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const MENU_ITEMS = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    requiredClearance: "analyst",
  },
  {
    title: "Moderation Queue",
    href: "/admin/queue",
    icon: MessageSquareQuote,
    badge: "New",
    requiredClearance: "analyst", // Analysts can view the queue, but can't edit
  },
  {
    title: "User Roles",
    href: "/admin/roles",
    icon: Users,
    requiredClearance: "admin",
  },
  {
    title: "Signal Sources",
    href: "/admin/sources",
    icon: Database,
    requiredClearance: "admin",
  },
  {
    title: "System Logs",
    href: "/admin/logs",
    icon: BarChart3,
    requiredClearance: "moderator", // Logs are somewhat sensitive, but moderators can see
  },
];

const ROLE_RANKS: Record<string, number> = {
  owner: 4,
  admin: 4,
  moderator: 3,
  analyst: 2,
  user: 1,
};

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  
  const userRank = ROLE_RANKS[(session?.user as Record<string, unknown>)?.role as string || "user"] || 1;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-border/50 flex flex-col z-50">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:rotate-12 shadow-lg shadow-primary/20">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-5 h-5 text-primary-foreground"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight uppercase text-foreground font-display">Hub</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-4 mt-2">
          Administration
        </div>
        {MENU_ITEMS.filter(item => userRank >= (ROLE_RANKS[item.requiredClearance] || 1)).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all group font-sans text-sm font-medium",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <span className="text-[11px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shadow-sm shadow-primary/20">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto space-y-4">
        <div className="bg-secondary/30 rounded-2xl p-4 border border-border/40">
          <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 overflow-hidden">
                {session?.user.image ? (
                  <Image src={session.user.image} alt={session.user.name} width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate">{session?.user.name}</span>
                <span className="text-[11px] text-primary font-semibold uppercase tracking-tight">System Admin</span>
              </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg h-9"
            onClick={() => authClient.signOut()}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Sign Out</span>
          </Button>
        </div>

        <div className="flex items-center justify-between px-4 text-[10px] text-muted-foreground font-medium border-t border-border/20 pt-4">
          <span>v0.1.0-alpha</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
