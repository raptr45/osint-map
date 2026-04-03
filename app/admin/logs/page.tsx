"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Clock,
  Cpu,
  Database,
  Download,
  Network,
  RefreshCcw,
  Search,
  Pause,
  Play,
  Copy,
  CheckCircle2
} from "lucide-react";

import * as React from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface SystemLog {
  id: string;
  level: "info" | "warn" | "error";
  module: string;
  message: string;
  createdAt: string;
}

interface Telemetry {
  cpuLoad: string;
  memUsage: string;
  activeNodes: string;
}

interface LogsResponse {
  logs: SystemLog[];
  telemetry: Telemetry;
}

export default function SystemLogsPage() {
  const qc = useQueryClient();
  
  const [search, setSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("ALL");
  const [isPaused, setIsPaused] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const { data: response, isLoading } = useQuery<LogsResponse>({
    queryKey: ["admin-logs"],
    queryFn:  () => fetch("/api/admin/logs").then((r) => r.json()),
    refetchInterval: isPaused ? false : 5_000,
  });

  const filteredLogs = React.useMemo(() => {
    let filtered = [...(response?.logs || [])];
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(l => 
        l.message.toLowerCase().includes(s) || 
        l.id.toLowerCase().includes(s)
      );
    }
    
    if (moduleFilter !== "ALL") {
      filtered = filtered.filter(l => l.module === moduleFilter);
    }
    
    return filtered;
  }, [response?.logs, search, moduleFilter]);
  
  const telemetry = response?.telemetry;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error": return "red";
      case "warn": return "amber";
      case "info": return "emerald";
      default: return "blue";
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[60vh] opacity-50">
        <Network className="w-10 h-10 animate-pulse text-primary" />
        <p className="text-xs font-bold uppercase tracking-wide">Loading logs...</p>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-700 font-sans max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/5">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight font-display text-white">
            System Logs
          </h1>
          <p className="text-muted-foreground/60 text-sm font-medium tracking-wide uppercase">
            LIVE SYSTEM EVENTS AND AUDIT TRAIL telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/admin/logs?mode=export", "_blank")}
            className="tactical-btn-outline h-11 px-6"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["admin-logs"] });
              if (isPaused) setIsPaused(false);
            }}
            className="tactical-btn h-11 px-6 shadow-2xl shadow-primary/20"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "CPU Load", value: telemetry?.cpuLoad || "..." , icon: Cpu, color: "text-emerald-500" },
          { label: "Server Memory", value: telemetry?.memUsage || "...", icon: Database, color: "text-blue-500" },
          { label: "Active Pipelines", value: telemetry?.activeNodes || "...", icon: Network, color: "text-primary" },
        ].map((stat, i) => (
          <div key={i} className="tactical-card group p-7 cursor-default">
            <div className="premium-glow" />
            <div className="flex items-center gap-6 relative z-10">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-2xl transition-transform duration-500 group-hover:scale-110",
                stat.color.replace('text-', 'bg-').replace('500', '500/10'),
                stat.color.replace('text-', 'border-').replace('500', '500/20'),
                stat.color
              )}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] leading-none">
                  {stat.label}
                </p>
                <p className="text-2xl font-black font-display text-white group-hover:text-primary transition-colors tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="tactical-card group rounded-[2.5rem] flex flex-col min-h-[60vh] overflow-hidden">
        <div className="premium-glow" />
        <div className="p-8 border-b border-white/5 bg-primary/5 flex flex-col md:flex-row gap-6 justify-between items-center relative z-10">
          <div className="relative flex-1 max-w-md group/input">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-30 group-hover/input:text-primary group-hover/input:opacity-100 transition-all duration-300" />
            <input
              placeholder="Search stream by message or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="tactical-input pl-12 h-14 bg-white/5 border-white/5 group-hover/input:bg-white/10 group-hover/input:border-white/10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hidden sm:flex items-center mr-3">
              Filter Origin
            </span>
            {(["ALL", "INGEST", "AI", "AUTH", "SYSTEM"] as const).map(mod => (
              <button
                key={mod}
                onClick={() => setModuleFilter(mod)}
                className={cn(
                  "px-4 py-2 rounded-2xl text-[10px] flex items-center gap-2 font-black uppercase tracking-widest transition-all border",
                  moduleFilter === mod
                    ? "bg-primary text-primary-foreground border-transparent shadow-xl"
                    : "bg-white/5 border-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                )}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] bg-white/2">
                <th className="px-8 py-5">Severity</th>
                <th className="px-8 py-5">ID</th>
                <th className="px-8 py-5">Module</th>
                <th className="px-8 py-5">Message</th>
                <th className="px-8 py-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/2">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-primary/5 transition-all group font-sans border-l-4 border-transparent hover:border-primary duration-500"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0 border-2 border-background shadow-2xl",
                          log.level === 'error' ? 'bg-red-500 shadow-red-500/40' : 
                          log.level === 'warn' ? 'bg-amber-500 shadow-amber-500/40' : 'bg-emerald-500 shadow-emerald-500/40'
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          `text-${getLevelColor(log.level)}-500`
                        )}
                      >
                        {log.level}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => handleCopy(log.id, log.id)}
                      className="text-xs font-mono text-muted-foreground/60 hover:text-primary transition-all flex items-center gap-3 group/copy"
                    >
                      <span className="font-mono">#{log.id.substring(0, 8)}</span>
                      {copiedId === log.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover/copy:text-primary transition-all" />}
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <Badge
                      variant="secondary"
                      className="tactical-badge bg-white/5 border-white/5 px-4 py-1.5 rounded-xl text-[10px] font-black text-white/50 group-hover:text-primary group-hover:border-primary/20 transition-all uppercase tracking-widest"
                    >
                      {log.module}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-muted-foreground group-hover:text-white transition-all cursor-pointer decoration-primary decoration-2 underline-offset-4 group-hover:underline" onClick={() => handleCopy(log.message, log.id)}>
                    <div className="flex items-center gap-3">
                       <span className="line-clamp-1">{log.message}</span>
                       {copiedId === log.id && <span className="text-[9px] font-black uppercase text-emerald-500 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full">Copied To Clipboard</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right tabular-nums">
                    <div className="flex items-center justify-end gap-3 text-[11px] font-black text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors uppercase">
                      <Clock className="w-3.5 h-3.5 opacity-40 group-hover:text-primary" /> {formatDistanceToNow(new Date(log.createdAt))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-20 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-20 relative z-10">Waiting for system telemetry...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-8 bg-primary/5 border-t border-white/5 flex items-center justify-between relative z-10">
          <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">
            SYSTEM CLOCK SYNCED: {new Date().toISOString().split('T')[1].split('.')[0]} UTC
          </span>
          <div className="flex items-center gap-8">
            <button
               onClick={() => setIsPaused(!isPaused)}
               className="text-[11px] font-black uppercase tracking-widest flex items-center gap-3 text-muted-foreground hover:text-white transition-all group/btn"
            >
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", isPaused ? "bg-amber-500/10 text-amber-500" : "bg-white/5")}>
                 {isPaused ? <Play className="w-4 h-4 animate-pulse" /> : <Pause className="w-4 h-4 group-hover/btn:scale-110" />}
              </div>
              {isPaused ? "RESUME STREAM" : "PAUSE STREAM"}
            </button>
            
            <div className="flex items-center gap-3 px-6 py-3 rounded-[1.5rem] bg-white/5 border border-white/5 shadow-2xl">
               <div className={cn("w-2.5 h-2.5 rounded-full border-2 border-background", isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]")} />
               <span className={cn("text-[11px] font-black uppercase tracking-widest", isPaused ? "text-amber-500" : "text-emerald-500")}>
                  {isPaused ? "STANDBY" : "LIVE FEED"}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
