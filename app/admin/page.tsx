"use client";

import * as React from "react";

import { 
  Users, 
  Map as MapIcon, 
  Activity, 
  TrendingUp, 
  ShieldAlert,
  Clock,
  ExternalLink,
  LucideIcon,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { useAdminStats } from "@/lib/queries/events";
import type { AdminActivity } from "@/lib/schemas";

interface EnrichedStat {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  color: string;
}

export default function AdminOverview() {
  const { data, isLoading } = useAdminStats();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const stats: EnrichedStat[] = data ? data.stats.map((s) => ({
    ...s,
    icon: (s.label === "Total Events" ? MapIcon
          : s.label === "Active Nodes" ? Activity
          : s.label === "Pending Review" ? ShieldAlert
          : Users) as LucideIcon,
    color: s.label === "Total Events" ? "text-blue-500"
         : s.label === "Active Nodes" ? "text-emerald-500"
         : s.label === "Pending Review" ? "text-amber-500"
         : "text-purple-500",
  })) : [];

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[60vh] opacity-50">
        <Activity className="w-10 h-10 animate-pulse text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 md:p-10 space-y-8 sm:space-y-12 animate-in fade-in duration-700 font-sans max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/5">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-display text-white italic">
            Overview
          </h1>
          <p className="text-muted-foreground/60 text-[10px] sm:text-sm font-medium tracking-widest uppercase">
            SYSTEM PERFORMANCE AND PIPELINE THROUGHPUT
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-secondary/20 border border-white/5 backdrop-blur-xl flex items-center gap-2 sm:gap-3 shadow-xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
             <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Network Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat: EnrichedStat) => (
          <div key={stat.label} className="tactical-card group p-5 sm:p-7 cursor-default">
            <div className="premium-glow" />
            <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
              <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-2xl transition-transform duration-500 group-hover:scale-110", stat.color.replace('text-', 'bg-').replace('500', '500/10'), stat.color.replace('text-', 'border-').replace('500', '500/20'), stat.color)}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {stat.trend}
                </span>
                <div className="w-10 sm:w-12 h-0.5 sm:h-1 bg-emerald-500/10 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-2/3" />
                </div>
              </div>
            </div>
            <div className="space-y-1 relative z-10">
              <h3 className="text-[9px] sm:text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] leading-none">{stat.label}</h3>
              <p className="text-2xl sm:text-3xl font-bold tracking-tighter font-display text-white group-hover:text-primary transition-colors">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="tactical-card group lg:col-span-2 p-6 sm:p-10 flex flex-col justify-between min-h-[350px] sm:min-h-[480px]">
          <div className="premium-glow" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 relative z-10 gap-4">
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-3 italic">
                Ingestion Flow
              </h3>
              <p className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Messages processed per hour</p>
            </div>
            <Button asChild variant="outline" size="sm" className="tactical-btn-outline h-10 sm:h-11 px-4 sm:px-6 w-fit">
               <Link href="/admin/logs" className="flex items-center gap-3">
                System Logs <ExternalLink className="w-3.5 h-3.5 opacity-40" />
               </Link>
            </Button>
          </div>
          
          <div className="h-[180px] sm:h-[250px] flex items-end gap-1.5 sm:gap-2 px-1 relative py-4">
             {(!data?.chartData || data.chartData.length === 0) ? (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest">
                   No data yet
                </div>
             ) : (
               data.chartData.map((h: number, i: number) => (
                 <div key={i} className="flex-1 space-y-1.5 sm:space-y-2 group cursor-pointer relative z-10 bottom-0 flex flex-col justify-end h-full">
                    <div className="relative flex items-end flex-1 w-full justify-center">
                      <div 
                        className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-all outline outline-1 outline-primary/5" 
                        style={{ height: `${Math.max(5, h)}%` }}
                      />
                      <div className="absolute flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur-xl rounded-md text-[9px] font-black text-primary -top-8 h-7 px-2 border border-primary/20 shadow-xl tracking-widest z-20">
                        {Math.floor(h * 1.5)}
                      </div>
                    </div>
                    <div className="h-0.5 sm:h-1 bg-border/20 rounded-full w-full" />
                 </div>
               ))
             )}
          </div>
          <div className="flex justify-between mt-4 px-1 border-t border-border/10 pt-4">
            {["08:00", "12:00", "16:00", "20:00", "00:00", "04:00"].map((t, idx) => (
              <span key={t} className={cn(
                "text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40",
                (idx % 2 !== 0 && "hidden sm:inline")
              )}>{t}</span>
            ))}
          </div>
        </div>

        <div className="tactical-card group p-6 sm:p-10 flex flex-col justify-between min-h-[400px] sm:min-h-[480px]">
           <div className="premium-glow" />
           <div className="space-y-6 sm:space-y-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white italic">Live Stream</h3>
                <p className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Latest ingestion activity</p>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {(data?.activity || []).slice(0, isMobile ? 4 : 5).map((act: AdminActivity, i: number) => (
                  <div key={i} className="flex gap-4 sm:gap-5 group/item cursor-pointer" onClick={() => window.location.href = `/admin/queue`}>
                    <div className="relative flex flex-col items-center">
                      <div className={cn(
                        "w-2.5 h-2.5 sm:w-3 h-3 rounded-full z-10 transition-all duration-500 group-hover/item:scale-150 border-2 border-background shadow-2xl",
                        act.status === 'success' ? 'bg-emerald-500 shadow-emerald-500/40' : 
                        act.status === 'warning' ? 'bg-amber-500 shadow-amber-500/40' : 'bg-blue-500 shadow-blue-500/40'
                      )} />
                      {data?.activity && i !== (data.activity.length - 1) && <div className="absolute top-3 w-[1px] h-full bg-white/5 group-hover/item:bg-primary/40 transition-colors" />}
                    </div>
                    <div className="flex-1 pb-4 sm:pb-6 min-w-0">
                      <div className="flex items-center justify-between mb-1 opacity-40 group-hover/item:opacity-100 transition-opacity">
                        <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{act.type}</span>
                        <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase font-mono">
                          <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(act.time))}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-[12px] font-bold tracking-wide text-muted-foreground group-hover/item:text-white transition-colors cursor-pointer truncate leading-relaxed decoration-primary decoration-2 underline-offset-4 group-hover/item:underline">{act.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(!data?.activity || data.activity.length === 0) && (
                 <div className="py-20 flex items-center justify-center text-[10px] uppercase font-black tracking-widest text-muted-foreground/30 text-center">
                    No recent activity
                 </div>
              )}
           </div>
           <Button asChild variant="outline" className="tactical-btn-outline w-full h-12 sm:h-14 relative z-10 group/btn mt-4">
             <Link href="/admin/queue" className="flex items-center gap-3">
                <span className="text-[10px] sm:text-xs">Review Moderation Queue</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
             </Link>
           </Button>
        </div>
      </div>
    </div>

  );
}
