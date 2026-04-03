import { UserProfile } from "@/components/auth/user-profile";
import { HeaderFilters } from "@/components/header-filters";
import { MapView } from "@/components/map/map-view";
import { Button } from "@/components/ui/button";
import { getServerSession, hasClearance } from "@/lib/admin-check";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default async function Home() {
  const canAccessTerminal = await hasClearance("analyst");
  const session = await getServerSession();

  return (
    <div className="relative h-screen flex flex-col font-sans bg-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.05),transparent_50%)] pointer-events-none" />

      <header className="sticky top-0 w-full h-16 flex justify-between items-center px-8 z-50 bg-background/50 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-all group-hover:rotate-6 group-hover:scale-110 shadow-lg shadow-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-primary-foreground"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </div>
            <div className="flex flex-col h-full justify-center">
              <span className="font-bold text-lg tracking-tight hidden sm:block uppercase text-foreground font-display leading-none">
                OSINT MAP
              </span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest leading-none mt-1 opacity-60 hidden sm:block">
                Tactical Node
              </span>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-border/40 hidden md:block" />

          <Suspense
            fallback={
              <div className="w-64 h-8 bg-secondary/20 animate-pulse rounded-full" />
            }
          >
            <HeaderFilters />
          </Suspense>
        </div>

        <div className="flex items-center gap-6">
          {/* <div className="hidden lg:flex items-center bg-secondary/30 rounded-full pl-3 pr-4 py-1.5 border border-border/40 text-[10px] font-bold text-muted-foreground transition-all hover:bg-secondary/50">
             <div className="relative flex h-2 w-2 mr-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="font-display uppercase tracking-wide">Operational Status: Nominal</span>
          </div> */}

          <div className="flex items-center gap-2">
            {canAccessTerminal && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden md:flex gap-2 rounded-full h-10 px-4 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20"
              >
                <Link href="/admin">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Terminal
                </Link>
              </Button>
            )}

            <div className="h-8 w-[1px] bg-border/40 mx-1" />
            <UserProfile />
          </div>
        </div>
      </header>

      <main className="flex-1 relative p-4">
        {/* Pass the actual session role for granular permission control on the map */}
        <MapView role={session?.user?.role || "user"} />
      </main>
    </div>
  );
}
