"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Database, Plus, Trash2, Power, Globe, Loader2, Signal, Radio, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  id: string;
  type: string;
  value: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function SourcesPage() {
  const { data: sources, mutate, isLoading } = useSWR<Source[]>("/api/admin/sources", fetcher);
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState("telegram");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    setIsAdding(true);
    try {
      await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, value: newValue, name: newValue })
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

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display mb-1 flex items-center gap-3">
            <Radio className="w-8 h-8 text-primary shadow-[0_0_24px_rgba(var(--primary),0.5)] bg-primary/20 p-1.5 rounded-lg border border-primary/30" />
            Active Signal Relays
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wide font-medium">Manage MTProto extraction nodes & OSINT pipelines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
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
                {sources.map(source => (
                  <Card key={source.id} className={cn("p-6 flex items-center justify-between bg-card/30 backdrop-blur-xl border-border/40 hover:bg-card/50 transition-all group overflow-hidden relative", source.isActive ? "border-primary/20 shadow-lg shadow-primary/5" : "")}>
                    {source.isActive && (
                       <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                    )}
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="relative">
                        <div className={cn("p-4 rounded-2xl flex items-center justify-center border shadow-xl relative z-10 backdrop-blur-3xl", source.type === 'telegram' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-blue-500/20' : 'bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-orange-500/20')}>
                          {source.type === 'telegram' ? <Signal className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                        </div>
                        {source.isActive && (
                           <div className={cn("absolute inset-0 blur-xl animate-pulse -z-10", source.type === "telegram" ? "bg-blue-500/30" : "bg-orange-500/30")} />
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-xl font-display tracking-tight shadow-sm">{source.value}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold font-mono">
                            TRGT_NODE_TYPE: <span className={cn(source.type === "telegram" ? "text-blue-400" : "text-orange-400")}>{source.type}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="flex items-center gap-2">
                        {source.isActive ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-500 mt-0.5">Live</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5">Dormant</span>
                          </>
                        )}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(source.id)}
                        disabled={deletingId === source.id}
                        className="h-10 w-10 p-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl hover:border hover:border-destructive/20 transition-all border border-transparent"
                      >
                        {deletingId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </Card>
                ))}
             </div>
           )}
        </div>

        <div>
          <Card className="bg-card/40 backdrop-blur-xl border-border/40 sticky top-8 overflow-hidden rounded-[2rem] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="p-8 relative">
              <h3 className="font-bold font-display uppercase tracking-wide mb-6 flex items-center gap-3 text-sm text-primary">
                <Power className="w-5 h-5 bg-primary/20 p-1 rounded border border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.4)]" /> 
                Deploy Extraction Node
              </h3>
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wide flex items-center gap-2">
                     <ArrowRight className="w-3 h-3 text-primary/60" /> Operation Protocol
                   </label>
                   <select 
                     value={newType} 
                     onChange={(e) => setNewType(e.target.value)}
                     className="w-full bg-background/60 border border-border/40 shadow-inner p-4 rounded-xl text-xs font-bold placeholder:text-muted-foreground/50 uppercase tracking-wide outline-none focus:ring-1 focus:ring-primary/50 transition-all font-sans text-foreground"
                   >
                     <option value="telegram" className="bg-background text-foreground uppercase tracking-wide font-bold text-xs">MTProto Network (Telegram View)</option>
                     <option value="rss" disabled className="bg-background text-foreground uppercase tracking-wide font-bold text-xs opacity-50">RSS Syndication (Dormant)</option>
                   </select>
                </div>
                <div className="space-y-3">
                   <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wide flex items-center gap-2">
                     <ArrowRight className="w-3 h-3 text-primary/60" /> Target Identifier
                   </label>
                   <input 
                     type="text"
                     value={newValue}
                     onChange={e => setNewValue(e.target.value)}
                     placeholder="E.G. LIVEUAMAP"
                     required
                     className="w-full bg-background/60 border border-border/40 shadow-inner p-4 rounded-xl text-xs font-bold placeholder:text-muted-foreground/40 uppercase tracking-wide outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-foreground"
                   />
                </div>
                <Button 
                  type="submit" 
                  disabled={isAdding || !newValue} 
                  className="w-full h-14 uppercase tracking-wide font-bold text-xs gap-3 mt-4 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl border border-primary/20"
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
