"use client";

import * as React from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Loader2, RefreshCcw, Activity, ShieldCheck, ChevronRight } from "lucide-react";
import Map, { Marker, NavigationControl, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PendingEvent {
  id: string;
  rawSource: string;
  suggestedTitle: string;
  suggestedDescription: string;
  status: string;
  createdAt: string;
  lng: number | null;
  lat: number | null;
}

export default function ModerationQueue() {
  const { theme } = useTheme();
  const { data: queue, mutate, isLoading } = useSWR<PendingEvent[]>("/api/admin/queue", fetcher);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = React.useMemo(() => {
    return queue?.find(i => i.id === selectedId) || null;
  }, [queue, selectedId]);

  const [isPublishing, setIsPublishing] = React.useState(false);
  const mapRef = React.useRef<MapRef>(null);

  // Editable fields for the selected event
  const [editTitle, setEditTitle] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editPos, setEditPos] = React.useState<{ lng: number; lat: number } | null>(null);

  const lastSelectedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (selected) {
      // If we just changed IDs, or if we have no content but suggestions just arrived
      const isNewSelection = lastSelectedId.current !== selected.id;
      
      if (isNewSelection || (!editTitle && selected.suggestedTitle)) {
        setEditTitle(selected.suggestedTitle || "");
      }
      if (isNewSelection || (!editDesc && selected.suggestedDescription)) {
        setEditDesc(selected.suggestedDescription || "");
      }
      
      if (selected.lng && selected.lat) {
        const newPos = { lng: selected.lng, lat: selected.lat };
        
        // Only update position and fly if it's a new selection or if we had no position
        if (isNewSelection || !editPos) {
          setEditPos(newPos);
          mapRef.current?.flyTo({
            center: [newPos.lng, newPos.lat],
            zoom: 12,
            duration: 2000
          });
        }
      } else if (isNewSelection) {
        setEditPos(null);
      }
      
      lastSelectedId.current = selected.id;
    } else {
      lastSelectedId.current = null;
      setEditTitle("");
      setEditDesc("");
      setEditPos(null);
    }
  }, [selected, editTitle, editDesc, editPos]);

  const handlePublish = async () => {
    if (!selected || !editPos) return;
    setIsPublishing(true);
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          title: editTitle,
          description: editDesc,
          lng: editPos.lng,
          lat: editPos.lat,
          severity: "high" // Default for now
        }),
      });
      if (res.ok) {
        mutate();
        setSelectedId(null);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsPublishing(true); // Using same loading state for simplicity
    try {
      const res = await fetch(`/api/admin/queue?id=${selected.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutate();
        setSelectedId(null);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleMapClick = (e: MapLayerMouseEvent) => {
    setEditPos({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  // Grouping logic for the sidebar
  const groupedQueue = React.useMemo(() => {
    if (!queue) return {};
    const groups: Record<string, PendingEvent[]> = {};
    queue.forEach((item) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [queue]);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
      <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-xl flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col h-full justify-center">
                <h1 className="text-sm font-bold tracking-tight uppercase text-foreground font-display leading-none">Intelligence Queue</h1>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-none mt-1 opacity-50">Tactical Verification</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/40">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{queue?.length || 0} PENDING</span>
             </div>
             <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2 h-9 rounded-full px-4 text-xs font-bold uppercase tracking-wider">
                <RefreshCcw className="w-3.5 h-3.5" /> Sync
             </Button>
          </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* List Section */}
        <div className="w-80 h-full border-r border-border/50 flex flex-col bg-card/20 backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground opacity-50">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="text-xs font-bold uppercase tracking-widest">Hydrating Queue...</span>
              </div>
            )}
            
            {!isLoading && Object.entries(groupedQueue).map(([date, items]) => (
              <div key={date} className="space-y-3">
                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-1 border-b border-border/20 mb-3">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-primary/70">
                    {date}
                  </span>
                </div>
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-all border border-border/40 group relative overflow-hidden font-sans",
                      selected?.id === item.id 
                        ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/5" 
                        : "bg-background/40 hover:bg-secondary/50 hover:border-border"
                    )}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {selected?.id === item.id && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                    )}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <h3 className={cn(
                          "font-bold text-xs tracking-tight line-clamp-1 flex-1 uppercase font-display",
                          selected?.id === item.id ? "text-primary" : "text-foreground"
                        )}>
                          {item.suggestedTitle || "UNPROCESSED INTEL"}
                        </h3>
                        {item.lng && (
                           <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                           </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {item.rawSource}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-bold text-muted-foreground/60 tabular-nums">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                        <div className="flex items-center gap-1">
                             <span className="text-[8px] font-bold text-muted-foreground/40 group-hover:text-primary transition-colors uppercase tracking-widest opacity-0 group-hover:opacity-100">Select</span>
                             <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {!isLoading && queue?.length === 0 && (
              <div className="text-center py-20 text-muted-foreground opacity-50">
                <p className="text-xs font-bold uppercase tracking-widest">Queue Clear</p>
              </div>
            )}
          </div>
        </div>

        {/* Details & Map Section */}
        <div className="flex-1 h-full bg-background relative flex flex-col">
          {selected ? (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex-1 flex flex-col border-r border-border/50">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-2 h-2 rounded-full bg-primary" />
                       <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-display">Refinement Engine</h2>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider ml-1">Optimized Intelligence Title</label>
                      <input 
                        className="w-full bg-secondary/20 border border-border/40 rounded-xl p-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-secondary/40 transition-all font-display"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Target designation..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider ml-1">Situational Report (Summary)</label>
                      <textarea 
                        className="w-full bg-secondary/20 border border-border/40 rounded-xl p-4 text-sm h-48 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-secondary/40 transition-all leading-relaxed font-sans"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Intelligence summary..."
                      />
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-3 shadow-xl shadow-primary/5">
                      <div className="flex justify-between items-center pb-2 border-b border-primary/10">
                        <label className="text-[10px] font-bold uppercase text-primary/80 tracking-widest">Raw Source Intelligence</label>
                        <Badge variant="outline" className="text-[9px] font-bold border-primary/20 text-primary">SECURED</Badge>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground font-mono italic">&ldquo;{selected.rawSource}&rdquo;</p>
                    </div>
                  </div>
                </div>

                <div className="h-24 border-t border-border/50 bg-card/10 backdrop-blur-xl p-6 flex flex-row-reverse items-center justify-between gap-4">
                  <Button 
                    className="h-12 px-8 rounded-xl text-xs font-bold uppercase tracking-widest gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    onClick={handlePublish}
                    disabled={isPublishing}
                  >
                    {isPublishing ? <Loader2 className="animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Deploy to Public Map
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-12 w-12 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all font-sans"
                    onClick={handleDelete}
                    disabled={isPublishing}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 flex flex-col items-start gap-1">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Intel Origin ID</span>
                     <span className="text-[10px] font-mono text-muted-foreground">{selected.id}</span>
                  </div>
                </div>
              </div>

              <div className="w-[400px] h-full bg-card/20 flex flex-col">
                <div className="p-6 border-b border-border/50 bg-background/50">
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-1 font-display">Geospatial Validation</h3>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-mono text-primary font-bold">PRECISION: HIGH</span>
                       <span className="text-[10px] font-mono text-muted-foreground tracking-tighter">
                          {editPos?.lat.toFixed(6)}N / {editPos?.lng.toFixed(6)}E
                       </span>
                    </div>
                </div>
                <div className="flex-1 relative border-l border-border/10">
                    <Map
                      ref={mapRef}
                      initialViewState={{
                        longitude: editPos?.lng || 31.1656,
                        latitude: editPos?.lat || 48.3794,
                        zoom: 12,
                      }}
                      onClick={handleMapClick}
                      mapStyle={theme === "dark" ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/bright"}
                      style={{ width: "100%", height: "100%" }}
                    >
                      {editPos && (
                        <Marker longitude={editPos.lng} latitude={editPos.lat} anchor="bottom">
                          <MapPin className="text-primary fill-primary/20 w-8 h-8 -mt-8" />
                        </Marker>
                      )}
                      <NavigationControl position="bottom-right" />
                    </Map>
                    <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2">
                       <Card className="bg-background/80 backdrop-blur-xl border-border/40 p-2 text-center text-[9px] font-bold tracking-widest uppercase shadow-2xl">
                          Select Point of Interest on Map
                       </Card>
                       {selected?.lng && (
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={() => {
                             mapRef.current?.flyTo({ center: [selected.lng!, selected.lat!], zoom: 12 });
                             setEditPos({ lng: selected.lng!, lat: selected.lat! });
                           }}
                           className="bg-background/80 backdrop-blur-xl border-border/40 h-8 text-[9px] font-bold uppercase tracking-widest gap-2"
                         >
                           <MapPin className="w-3 h-3 text-primary" /> Use AI Suggested Location
                         </Button>
                       )}
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 animate-in fade-in zoom-in-95 duration-700">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="w-24 h-24 rounded-3xl bg-secondary/50 flex items-center justify-center border border-border/40 relative">
                  <Activity className="w-10 h-10 text-muted-foreground/40 animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-bold font-display uppercase tracking-tight mb-2">Awaiting Intelligence</h3>
              <p className="text-sm text-muted-foreground max-w-md antialiased leading-relaxed">
                Connect to a raw signal stream or select an operational event from the registry list to initiate the geospatial verification protocol.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
