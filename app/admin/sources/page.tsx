"use client";
import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Database, Plus, Trash2, Globe, Loader2, Signal,
  Radio, ArrowRight, ExternalLink, Twitter, Power,
  Activity, Clock, RefreshCcw, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { useIngestSources, useToggleSourceMutation, queryKeys } from "@/lib/queries/events";
import type { IngestSource } from "@/lib/schemas";
import { useQueryClient } from "@tanstack/react-query";

const SOURCE_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  telegram: { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",    glow: "bg-blue-500/40" },
  x:        { bg: "bg-slate-400/10",  border: "border-slate-400/20",  text: "text-slate-300",   glow: "bg-slate-400/30" },
  rss:      { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400",  glow: "bg-orange-500/40" },
  custom:   { bg: "bg-primary/10",   border: "border-primary/20",   text: "text-primary",     glow: "bg-primary/40" },
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
  const { data: sources, isLoading } = useIngestSources();
  const toggleMutation = useToggleSourceMutation();
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<IngestSource["type"]>("telegram");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const qc = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await new Promise(r => setTimeout(r, 1000)); // Mocking sync latency
      qc.invalidateQueries({ queryKey: queryKeys.ingestSources() });
    } finally {
      setSyncingId(null);
    }
  };

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
      qc.invalidateQueries({ queryKey: queryKeys.ingestSources() });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/sources?id=${id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: queryKeys.ingestSources() });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setTogglingId(id);
    try {
      await toggleMutation.mutateAsync({ id, isActive: !current });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 md:p-10 space-y-8 sm:space-y-12 animate-in fade-in duration-700 font-sans max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-3xl shadow-2xl">
                <Radio className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-display text-white italic uppercase">
                Active Sources
              </h1>
              <p className="text-muted-foreground/60 text-[9px] sm:text-sm font-medium tracking-widest uppercase">
                MANAGE INGEST CHANNELS AND DATA PIPELINES
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-secondary/20 border border-white/5 backdrop-blur-xl flex items-center gap-3 shadow-xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
             <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
        {/* Source List */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 sm:p-32 opacity-50 gap-6">
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-primary" />
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-primary animate-pulse">Loading sources...</span>
            </div>
          ) : !sources?.length ? (
            <div className="p-10 sm:p-20 text-center tactical-card border-dashed border-2 rounded-3xl">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display tracking-tight mb-2 italic">No sources added</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto opacity-60">Add a new ingest source to start collecting data.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {(sources ?? []).map((source: IngestSource) => {
                const styles = SOURCE_STYLES[source.type] ?? SOURCE_STYLES.custom;
                const Icon = SOURCE_ICONS[source.type] ?? Globe;
                const link = SOURCE_LINK[source.type]?.(source.value);
                const isStalled = source.isActive && source.lastFetchedAt && differenceInHours(new Date(), new Date(source.lastFetchedAt)) > 6;

                return (
                  <div
                    key={source.id}
                    className={cn(
                      "tactical-card group p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6",
                      !source.isActive && "opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
                      isStalled && "border-amber-500/30"
                    )}
                  >
                    <div className="premium-glow" />
                    
                    <div className="flex items-center gap-4 sm:gap-6 relative z-10 min-w-0">
                      {/* Icon Container */}
                      <div className="relative shrink-0">
                        <div className={cn(
                          "w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center border-2 shadow-2xl backdrop-blur-3xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                          styles.bg, styles.border, styles.text
                        )}>
                          <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        {source.isActive && (
                          <div className={cn("absolute inset-0 blur-2xl animate-pulse -z-10 opacity-50", styles.glow)} />
                        )}
                      </div>

                      {/* Info Body */}
                      <div className="flex flex-col gap-1 sm:gap-2 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <h3 className="font-black text-xl sm:text-2xl font-display tracking-tight text-white/90 truncate group-hover:text-primary transition-colors italic uppercase leading-none">
                            {source.value}
                          </h3>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all shrink-0"
                            >
                              <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </a>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                          <div className={cn("tactical-badge px-2 py-0.5 sm:px-3 sm:py-1", styles.bg, styles.border, styles.text)}>
                            {source.type}
                          </div>
                          
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-30" />
                            {source.signalsLast24h} <span className="opacity-50 font-medium lowercase">posts</span>
                          </div>

                          {source.lastFetchedAt && (
                            <div className={cn(
                              "flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] font-bold uppercase tracking-widest",
                              isStalled ? "text-amber-400" : "text-emerald-400/80"
                            )}>
                              {isStalled ? <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce" /> : <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-40" />}
                              <span className="opacity-50 font-medium">{isStalled ? "Stall:" : "Synced:"}</span>
                              {formatDistanceToNow(new Date(source.lastFetchedAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center justify-between md:justify-end gap-4 relative z-10 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-none border-white/5">
                      <div className="flex flex-col items-start md:items-end gap-1 px-0 md:px-4 md:border-r border-white/5 md:mr-2">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em]",
                          source.isActive ? "text-emerald-500" : "text-amber-500/60"
                        )}>
                          {source.isActive ? "Operational" : "Standby"}
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className={cn(
                              "w-1 h-2.5 sm:w-1 h-3 rounded-full",
                              source.isActive ? "bg-emerald-500/20" : "bg-white/5",
                              source.isActive && i === 3 && "animate-pulse bg-emerald-500/60"
                            )} />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5">
                        {source.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(source.id)}
                            disabled={syncingId === source.id}
                            className="h-9 w-9 sm:h-11 sm:w-11 p-0 text-muted-foreground hover:text-primary hover:bg-primary/20 rounded-lg sm:rounded-xl transition-all"
                          >
                            {syncingId === source.id ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(source.id, source.isActive)}
                          disabled={togglingId === source.id}
                          className={cn(
                            "h-9 w-9 sm:h-11 sm:w-11 p-0 rounded-lg sm:rounded-xl transition-all",
                            source.isActive
                              ? "text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/20"
                              : "text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/20"
                          )}
                        >
                          {togglingId === source.id ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Power className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(source.id)}
                          disabled={deletingId === source.id}
                          className="h-9 w-9 sm:h-11 sm:w-11 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/20 rounded-lg sm:rounded-xl transition-all"
                        >
                          {deletingId === source.id ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative">
          <div className="glass-panel sticky top-4 sm:top-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="p-6 sm:p-10 relative space-y-6 sm:space-y-8">
              <div className="space-y-1 sm:space-y-2">
                <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-3 italic">
                   Add Source
                </h3>
                <p className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">INTEGEST PIPELINE CONFIG</p>
              </div>

              <form onSubmit={handleAdd} className="space-y-6 sm:space-y-8">
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[10px] sm:text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">
                    Protocol / Provider
                  </label>
                  <div className="relative group">
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as IngestSource["type"])}
                      className="tactical-input h-12 sm:h-14 pl-10 sm:pl-12 font-bold uppercase tracking-widest appearance-none cursor-pointer text-xs sm:text-sm"
                    >
                      <option value="telegram">Telegram (MTProto)</option>
                      <option value="x">X / Twitter (API)</option>
                    </select>
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-primary/40 group-hover:text-primary transition-colors">
                      {newType === 'telegram' ? <Signal className="w-4 h-4 sm:w-5 sm:h-5" /> : <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity">
                       <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[10px] sm:text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">
                    Handle Identifier
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder={newType === "x" ? "osintdefender" : "LIVEUAMAP"}
                      required
                      className="tactical-input h-12 sm:h-14 pl-10 sm:pl-12 font-mono uppercase tracking-[0.15em] sm:tracking-[0.2em] text-foreground text-xs sm:text-sm"
                    />
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-primary/40 group-hover:text-primary transition-colors">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  <div className="px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-primary/5 border border-primary/10 flex gap-2 sm:gap-3 items-start backdrop-blur-3xl animate-in slide-in-from-top-2 duration-500">
                     <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Signal className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-primary" />
                     </div>
                     <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed font-medium">
                        {newType === "telegram" && "Enter the public channel name exactly as it appears in the URL (e.g., 'liveuamap')."}
                        {newType === "x" && "Enter the verified handle without the @ symbol."}
                     </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isAdding || !newValue}
                  className="tactical-btn w-full h-14 sm:h-16 text-sm sm:text-md shadow-[0_20px_40px_-10px_rgba(var(--primary),0.3)]"
                >
                  {isAdding ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />}
                  Deploy Pipeline
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
