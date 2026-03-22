"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Plus, Trash2, Power, Globe, Loader2, Signal } from "lucide-react";

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
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display mb-1 uppercase flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Signal Sources
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Manage MTProto extraction nodes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
           {isLoading && (
             <div className="flex flex-col items-center justify-center p-20 opacity-50 gap-4">
                 <Loader2 className="w-8 h-8 animate-spin text-primary" />
                 <span className="text-xs uppercase tracking-widest font-bold">Syncing Database...</span>
             </div>
           )}

           {!isLoading && sources?.map(source => (
              <Card key={source.id} className="p-5 flex items-center justify-between bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl border flex items-center justify-center ${source.type === 'telegram' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                    {source.type === 'telegram' ? <Signal className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg font-display uppercase tracking-tight">{source.value}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{source.type}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {source.isActive ? (
                    <Badge variant="outline" className="text-xs uppercase font-bold tracking-widest text-emerald-500 bg-emerald-500/10 border-emerald-500/20 px-3">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
                      Offline
                    </Badge>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(source.id)}
                    disabled={deletingId === source.id}
                    className="h-10 w-10 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    {deletingId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>
           ))}
        </div>

        <div>
          <Card className="p-6 bg-card/40 backdrop-blur-xl border-border/40 sticky top-8">
            <h3 className="font-bold font-display uppercase tracking-widest mb-4 flex items-center gap-2 text-sm">
              <Power className="w-4 h-4 text-primary" /> Deploy New Node
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Platform</label>
                 <select 
                   value={newType} 
                   onChange={(e) => setNewType(e.target.value)}
                   className="w-full bg-secondary/30 border border-border/40 p-3 rounded-xl text-sm font-bold placeholder:text-muted-foreground/50 uppercase outline-none focus:ring-2 focus:ring-primary/50 transition-all font-display"
                 >
                   <option value="telegram">Telegram Channel</option>
                   <option value="rss" disabled>RSS Feed (Soon)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target ID (Username)</label>
                 <input 
                   type="text"
                   value={newValue}
                   onChange={e => setNewValue(e.target.value)}
                   placeholder="e.g. liveuamap"
                   required
                   className="w-full bg-secondary/30 border border-border/40 p-3 rounded-xl text-sm font-bold placeholder:text-muted-foreground/50 uppercase outline-none focus:ring-2 focus:ring-primary/50 transition-all font-display"
                 />
              </div>
              <Button 
                type="submit" 
                disabled={isAdding || !newValue} 
                className="w-full h-12 uppercase tracking-widest font-bold text-xs gap-2 mt-4 shadow-lg shadow-primary/20"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Initialize Target
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
