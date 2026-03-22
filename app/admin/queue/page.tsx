"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Brain,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useTheme } from "next-themes";
import * as React from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PendingEvent {
  id: string;
  rawSource: string;
  suggestedTitle: string;
  suggestedDescription: string;
  status: "pending" | "processing" | "processed" | "rejected" | "failed";
  source: string | null;
  sourceCreatedAt: string | null;
  createdAt: string;
  lng: number | null;
  lat: number | null;
  externalId: string | null;
  imageUrl: string | null;
}

export default function ModerationQueue() {
  const { theme } = useTheme();
  const {
    data: queue,
    mutate,
    isLoading,
  } = useSWR<PendingEvent[]>("/api/admin/queue", fetcher);
  const { data: settings, mutate: mutateSettings } = useSWR(
    "/api/admin/settings",
    fetcher,
    { revalidateOnFocus: false }
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = React.useMemo(() => {
    return queue?.find((i) => i.id === selectedId) || null;
  }, [queue, selectedId]);

  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isReprocessing, setIsReprocessing] = React.useState(false);
  const [isSwitchingProvider, setIsSwitchingProvider] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"date" | "source">("date");
  const mapRef = React.useRef<MapRef>(null);

  // Persistent Layout State
  const [isLayoutLoaded, setIsLayoutLoaded] = React.useState(false);
  const [mainLayout, setMainLayout] = React.useState<Record<string, number> | undefined>(undefined);
  const [innerLayout, setInnerLayout] = React.useState<Record<string, number> | undefined>(undefined);

  React.useEffect(() => {
    try {
      const storedMain = localStorage.getItem("osint-queue-main-v1");
      if (storedMain) setMainLayout(JSON.parse(storedMain));
      
      const storedInner = localStorage.getItem("osint-queue-inner-v1");
      if (storedInner) setInnerLayout(JSON.parse(storedInner));
    } catch (e) {
      console.error("Failed to restore layout", e);
    } finally {
      setIsLayoutLoaded(true);
    }
  }, []);

  const onMainLayoutChange = (layout: Record<string, number>) => {
    setMainLayout(layout);
    localStorage.setItem("osint-queue-main-v1", JSON.stringify(layout));
  };

  const onInnerLayoutChange = (layout: Record<string, number>) => {
    setInnerLayout(layout);
    localStorage.setItem("osint-queue-inner-v1", JSON.stringify(layout));
  };

  // Editable fields for the selected event
  const [editTitle, setEditTitle] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editPos, setEditPos] = React.useState<{
    lng: number;
    lat: number;
  } | null>(null);

  const lastSelectedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (selected) {
      const isNewSelection = lastSelectedId.current !== selected.id;

      if (isNewSelection || (!editTitle && selected.suggestedTitle)) {
        setEditTitle(selected.suggestedTitle || "");
      }
      if (isNewSelection || (!editDesc && selected.suggestedDescription)) {
        setEditDesc(selected.suggestedDescription || "");
      }

      if (selected.lng && selected.lat) {
        const newPos = { lng: selected.lng, lat: selected.lat };
        if (isNewSelection || !editPos) {
          setEditPos(newPos);
          mapRef.current?.flyTo({
            center: [newPos.lng, newPos.lat],
            zoom: 12,
            duration: 2000,
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

  React.useEffect(() => {
    const eventSource = new EventSource("/api/admin/stream");
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "new_event") {
          mutate();
        }
      } catch {
        // ignore errors
      }
    };
    return () => eventSource.close();
  }, [mutate]);

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
          severity: "high",
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
    setIsPublishing(true);
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

  const handleClearAll = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch("/api/admin/queue?id=all", { method: "DELETE" });
      if (res.ok) {
        mutate();
        setSelectedId(null);
        setShowClearDialog(false);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReprocess = async () => {
    if (!selected) return;
    setIsReprocessing(true);
    try {
      const res = await fetch("/api/admin/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });
      if (res.ok) {
        mutate();
      }
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleProviderSwitch = async (provider: "gemini" | "openai") => {
    setIsSwitchingProvider(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await mutateSettings();
    } finally {
      setIsSwitchingProvider(false);
    }
  };

  // Extract the first URL found in raw source text or reconstruct from ID
  const extractUrl = (event: PendingEvent): string | null => {
    // 1. Check raw content for existing URLs
    const match = event.rawSource.match(/https?:\/\/[^\s]+/);
    if (match) return match[0];

    // 2. Reconstruct from Telegram ID if possible (tg_username_msgid)
    if (event.externalId?.startsWith("tg_")) {
      const parts = event.externalId.split("_");
      if (parts.length >= 3) {
        const username = parts[1];
        const msgId = parts[2];
        return `https://t.me/${username}/${msgId}`;
      }
    }

    // 3. Fallback to channel link if simple source name exists
    if (event.source) {
      return `https://t.me/${event.source}`;
    }

    return null;
  };

  const groupedQueue = React.useMemo(() => {
    if (!queue) return {};

    // Sort logic
    const sorted = [...queue].sort((a, b) => {
      if (sortBy === "source") {
        return (a.source || "").localeCompare(b.source || "");
      }
      const timeA = new Date(a.sourceCreatedAt || a.createdAt).getTime();
      const timeB = new Date(b.sourceCreatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    const groups: Record<string, PendingEvent[]> = {};
    sorted.forEach((item) => {
      const displayDate = item.sourceCreatedAt || item.createdAt;
      const date = new Date(displayDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [queue, sortBy]);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
      <header className="h-16 border-b border-border/40 bg-background/50 backdrop-blur-3xl flex items-center justify-between px-8 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 border border-primary-foreground/10">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-widest uppercase text-foreground font-display leading-none flex items-center gap-2">
              Tactical Response Hub
              <Badge
                variant="outline"
                className="h-5 text-xs font-black tracking-tighter border-primary/30 text-primary bg-primary/5 uppercase flex items-center"
              >
                Admin v2
              </Badge>
            </h1>
            <span className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] leading-none mt-1 opacity-80">
              Geospatial Intelligence (MOD)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary/30 px-3.5 py-1.5 rounded-xl border border-border/40 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-black text-foreground/80 lowercase tracking-tighter">
              {queue?.length || 0} signals active
            </span>
          </div>
          {/* AI Provider Toggle */}
          <div className="flex items-center gap-1 bg-secondary/20 p-1 rounded-xl border border-border/30">
            {(["gemini", "openai"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleProviderSwitch(p)}
                disabled={isSwitchingProvider}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  settings?.provider === p
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isSwitchingProvider && settings?.provider !== p ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Brain className="w-3 h-3" />
                )}
                {p === "gemini" ? "Gemini" : "GPT-4o"}
                {p === "openai" && !settings?.hasOpenAIKey && (
                  <span className="text-destructive/70">⚠</span>
                )}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            className="gap-2 h-9 rounded-md px-4 text-xs font-black uppercase tracking-widest text-destructive/80 border-destructive/20 hover:bg-destructive/10 bg-destructive/5 hover:text-destructive transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Purge Queue
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-2 h-9 rounded-md px-4 text-xs font-black uppercase tracking-widest bg-secondary/20 hover:bg-secondary/40"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Sync Ops
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {!isLayoutLoaded ? (
          <div className="flex-1 flex items-center justify-center bg-background/50 backdrop-blur-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
          </div>
        ) : (
          <ResizablePanelGroup 
            orientation="horizontal" 
            className="flex-1 w-full h-full bg-background relative overflow-hidden"
            defaultLayout={mainLayout}
            onLayoutChange={onMainLayoutChange}
          >
            {/* List Section */}
            <ResizablePanel 
              defaultSize="25" 
              minSize="15" 
              maxSize="45"
              id="queue-sidebar-panel"
            >
              <div className="w-full h-full border-r border-border/30 flex flex-col bg-card/10 backdrop-blur-xl">
              <div className="p-4 border-b border-border/10 flex items-center justify-between bg-background/20 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">
              Sort Strategy
            </span>
            <div className="flex gap-1">
              {(["date", "source"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                    sortBy === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground opacity-30">
                <Loader2 className="animate-spin w-10 h-10 stroke-[3]" />
                <span className="text-xs font-black uppercase tracking-[0.3em] font-display">
                  Syncing Registry...
                </span>
              </div>
            )}

            {!isLoading &&
              Object.entries(groupedQueue).map(([date, items]) => (
                <div key={date} className="space-y-4">
                  <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-2xl py-2 px-1 border-b border-border/20 mb-3 flex items-center justify-between">
                    <span className="text-xs font-black tracking-[0.2em] uppercase text-primary/80 flex items-center gap-2">
                      <Activity className="w-3 h-3 h-3" />
                      {date}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-4 text-[10px] border-border/30 opacity-50 px-1"
                    >
                      {items.length} MSG
                    </Badge>
                  </div>
                  {items.map((item) => {
                    const eventLink = extractUrl(item);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3.5 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden font-sans",
                          selected?.id === item.id
                            ? "bg-primary/10 border-primary/50 shadow-[0_8px_24px_-12px_rgba(var(--primary),0.5)] ring-1 ring-primary/20"
                            : "bg-background/40 hover:bg-secondary/30 border-border/20 hover:border-border/40"
                        )}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <div className="flex flex-col gap-2 relative z-10">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={cn(
                                "font-black text-xs tracking-tight line-clamp-2 flex-1 uppercase font-display leading-[1.35]",
                                selected?.id === item.id
                                  ? "text-primary"
                                  : item.status === "processing"
                                  ? "text-primary/60 animate-pulse"
                                  : item.status === "failed"
                                  ? "text-destructive/80"
                                  : item.suggestedTitle
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {item.status === "processing"
                                ? "PROBING SIGNAL..."
                                : item.status === "failed"
                                ? "ENRICHMENT FAILED: SIGNAL DEGRADED"
                                : item.suggestedTitle || "ANALYZING SIGNAL..."}
                            </h3>
                            {item.status === "processing" ? (
                              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                              </div>
                            ) : item.lng ? (
                              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              </div>
                            ) : (
                              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/10 border border-destructive/30 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed font-medium">
                            {item.rawSource}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-muted-foreground/50 tabular-nums uppercase">
                                {formatRelativeTime(
                                  item.sourceCreatedAt || item.createdAt
                                )}
                              </span>
                              {eventLink && (
                                <Badge
                                  variant="outline"
                                  asChild
                                  className="text-xs h-4 px-2 font-black border-primary/30 text-primary bg-primary/5 uppercase tracking-tighter hover:bg-primary/10 cursor-pointer"
                                >
                                  <a
                                    href={eventLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {item.source}
                                  </a>
                                </Badge>
                              )}
                              {!eventLink && item.source && (
                                <Badge
                                  variant="outline"
                                  className="text-xs h-4 px-2 font-black border-primary/30 text-primary bg-primary/5 uppercase tracking-tighter"
                                >
                                  {item.source}
                                </Badge>
                              )}
                            </div>
                            <ChevronRight
                              className={cn(
                                "w-3.5 h-3.5 transition-all text-muted-foreground/20",
                                selected?.id === item.id
                                  ? "text-primary translate-x-1"
                                  : "group-hover:text-primary/50"
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {(!queue || queue.length === 0) && (
              <div className="text-center py-32 flex flex-col items-center gap-6 opacity-20">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                  {isLoading ? (
                    <Loader2 className="animate-spin w-8 h-8 text-primary/30" />
                  ) : (
                    <Zap className="w-8 h-8 text-primary/30" />
                  )}
                </div>
                <p className="text-xs font-black uppercase tracking-[0.5em] font-display">
                  {isLoading ? "Syncing..." : "Sector Neutral"}
                </p>
              </div>
            )}
              </div>
             </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/20 hover:bg-border/40 transition-colors" />

            {/* Details & Map Section */}
            <ResizablePanel 
              defaultSize="75"
              id="queue-content-panel" 
            >
              <div className="w-full h-full relative flex flex-col shadow-[inset_24px_0_48px_-24px_rgba(0,0,0,0.5)] bg-background">
          {selected ? (
            <ResizablePanelGroup 
              orientation="horizontal" 
              className="flex-1 w-full h-full overflow-hidden animate-in fade-in zoom-in-95 duration-500"
              defaultLayout={innerLayout}
              onLayoutChange={onInnerLayoutChange}
            >
              <ResizablePanel 
                defaultSize="65" 
                minSize="30" 
                id="queue-details-panel"
              >
               <div className="w-full h-full flex flex-col border-r border-border/20">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-[0_0_12px_rgba(var(--primary),0.8)]",
                            selected.status === "failed"
                              ? "bg-destructive shadow-destructive"
                              : "bg-primary shadow-primary"
                          )}
                        />
                        <h2 className="text-xs font-black uppercase tracking-widest text-foreground/70 font-display">
                          {selected.status === "failed"
                            ? "Enrichment Failure"
                            : "Enrichment Protocol"}
                        </h2>
                      </div>
                      {selected.status === "failed" && (
                        <Badge
                          variant="destructive"
                          className="animate-pulse text-xs font-black uppercase tracking-widest"
                        >
                          Permanent Loss
                        </Badge>
                      )}
                    </div>

                    {selected.status === "failed" && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center gap-4 text-destructive mb-6">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black uppercase tracking-widest leading-none">
                            AI Parsing Blocked
                          </span>
                          <span className="text-xs opacity-70 font-medium tracking-tight">
                            System was unable to enrich this signal after the
                            initial attempt (Quota/Rate Limit). Manual entry
                            required.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-muted-foreground/60 tracking-widest ml-1">
                        Assigned Title
                      </label>
                      <input
                        className="w-full bg-secondary/20 border border-border/30 rounded-xl p-4 text-base font-black focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-all font-display ring-offset-background selection:bg-primary/30"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Pending designation..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-muted-foreground/60 tracking-widest ml-1">
                        Summary SITREP
                      </label>
                      <textarea
                        className="w-full bg-secondary/20 border border-border/30 rounded-xl p-4 text-sm h-52 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-all leading-relaxed font-medium selection:bg-primary/30"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Intelligence summary..."
                      />
                    </div>

                    <div className="bg-secondary/10 border border-border/30 rounded-3xl p-8 space-y-4 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShieldCheck className="w-20 h-20" />
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-border/20">
                        <label className="text-xs font-black uppercase text-muted-foreground/80 tracking-widest">
                          Signal Source Content
                        </label>
                        <div className="flex items-center gap-2">
                          {extractUrl(selected) && (
                            <a
                              href={extractUrl(selected)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-black border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-full transition-all"
                            >
                              <ExternalLink className="w-3 h-3" /> Open Source
                            </a>
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs font-black border-emerald-500/20 text-emerald-500 bg-emerald-500/5 px-2"
                          >
                            ENCRYPTED
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground font-medium italic relative z-10">
                        &ldquo;{selected.rawSource}&rdquo;
                      </p>
                      {selected.imageUrl && (
                        <div className="mt-4 relative z-10 rounded-xl overflow-hidden border border-border/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selected.imageUrl}
                            alt="Signal Image"
                            className="w-full max-h-64 object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-28 border-t border-border/20 bg-background/50 backdrop-blur-2xl p-6 flex flex-row-reverse items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <Button
                      variant="outline"
                      className="h-11 px-6 rounded-xl text-xs font-black uppercase tracking-widest gap-2 border-border/40 hover:bg-primary/10 hover:border-primary/40 transition-all text-foreground group"
                      onClick={handleReprocess}
                      disabled={isReprocessing || isPublishing}
                    >
                      {isReprocessing ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4 group-hover:fill-primary" />
                      )}
                      Rescan
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-destructive hover:text-destructive-foreground border-border/40 hover:border-destructive transition-all p-0"
                      onClick={handleDelete}
                      title="Permanently Delete Event"
                      disabled={isPublishing || isReprocessing}
                    >
                      <X className="w-5 h-5 mx-auto" />
                      Delete
                    </Button>
                    <Button
                      className="h-11 px-8 rounded-xl text-sm font-black uppercase tracking-widest gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handlePublish}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 stroke-[3]" />
                      )}
                      Authorize
                    </Button>
                  </div>
                  <div className="flex flex-col items-start gap-1 p-2.5 px-4 rounded-xl border border-border/10 bg-secondary/5">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                      Intel ID Hash
                    </span>
                    <span className="text-xs font-mono text-muted-foreground/70">
                      {selected.id.split("-")[0]}...
                      {selected.id.split("-").pop()}
                    </span>
                  </div>
                </div>
               </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-border/20 hover:bg-border/40 transition-colors" />

              <ResizablePanel 
                defaultSize="35" 
                minSize="20" 
                id="queue-map-panel"
              >
               <div className="w-full h-full flex flex-col bg-card/5">
                <div className="p-8 border-b border-border/20 bg-background/30 backdrop-blur-md space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-3 font-display">
                    Spatial Correlator
                  </h3>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors">
                      <MapPin className="w-full h-full" />
                    </div>
                    <input
                      type="text"
                      placeholder="SEARCH TARGET (E.G. PENTAGON)..."
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (val.length < 3) return;
                        try {
                          await fetch(
                            `https://photon.komoot.io/api/?q=${encodeURIComponent(
                              val
                            )}&limit=5`
                          );
                          // Suggestion dropdown soon
                        } catch {}
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value;
                          const coords = await (
                            await fetch(
                              `https://photon.komoot.io/api/?q=${encodeURIComponent(
                                val
                              )}&limit=1`
                            )
                          ).json();
                          if (coords.features?.[0]) {
                            const [lng, lat] =
                              coords.features[0].geometry.coordinates;
                            setEditPos({ lng, lat });
                            mapRef.current?.flyTo({
                              center: [lng, lat],
                              zoom: 15,
                            });
                          }
                        }
                      }}
                      className="w-full bg-secondary/20 border border-border/30 rounded-xl pl-10 pr-4 h-11 text-xs font-black uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/30"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    {editPos ? (
                      <span className="text-xs font-mono text-emerald-500 font-black tracking-tight flex items-center gap-2 italic">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                        SYSTEM_LOCK_STABLE
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-destructive font-black tracking-tight flex items-center gap-2 italic animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        NO_COORDINATES_FOUND
                      </span>
                    )}
                    <span className="text-xs font-mono text-foreground font-black tracking-tighter bg-secondary/30 px-2 py-0.5 rounded border border-border/20">
                      {editPos
                        ? `${editPos.lat.toFixed(6)}°N / ${editPos.lng.toFixed(
                            6
                          )}°E`
                        : "UNKNOWN_LOC"}
                    </span>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <Map
                    ref={mapRef}
                    initialViewState={{
                      longitude: editPos?.lng || 0,
                      latitude: editPos?.lat || 20,
                      zoom: editPos ? 12 : 1.5,
                    }}
                    onClick={handleMapClick}
                    mapStyle={
                      theme === "dark"
                        ? "https://tiles.openfreemap.org/styles/dark"
                        : "https://tiles.openfreemap.org/styles/bright"
                    }
                    style={{ width: "100%", height: "100%" }}
                  >
                    {editPos && (
                      <Marker
                        longitude={editPos.lng}
                        latitude={editPos.lat}
                        anchor="bottom"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 scale-[2.5] blur-lg bg-primary/40 rounded-full animate-pulse" />
                          <MapPin className="text-primary fill-primary/30 w-10 h-10 -mt-10 stroke-[2.5] drop-shadow-2xl relative z-10" />
                        </div>
                      </Marker>
                    )}
                    <NavigationControl position="bottom-right" />
                  </Map>
                  <div className="absolute top-6 left-6 right-6 z-10 flex flex-col gap-3">
                    <Card className="bg-background/80 backdrop-blur-2xl border-primary/20 p-3 text-center text-xs font-black tracking-[0.3em] uppercase shadow-[0_12px_48px_-12px_rgba(0,0,0,0.8)] border-dashed border-2">
                      Point of Interest Selection Phase
                    </Card>
                    {selected?.lng && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          mapRef.current?.flyTo({
                            center: [selected.lng!, selected.lat!],
                            zoom: 12,
                          });
                          setEditPos({
                            lng: selected.lng!,
                            lat: selected.lat!,
                          });
                        }}
                        className="bg-primary/10 backdrop-blur-2xl border-primary/40 h-10 text-xs font-black uppercase tracking-widest gap-3 hover:bg-primary/20 transition-all text-primary shadow-2xl"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Recalibrate to
                        Suggestion
                      </Button>
                    )}
                  </div>
                  {/* Visual Overlays */}
                  <div className="absolute inset-0 pointer-events-none border-[20px] border-primary/5 rounded-3xl" />
                </div>
               </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 animate-in fade-in zoom-in-95 duration-1000">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                <div className="w-32 h-32 rounded-[2.5rem] bg-secondary/20 flex items-center justify-center border border-primary/10 relative overflow-hidden backdrop-blur-2xl shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  <Activity className="w-12 h-12 text-primary/40 animate-pulse relative z-10" />
                  <div className="absolute bottom-1 w-full text-center">
                    <div className="text-xs font-black text-primary/30 tracking-[0.5em] uppercase">
                      Status_Idle
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-3xl font-black font-display uppercase tracking-tight mb-4 flex items-center gap-4 text-foreground/90">
                <span className="opacity-20 flex-shrink-0">{"///"}</span>
                Silent Registry
                <span className="opacity-20 flex-shrink-0">{"///"}</span>
              </h3>
              <p className="text-sm text-muted-foreground/60 max-w-lg antialiased leading-relaxed font-medium uppercase tracking-tight px-10 border-l border-r border-border/20">
                Awaiting incoming raw signals. Initiate MTProto client
                extraction or select a pending tactical event from the registry
                to begin enrichment protocol.
              </p>
            </div>
            )}
              </div>
            </ResizablePanel>
        </ResizablePanelGroup>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border-destructive/20 rounded-3xl p-8 font-sans">
          <DialogHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-destructive animate-bounce" />
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight font-display">
              System Purge Authorization
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium leading-relaxed">
              EXTREME CAUTION: You are about to initiate a terminal wipe of the
              entire moderation queue. This action will permanently erase all
              unverified intelligence reports. Data recovery is not possible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-6 border-t border-border/20 mt-6">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest"
            >
              Abort Purge
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={isPublishing}
              className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-destructive/20"
            >
              {isPublishing ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Confirm Wipe"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
