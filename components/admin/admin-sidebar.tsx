"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Database,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  PanelLeft,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

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
    requiredClearance: "analyst",
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
    requiredClearance: "moderator",
  },
];

const ROLE_RANKS: Record<string, number> = {
  owner: 4,
  admin: 4,
  moderator: 3,
  analyst: 2,
  user: 1,
};

export const SIDEBAR_MODE_KEY = "osint-sidebar-mode";

type SidebarMode = "expanded" | "collapsed" | "hover";

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const userRank =
    ROLE_RANKS[
      ((session?.user as Record<string, unknown>)?.role as string) || "user"
    ] || 1;

  const [mode, setMode] = React.useState<SidebarMode>("expanded");
  const [mounted, setMounted] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_MODE_KEY) as SidebarMode | null;
    if (stored === "expanded" || stored === "collapsed" || stored === "hover") {
      setMode(stored);
    }
    setMounted(true);
  }, []);

  const changeMode = (newMode: SidebarMode) => {
    setMode(newMode);
    localStorage.setItem(SIDEBAR_MODE_KEY, newMode);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: SIDEBAR_MODE_KEY,
        newValue: newMode,
      })
    );
  };

  if (!mounted)
    return (
      <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-border/50 z-50" />
    );

  const isVisuallyExpanded =
    mode === "expanded" || (mode === "hover" && isHovering);

  return (
    <aside
      onMouseEnter={() => mode === "hover" && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "fixed left-0 top-0 h-screen bg-background border-r border-border/50 flex flex-col z-50 transition-all duration-300 ease-in-out shadow-lg",
        isVisuallyExpanded ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center px-4 h-16 border-b border-border/20 shrink-0",
          isVisuallyExpanded ? "justify-between" : "justify-center"
        )}
      >
        {isVisuallyExpanded && (
          <Link
            href="/"
            className="flex items-center gap-2 group overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight uppercase text-foreground font-display transition-opacity duration-300 whitespace-nowrap">
              Hub
            </span>
          </Link>
        )}

        {!isVisuallyExpanded && (
          <Link href="/" className="group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 transition-transform group-hover:scale-110">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
          </Link>
        )}
      </div>

      {/* Nav Items */}
      <nav
        className={cn(
          "flex-1 py-6 space-y-1.5",
          isVisuallyExpanded ? "px-4" : "px-2"
        )}
      >
        {isVisuallyExpanded && (
          <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] px-4 mb-4 whitespace-nowrap">
            Administration
          </div>
        )}

        {MENU_ITEMS.filter(
          (item) => userRank >= (ROLE_RANKS[item.requiredClearance] || 1)
        ).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!isVisuallyExpanded ? item.title : undefined}
              className={cn(
                "flex items-center rounded-xl transition-all group font-sans text-sm font-medium relative overflow-hidden",
                isVisuallyExpanded
                  ? "justify-between px-4 py-3"
                  : "justify-center p-3",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center",
                  isVisuallyExpanded ? "gap-3" : ""
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {isVisuallyExpanded && (
                  <span className="opacity-100 transition-opacity duration-300 whitespace-nowrap">
                    {item.title}
                  </span>
                )}
              </div>
              {isVisuallyExpanded && item.badge && (
                <span className="text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shadow-lg shadow-primary/20 whitespace-nowrap">
                  {item.badge}
                </span>
              )}
              {!isVisuallyExpanded && item.badge && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Card */}
      <div className={cn("mt-auto", isVisuallyExpanded ? "p-4" : "p-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full text-left outline-none mb-4 group/user">
              {isVisuallyExpanded ? (
                <div className="bg-secondary/20 rounded-2xl p-4 border border-border/10 hover:bg-secondary/30 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 overflow-hidden shrink-0 transition-transform group-hover/user:scale-105">
                    {session?.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || ""}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black truncate text-foreground/90">
                      {session?.user.name}
                    </span>
                    <span className="text-[9px] text-primary font-black uppercase tracking-widest opacity-80">
                      System Admin
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center pb-4 cursor-pointer">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 overflow-hidden transition-all group-hover/user:scale-110",
                      isHovering && "scale-110"
                    )}
                  >
                    {session?.user.image ? (
                      <Image
                        src={session.user.image}
                        alt="User"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={16}
            className="w-56"
          >
            <DropdownMenuLabel className="font-sans">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-black">{session?.user.name}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                  System Administrator
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => authClient.signOut()}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className={cn(
            "flex items-center border-t border-border/10 pt-4 mt-2",
            isVisuallyExpanded ? "justify-between px-4" : "justify-center"
          )}
        >
          {isVisuallyExpanded && (
            <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
              v0.1-α
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all outline-none flex items-center justify-center"
                title="Sidebar settings"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isVisuallyExpanded ? "end" : "center"}
              side="right"
              sideOffset={16}
              className="w-48"
            >
              <DropdownMenuLabel>Sidebar control</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => changeMode("expanded")}
                className="flex items-center justify-between"
              >
                Expanded
                {mode === "expanded" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeMode("collapsed")}
                className="flex items-center justify-between"
              >
                Collapsed
                {mode === "collapsed" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeMode("hover")}
                className="flex items-center justify-between"
              >
                Expand on hover
                {mode === "hover" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
