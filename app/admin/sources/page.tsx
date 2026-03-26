"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Database, Plus, Trash2, Globe, Loader2, Signal,
  Radio, ArrowRight, ExternalLink, Twitter, Power,
  Activity, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Source {
  id: string;
  type: "telegram" | "rss" | "x" | "custom";
  value: string;
  name: string | null;
  isActive: boolean;
  lastFetchedAt: string | null;
  createdAt: string;
  signalsLast24h: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SOURCE_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  telegram: { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",    glow: "bg-blue-500/30" },
  x:        { bg: "bg-slate-500/10",  border: "border-slate-500/20",  text: "text-slate-300",   glow: "bg-slate-500/20" },
  rss:      { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400",  glow: "bg-orange-500/30" },
  custom:   { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400",  glow: "bg-purple-500/30" },
};

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: Signal,
  x: Twitter,
  rss: Radio,
  custom: Globe,
};

const SOURCE_LINK: Record<string, (value: string) => string> = {
  telegram: (v) => `https://t.me/${v}`,
  x:        (v) => `https://x.com/${v}`,
  rss:      (v) => v,
  custom:   (v) => v,
};

export default function SourcesPage() {
  const { data: sources, mutate, isLoading } = useSWR<Source[]>("/api/admin/sources", fetcher);
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<Source["type"]>("telegram");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    setIsAdding(true);
    try {
      await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, value: newValue, name: newValue }),
      });
      setNewValue("");
      mutate();
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/sources?id=${id}`, { method: "DELETE" });
      mutate();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setTogglingId(id);
    try {
      await fetch("/api/admin/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      mutate();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display mb-1 flex items-center gap-3">
          <Radio className="w-8 h-8 text-primary shadow-[0_0_24px_rgba(var(--primary),0.5)] bg-primary/20 p-1.5 rounded-lg border border-primary/30" />
          Active Signal Relays
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-wide font-medium">
          Manage MTProto extraction nodes &amp; OSINT pipelines
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Source List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-32 opacity-50 gap-6">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-xs uppercase tracking-wide font-bold text-primary animate-pulse">Synchronizing Topology...</span>
            </div>
          ) : !sources?.length ? (
            <Card className="p-20 text-center bg-card/20 backdrop-blur-xl border-dashed border-2 border-border/40 rounded-3xl">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                <Database className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold font-display uppercase tracking-tight mb-2">No Comm Relays Online</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">Deploy a new extraction node to begin collecting signals.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sources.map((source) => {
                const styles = SOURCE_STYLES[source.type] ?? SOURCE_STYLES.custom;
                const Icon = SOURCE_ICONS[source.type] ?? Globe;
                const link = SOURCE_LINK[source.type]?.(source.value);

                return (
                  <Card
                    key={source.id}
                    className={cn(
                      "p-5 flex items-center justify-between bg-card/30 backdrop-blur-xl border-border/40 hover:bg-card/50 transition-all overflow-hidden relative",
                      source.isActive && "border-primary/20 shadow-lg shadow-primary/5",
                      !source.isActive && "opacity-60"
                    )}
                  >
                    {source.isActive && (
                      <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                    )}

                    <div className="flex items-center gap-5 relative z-10 min-w-0">
                      {/* Icon */}
                      <div className="relative shrink-0">
                        <div className={cn("p-3.5 rounded-2xl flex items-center justify-center border shadow-xl backdrop-blur-3xl", styles.bg, styles.border, styles.text)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {source.isActive && (
                          <div className={cn("absolute inset-0 blur-xl animate-pulse -z-10", styles.glow)} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg font-display tracking-tight truncate">{source.value}</span>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground/40 hover:text-primary transition-colors shrink-0"
                              title="Open source"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest", styles.text)}>
                            {source.type}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                            <Activity className="w-3 h-3" />
                            {source.signalsLast24h} signals (24h)
                          </span>
                          {source.lastFetchedAt && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(source.lastFetchedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 relative z-10 shrink-0">
                      {/* Live / Maintenance indicator */}
                      <div className="flex items-center gap-2">
                        {source.isActive ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">Live</span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500/80">Maint.</span>
                          </>
                        )}
                      </div>

                      {/* Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(source.id, source.isActive)}
                        disabled={togglingId === source.id}
                        title={source.isActive ? "Put in maintenance" : "Bring online"}
                        className={cn(
                          "h-9 w-9 p-0 rounded-xl border transition-all",
                          source.isActive
                            ? "text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20 border-transparent"
                            : "text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 border-emerald-500/20"
                        )}
                      >
                        {togglingId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source.id)}
                        disabled={deletingId === source.id}
                        className="h-9 w-9 p-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl hover:border hover:border-destructive/20 transition-all border border-transparent"
                      >
                        {deletingId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Form */}
        <div>
          <Card className="bg-card/40 backdrop-blur-xl border-border/40 sticky top-8 overflow-hidden rounded-[2rem] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="p-8 relative space-y-6">
              <h3 className="font-bold font-display uppercase tracking-wide flex items-center gap-3 text-sm text-primary">
                <Plus className="w-5 h-5 bg-primary/20 p-1 rounded border border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.4)]" />
                Deploy Extraction Node
              </h3>

              <form onSubmit={handleAdd} className="space-y-5">
                {/* Source Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-primary/60" /> Operation Protocol
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as Source["type"])}
                    className="w-full bg-background/60 border border-border/40 shadow-inner p-4 rounded-xl text-xs font-bold uppercase tracking-wide outline-none focus:ring-1 focus:ring-primary/50 transition-all font-sans text-foreground"
                  >
                    <option value="telegram">MTProto Network (Telegram)</option>
                    <option value="x">X Intelligence Feed (Twitter / X)</option>
                    <option value="rss" disabled>RSS Syndication (Dormant)</option>
                  </select>
                </div>

                {/* Handle / Username */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-primary/60" /> Target Handle
                  </label>
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={newType === "x" ? "E.G. osintdefender" : "E.G. LIVEUAMAP"}
                    required
                    className="w-full bg-background/60 border border-border/40 shadow-inner p-4 rounded-xl text-xs font-bold placeholder:text-muted-foreground/40 uppercase tracking-wide outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground/50 font-medium pl-1">
                    {newType === "telegram" && "Telegram username (without @)"}
                    {newType === "x" && "X/Twitter handle (without @) — ingestor integration required"}
                    {newType === "rss" && "Full RSS feed URL"}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isAdding || !newValue}
                  className="w-full h-14 uppercase tracking-wide font-bold text-xs gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl border border-primary/20"
                >
                  {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 stroke-[3]" />}
                  Initialize Pipeline
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
