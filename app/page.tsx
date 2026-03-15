import { UserProfile } from "@/components/auth/user-profile";
import { MapView } from "@/components/map/map-view";
import { isAdmin } from "@/lib/admin-check";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const admin = await isAdmin();

  return (
    <div className="relative h-screen flex flex-col font-sans bg-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.05),transparent_50%)] pointer-events-none" />
      
      <header className="sticky top-0 w-full p-4 flex justify-between items-center z-50 bg-background/50 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2 group cursor-pointer">
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
          <span className="font-bold text-xl tracking-tight hidden sm:block">OSINT MAP</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center bg-secondary/30 rounded-full px-4 py-1.5 border border-border/50 text-xs font-medium text-muted-foreground mr-2">
             <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Real-time Global Sync
          </div>
          
          {admin && (
            <Button asChild variant="secondary" size="sm" className="hidden md:flex gap-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all">
              <Link href="/admin/queue">
                <ShieldCheck className="w-4 h-4" />
                Moderation
              </Link>
            </Button>
          )}

          <UserProfile />
        </div>
      </header>

      <main className="flex-1 relative p-4">
        <MapView />
      </main>
    </div>
  );
}
