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

const MOCK_LOGS = [
  {
    id: "LOG-8821",
    level: "INFO",
    module: "INGEST",
    message: "Successfully polled Telegram channel @liveuamap",
    time: "Just now",
    icon: "emerald",
  },
  {
    id: "LOG-8820",
    level: "INFO",
    module: "AI",
    message: "Gemini 1.5 Flash: Successfully parsed instruction 0xfa21",
    time: "2m ago",
    icon: "blue",
  },
  {
    id: "LOG-8819",
    level: "WARN",
    module: "INGEST",
    message: "Rate limit threshold reached for worker node delta-4",
    time: "5m ago",
    icon: "amber",
  },
  {
    id: "LOG-8818",
    level: "INFO",
    module: "AUTH",
    message: "User admin@osint.map granted Level 2 clearance",
    time: "12m ago",
    icon: "emerald",
  },
  {
    id: "LOG-8817",
    level: "ERROR",
    module: "DB",
    message: "PostGIS geometry casting failed for trace #9982",
    time: "18m ago",
    icon: "red",
  },
  {
    id: "LOG-8816",
    level: "INFO",
    module: "SYSTEM",
    message: "Vercel deployment build ddca54d completed",
    time: "25m ago",
    icon: "blue",
  },
  {
    id: "LOG-8815",
    level: "INFO",
    module: "INGEST",
    message: "Channel @DeepStateUA priming completed (2 msgs)",
    time: "44m ago",
    icon: "emerald",
  },
];

export default function SystemLogsPage() {
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
            className="h-10 rounded-xl gap-2 text-xs font-bold uppercase tracking-widest bg-card/20 border-border/40"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-10 rounded-xl gap-2 text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/20"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "CPU Load", value: "24%", icon: Cpu, color: "emerald" },
          {
            label: "DB Uptime",
            value: "99.98%",
            icon: Database,
            color: "blue",
          },
          {
            label: "Active Nodes",
            value: "12/12",
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
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
              className="h-11 px-4 gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary"
            >
              <Filter className="w-3.5 h-3.5" /> Filter Modules
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/20 text-[10px] font-bold text-muted-foreground uppercase bg-secondary/10">
                <th className="px-6 py-4 tracking-widest">Severity</th>
                <th className="px-6 py-4 tracking-widest">ID</th>
                <th className="px-6 py-4 tracking-widest">Module</th>
                <th className="px-6 py-4 tracking-widest">Message</th>
                <th className="px-6 py-4 tracking-widest text-right">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {MOCK_LOGS.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-primary/5 transition-colors group font-sans"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          `bg-${log.icon}-500 shadow-[0_0_8px_rgba(var(--${log.icon}-500),0.4)]`
                        )}
                      />
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-tighter",
                          `text-${log.icon}-500/80`
                        )}
                      >
                        {log.level}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-mono text-muted-foreground opacity-60">
                    #{log.id}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="secondary"
                      className="text-[9px] font-bold tracking-wider opacity-80 rounded-md py-0"
                    >
                      {log.module}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground/90 group-hover:text-primary transition-colors cursor-default">
                    {log.message}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums opacity-60 flex items-center justify-end gap-1.5">
                      <Clock className="w-3 h-3" /> {log.time}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-secondary/10 border-t border-border/20 flex items-center justify-between">
          <span className="text-[9px] font-bold text-muted-foreground opacity-50 uppercase tracking-[0.2em]">
            Live Stream Enabled
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
              Active
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
