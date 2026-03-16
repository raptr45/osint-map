"use client";

import { Card } from "@/components/ui/card";
import { 
  Users, 
  Map as MapIcon, 
  Activity, 
  TrendingUp, 
  ShieldAlert,
  Clock,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Total Events", value: "1,284", icon: MapIcon, color: "text-blue-500", trend: "+12%" },
  { label: "Active Nodes", value: "48", icon: Activity, color: "text-emerald-500", trend: "+3" },
  { label: "Pending Review", value: "15", icon: ShieldAlert, color: "text-amber-500", trend: "High Priority" },
  { label: "Verified Users", value: "892", icon: Users, color: "text-purple-500", trend: "+24" },
];

export default function AdminOverview() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display mb-1 uppercase">Command Overview</h1>
        <p className="text-muted-foreground text-sm">System performance and intelligence throughput.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <Card key={stat.label} className="p-6 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all cursor-default">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-background/50 border border-border/40", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</h3>
              <p className="text-2xl font-bold tracking-tight font-display">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-6 bg-card/40 backdrop-blur-xl border-border/40 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold font-display uppercase tracking-tight">Intelligence Ingestion</h3>
              <p className="text-xs text-muted-foreground">Messages processed per hour across all channels.</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold uppercase tracking-wider gap-2">
               Full Report <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="h-[250px] flex items-end gap-2 px-2">
             {[40, 65, 45, 90, 85, 60, 75, 50, 40, 80, 95, 70].map((h, i) => (
               <div key={i} className="flex-1 space-y-2 group cursor-pointer">
                  <div className="relative h-full flex items-end">
                    <div 
                      className="w-full bg-primary/20 hover:bg-primary/40 rounded-t transition-all" 
                      style={{ height: `${h}%` }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded text-[9px] font-bold text-primary -top-8 h-8 border border-border/20 shadow-xl">
                      {Math.floor(h * 1.5)} pts
                    </div>
                  </div>
                  <div className="h-1 bg-border/20 rounded-full" />
               </div>
             ))}
          </div>
          <div className="flex justify-between mt-4 px-1">
            {["08:00", "12:00", "16:00", "20:00", "00:00", "04:00"].map(t => (
              <span key={t} className="text-[9px] font-bold text-muted-foreground uppercase">{t}</span>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-card/40 backdrop-blur-xl border-border/40">
           <h3 className="text-lg font-bold font-display uppercase tracking-tight mb-6">Recent Activity</h3>
           <div className="space-y-6">
              {[
                { type: "INGEST", label: "Telegram Message Scraped", time: "2m ago", status: "emerald" },
                { type: "AI", label: "Coordinates Extracted", time: "5m ago", status: "blue" },
                { type: "AUTH", label: "New Admin Role Request", time: "12m ago", status: "amber" },
                { type: "EVENT", label: "Kharkiv Strike Published", time: "45m ago", status: "emerald" },
                { type: "AI", label: "Gemini Quota Warning", time: "1h ago", status: "red" },
              ].map((act, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="relative flex flex-col items-center">
                    <div className={cn("w-2.5 h-2.5 rounded-full z-10", `bg-${act.status}-500 shadow-[0_0_8px_rgba(var(--${act.status}-500),0.5)]`)} />
                    {i !== 4 && <div className="absolute top-2.5 w-[1px] h-full bg-border/20" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{act.type}</span>
                      <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {act.time}
                      </span>
                    </div>
                    <p className="text-xs font-medium group-hover:text-primary transition-colors cursor-default">{act.label}</p>
                  </div>
                </div>
              ))}
           </div>
           <Button variant="ghost" className="w-full mt-4 text-[11px] font-bold uppercase tracking-widest h-10 hover:bg-secondary">
             View Audit Log
           </Button>
        </Card>
      </div>
    </div>
  );
}
