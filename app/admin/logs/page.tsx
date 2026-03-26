"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Clock,
  Cpu,
  Database,
  Download,
  Filter,
  Network,
  RefreshCcw,
  Search,
} from "lucide-react";

import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";

const fetcher = (url: string) => fetch(url).then(res => res.json());

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
  const { data: response, mutate, isLoading } = useSWR<LogsResponse>("/api/admin/logs", fetcher, {
    refreshInterval: 5000
  });

  const data = response?.logs || [];
  const telemetry = response?.telemetry;

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
        <p className="text-xs font-bold uppercase tracking-wide">Synchronizing Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display mb-1 uppercase">
            System Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm">
            Real-time telemetry and operational audit trails.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/admin/logs?mode=export", "_blank")}
            className="h-10 rounded-xl gap-2 text-xs font-semibold uppercase tracking-wide bg-card/20 border-border/40"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => mutate()}
            className="h-10 rounded-xl gap-2 text-xs font-semibold uppercase tracking-wide shadow-xl shadow-primary/20"
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
          {
            label: "Active Nodes",
            value: telemetry?.activeNodes || "...",
            icon: Network,
            color: "purple",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="p-4 bg-card/30 backdrop-blur-xl border-border/40 flex items-center gap-4"
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
          </Card>
        ))}
      </div>

      <Card className="bg-card/30 backdrop-blur-xl border-border/40 overflow-hidden rounded-2xl flex flex-col">
        <div className="p-4 border-b border-border/40 bg-secondary/20 flex flex-col md:flex-row gap-4 justify-between h-20 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
            <input
              placeholder="Search logs (e.g. INGEST, ERROR)..."
              className="w-full bg-background/50 border border-border/40 rounded-xl pl-10 pr-4 h-11 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-11 px-4 gap-2 text-xs font-semibold uppercase tracking-wide hover:bg-secondary"
            >
              <Filter className="w-3.5 h-3.5" /> Filter Modules
            </Button>
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
              {Array.isArray(data) && data.map((log) => (
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
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground opacity-60">
                    #{log.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="secondary"
                      className="text-xs font-bold tracking-wider opacity-80 rounded-md py-0"
                    >
                      {log.module}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground/90 group-hover:text-primary transition-colors cursor-default">
                    {log.message}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums opacity-60 flex items-center justify-end gap-1.5">
                      <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(log.createdAt))} ago
                    </span>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr>
                   <td colSpan={5} className="py-20 text-center text-muted-foreground italic text-xs uppercase tracking-wide opacity-40">No terminal logs recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-secondary/10 border-t border-border/20 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground opacity-50 uppercase tracking-wide">
            Live Stream Enabled
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">
              Active
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
