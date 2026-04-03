"use client";

import { 
  Users, 
  Map as MapIcon, 
  Activity, 
  TrendingUp, 
  ShieldAlert,
  Clock,
  ExternalLink,
  LucideIcon
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
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">System activity and pipeline throughput.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat: EnrichedStat) => (
          <div key={stat.label} className="tactical-card p-6 cursor-default group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl bg-background/50 border border-border/40 shadow-inner", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</h3>
              <p className="text-2xl font-bold tracking-tight font-display">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="tactical-card lg:col-span-2 p-6 flex flex-col justify-between min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight">Ingestion Activity</h3>
              <p className="text-xs text-muted-foreground">Messages processed per hour across pipelines.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="tactical-btn h-8 px-4 bg-background/40">
               <Link href="/admin/logs">
                Logs <ExternalLink className="w-3.5 h-3.5" />
               </Link>
            </Button>
          </div>
          
          <div className="h-[250px] flex items-end gap-2 px-2 relative py-4">
             {(!data?.chartData || data.chartData.length === 0) ? (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest">
                   No data yet
                </div>
             ) : (
               data.chartData.map((h: number, i: number) => (
                 <div key={i} className="flex-1 space-y-2 group cursor-pointer relative z-10 bottom-0 flex flex-col justify-end h-full">
                    <div className="relative flex items-end flex-1 w-full justify-center">
                      <div 
                        className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-all outline outline-1 outline-primary/5" 
                        style={{ height: `${Math.max(5, h)}%` }}
                      />
                      <div className="absolute flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur-xl rounded-md text-[10px] font-black text-primary -top-10 h-8 px-2 border border-primary/20 shadow-xl tracking-widest z-20">
                        {Math.floor(h * 1.5)}
                      </div>
                    </div>
                    <div className="h-1 bg-border/20 rounded-full w-full" />
                 </div>
               ))
             )}
          </div>
          <div className="flex justify-between mt-4 px-1 border-t border-border/10 pt-4">
            {["08:00", "12:00", "16:00", "20:00", "00:00", "04:00"].map(t => (
              <span key={t} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{t}</span>
            ))}
          </div>
        </div>

        <div className="tactical-card p-6 flex flex-col justify-between min-h-[400px]">
           <div className="space-y-6">
              {(data?.activity || []).map((act: AdminActivity, i: number) => (
                <div key={i} className="flex gap-4 group cursor-pointer" onClick={() => window.location.href = `/admin/queue`}>
                  <div className="relative flex flex-col items-center">
                    <div className={cn("w-2.5 h-2.5 rounded-full z-10 transition-transform group-hover:scale-125", `bg-${act.status}-500 shadow-[0_0_8px_rgba(var(--${act.status}-500),0.8)]`)} />
                    {data?.activity && i !== (data.activity.length - 1) && <div className="absolute top-2.5 w-[1px] h-full bg-border/20 group-hover:bg-primary/20 transition-colors" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{act.type}</span>
                      <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 opacity-60">
                        <Clock className="w-2.5 h-2.5" /> {formatDistanceToNow(new Date(act.time))} ago
                      </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wide group-hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-relaxed">{act.label}</p>
                  </div>
                </div>
              ))}
              {(!data?.activity || data.activity.length === 0) && (
                 <div className="py-20 flex items-center justify-center text-[10px] uppercase font-black tracking-widest text-muted-foreground/30 text-center">
                    No recent activity
                 </div>
              )}
           </div>
           <Button asChild variant="ghost" className="tactical-btn w-full mt-4 text-xs font-semibold uppercase tracking-wide h-10 hover:bg-secondary">
             <Link href="/admin/queue">
                View Queue
             </Link>
           </Button>
        </div>
      </div>
    </div>
  );
}
