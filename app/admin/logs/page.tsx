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
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display mb-1">
            System Logs
          </h1>
          <p className="text-muted-foreground text-sm">
            Live system events and audit trail.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/admin/logs?mode=export", "_blank")}
            className="tactical-btn h-10 px-4 bg-card/20 border-border/40 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["admin-logs"] });
              if (isPaused) setIsPaused(false);
            }}
            className="tactical-btn px-4"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "CPU Load", value: telemetry?.cpuLoad || "..." , icon: Cpu, color: "emerald" },
          {
            label: "Server Memory",
            value: telemetry?.memUsage || "...",
            icon: Database,
            color: "blue",
          },
          { label: "Active Sources",
            value: telemetry?.activeNodes || "...",
            icon: Network,
            color: "purple",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="tactical-card p-4 flex items-center gap-4 cursor-default group"
          >
            <div
              className={cn(
                "p-2.5 rounded-xl bg-secondary/50",
                `text-${stat.color}-500`
              )}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-display">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="tactical-card rounded-2xl flex flex-col min-h-[60vh]">
        <div className="p-4 border-b border-border/40 bg-secondary/20 flex flex-col md:flex-row gap-4 justify-between min-h-[80px] items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
            <input
              placeholder="Search by message or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="tactical-input pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 hidden sm:flex items-center mr-2">
              Filter by module
            </span>
            {(["ALL", "INGEST", "AI", "AUTH", "SYSTEM"] as const).map(mod => (
              <button
                key={mod}
                onClick={() => setModuleFilter(mod)}
                className={cn(
                  "px-2 py-1 rounded-md text-[8px] flex items-center gap-1 font-black uppercase tracking-widest transition-all border",
                  moduleFilter === mod
                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                    : "border-transparent text-muted-foreground/80 hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/20 text-xs font-semibold text-muted-foreground uppercase bg-secondary/10">
                <th className="px-6 py-4 tracking-wide">Severity</th>
                <th className="px-6 py-4 tracking-wide">ID</th>
                <th className="px-6 py-4 tracking-wide">Module</th>
                <th className="px-6 py-4 tracking-wide">Message</th>
                <th className="px-6 py-4 tracking-wide text-right">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-primary/5 transition-colors group font-sans"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          `bg-${getLevelColor(log.level)}-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]`
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs font-bold uppercase tracking-tighter",
                          `text-${getLevelColor(log.level)}-500/80`
                        )}
                      >
                        {log.level}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleCopy(log.id, log.id)}
                      className="text-xs font-mono text-muted-foreground opacity-60 hover:text-primary hover:opacity-100 transition-colors flex items-center gap-1.5 focus:outline-none"
                    >
                      #{log.id.substring(0, 8)}
                      {copiedId === log.id ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="secondary"
                      className="tactical-badge border-border/30 px-1.5 py-0.5 rounded-md text-[9px] text-muted-foreground/90"
                    >
                      {log.module}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground/90 group-hover:text-primary transition-colors cursor-pointer" onClick={() => handleCopy(log.message, log.id)}>
                    <div className="flex items-center gap-2">
                       <span className="line-clamp-2">{log.message}</span>
                       {copiedId === log.id && <span className="text-[8px] font-black uppercase text-emerald-500 shrink-0 border border-emerald-500/20 bg-emerald-500/10 px-1 rounded">Copied</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] font-black text-muted-foreground/80 tabular-nums flex items-center justify-end gap-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground/40" /> {formatDistanceToNow(new Date(log.createdAt))} ago
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-20 text-center text-muted-foreground italic text-xs uppercase tracking-wide opacity-40">No logs found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-secondary/10 border-t border-border/20 flex items-center justify-between">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">
            {isPaused ? "Updates paused" : "Live updates"}
          </span>
          <div className="flex items-center gap-4">
            <button
               onClick={() => setIsPaused(!isPaused)}
               className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
            >
              {isPaused ? <Play className="w-3 h-3 group-hover:text-amber-500" /> : <Pause className="w-3 h-3 group-hover:text-emerald-500" />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            {!isPaused && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  Live
                </span>
              </div>
            )}
            {isPaused && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  Paused
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
