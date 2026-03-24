"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Activity, AlertCircle, AlertTriangle, Brain, CheckCircle2,
  ChevronRight, Edit3, ExternalLink, Globe, Image as ImageIcon, Link2,
  Loader2, MapPin, RefreshCcw, ShieldCheck, Trash2, X, Zap,
} from "lucide-react";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useTheme } from "next-themes";
import * as React from "react";
import Map, {
  Marker, NavigationControl,
  type MapLayerMouseEvent, type MapRef,
} from "react-map-gl/maplibre";
import useSWR from "swr";
import { authClient } from "@/lib/auth-client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface PendingEvent {
  id: string;
  rawSource: string;
  suggestedTitle: string;
  suggestedDescription: string;
  status: "pending" | "processing" | "processed" | "rejected" | "failed";
  source: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  sourceCreatedAt: string | null;
  createdAt: string;
  lng: number | null;
  lat: number | null;
  externalId: string | null;
}

interface PublishedEvent {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceCreatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lng: number | null;
  lat: number | null;
}

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"] as const;
type Severity = typeof SEVERITY_OPTIONS[number];

const severityColor = (s: Severity) => ({
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
}[s] ?? "bg-secondary text-secondary-foreground");

export default function ModerationQueue() {
  const { theme } = useTheme();
  const { data: session } = authClient.useSession();
  const role = (session?.user as Record<string, unknown>)?.role as string || "user";
  const canModerate = ["owner", "admin", "moderator"].includes(role);
  const canPurge = ["owner", "admin"].includes(role);
  const canAddCustomEvent = ["owner", "admin"].includes(role);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<"pending" | "published">("pending");

  // Pending queue
  const { data: queue, mutate, isLoading } = useSWR<PendingEvent[]>("/api/admin/queue", fetcher, { refreshInterval: 8000 });
  // Published events
  const { data: published, mutate: mutatePublished, isLoading: isLoadingPublished } = useSWR<PublishedEvent[]>("/api/admin/published", fetcher, { revalidateOnFocus: false });
  const { data: settings, mutate: mutateSettings } = useSWR("/api/admin/settings", fetcher, { revalidateOnFocus: false });

  // Selection
  const [selectedPendingId, setSelectedPendingId] = React.useState<string | null>(null);
  const [selectedPublishedId, setSelectedPublishedId] = React.useState<string | null>(null);
  const selectedPending = React.useMemo(() => queue?.find(i => i.id === selectedPendingId) || null, [queue, selectedPendingId]);
  const selectedPublished = React.useMemo(() => published?.find(i => i.id === selectedPublishedId) || null, [published, selectedPublishedId]);

  // Editable fields (pending)
  const [editTitle, setEditTitle] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editSourceUrl, setEditSourceUrl] = React.useState("");
  const [editSeverity, setEditSeverity] = React.useState<Severity>("medium");
  const [editPos, setEditPos] = React.useState<{ lng: number; lat: number } | null>(null);

  // Editable fields (published)
  const [pubTitle, setPubTitle] = React.useState("");
  const [pubDesc, setPubDesc] = React.useState("");
  const [pubSourceUrl, setPubSourceUrl] = React.useState("");
  const [pubImageUrl, setPubImageUrl] = React.useState("");
  const [pubSeverity, setPubSeverity] = React.useState<Severity>("medium");
  const [pubPos, setPubPos] = React.useState<{ lng: number; lat: number } | null>(null);

  // UI state
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isReprocessing, setIsReprocessing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSwitchingProvider, setIsSwitchingProvider] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [showManualDialog, setShowManualDialog] = React.useState(false);
  const [showDeletePublishedDialog, setShowDeletePublishedDialog] = React.useState(false);
  const [manualInput, setManualInput] = React.useState("");
  const [manualSource, setManualSource] = React.useState("");
  const [manualSourceUrl, setManualSourceUrl] = React.useState("");
  const [manualImageUrl, setManualImageUrl] = React.useState("");
  const [isIngestingManual, setIsIngestingManual] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"date" | "source">("date");
  const [isLayoutLoaded, setIsLayoutLoaded] = React.useState(false);
  const [mainLayout, setMainLayout] = React.useState<Record<string, number> | undefined>(undefined);
  const [innerLayout, setInnerLayout] = React.useState<Record<string, number> | undefined>(undefined);
  const mapRef = React.useRef<MapRef>(null);
  const lastPendingId = React.useRef<string | null>(null);
  const lastPublishedId = React.useRef<string | null>(null);

  // Restore layouts
  React.useEffect(() => {
    try {
      const m = localStorage.getItem("osint-queue-main-v1");
      if (m) setMainLayout(JSON.parse(m));
      const i = localStorage.getItem("osint-queue-inner-v1");
      if (i) setInnerLayout(JSON.parse(i));
    } catch {}
    finally { setIsLayoutLoaded(true); }
  }, []);

  // Sync pending edit state
  React.useEffect(() => {
    if (!selectedPending) { lastPendingId.current = null; setEditTitle(""); setEditDesc(""); setEditPos(null); setEditSourceUrl(""); setEditSeverity("medium"); return; }
    if (lastPendingId.current !== selectedPending.id) {
      setEditTitle(selectedPending.suggestedTitle || "");
      setEditDesc(selectedPending.suggestedDescription || "");
      setEditSourceUrl(selectedPending.sourceUrl || "");
      setEditSeverity("medium");
      if (selectedPending.lng && selectedPending.lat) {
        const p = { lng: selectedPending.lng, lat: selectedPending.lat };
        setEditPos(p);
        mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 12, duration: 1500 });
      } else { setEditPos(null); }
      lastPendingId.current = selectedPending.id;
    }
  }, [selectedPending]);

  // Sync published edit state
  React.useEffect(() => {
    if (!selectedPublished) { lastPublishedId.current = null; setPubTitle(""); setPubDesc(""); setPubPos(null); setPubSourceUrl(""); setPubImageUrl(""); setPubSeverity("medium"); return; }
    if (lastPublishedId.current !== selectedPublished.id) {
      setPubTitle(selectedPublished.title || "");
      setPubDesc(selectedPublished.description || "");
      setPubSourceUrl(selectedPublished.sourceUrl || "");
      setPubImageUrl(selectedPublished.imageUrl || "");
      setPubSeverity(selectedPublished.severity || "medium");
      if (selectedPublished.lng && selectedPublished.lat) {
        const p = { lng: selectedPublished.lng, lat: selectedPublished.lat };
        setPubPos(p);
        mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 12, duration: 1500 });
      } else { setPubPos(null); }
      lastPublishedId.current = selectedPublished.id;
    }
  }, [selectedPublished]);

  // Live stream for new events
  React.useEffect(() => {
    const es = new EventSource("/api/admin/stream");
    es.onmessage = (e) => {
      try { if (JSON.parse(e.data).type === "new_event") mutate(); } catch {}
    };
    return () => es.close();
  }, [mutate]);

  // Group pending by date
  const groupedQueue = React.useMemo(() => {
    if (!queue) return {};
    const sorted = [...queue].sort((a, b) => {
      if (sortBy === "source") return (a.source||"").localeCompare(b.source||"");
      return new Date(b.sourceCreatedAt||b.createdAt).getTime() - new Date(a.sourceCreatedAt||a.createdAt).getTime();
    });
    const groups: Record<string, PendingEvent[]> = {};
    sorted.forEach(item => {
      const date = new Date(item.sourceCreatedAt||item.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [queue, sortBy]);

  // Group published by date
  const groupedPublished = React.useMemo(() => {
    if (!published) return {};
    const groups: Record<string, PublishedEvent[]> = {};
    [...published].forEach(item => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [published]);

  const formatRelativeTime = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  const handlePublish = async () => {
    if (!selectedPending || !editPos) return;
    setIsPublishing(true);
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedPending.id, 
          title: editTitle, 
          description: editDesc, 
          lng: editPos.lng, 
          lat: editPos.lat, 
          severity: editSeverity,
          sourceUrl: editSourceUrl
        }),
      });
      if (res.ok) { mutate(); mutatePublished(); setSelectedPendingId(null); }
    } finally { setIsPublishing(false); }
  };

  const handleDeletePending = async () => {
    if (!selectedPending) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/admin/queue?id=${selectedPending.id}`, { method: "DELETE" });
      if (res.ok) { mutate(); setSelectedPendingId(null); }
    } finally { setIsPublishing(false); }
  };

  const handleDeletePublished = async () => {
    if (!selectedPublished) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/admin/events/${selectedPublished.id}`, { method: "DELETE" });
      if (res.ok) { mutatePublished(); setSelectedPublishedId(null); setShowDeletePublishedDialog(false); }
    } finally { setIsPublishing(false); }
  };

  const handleManualIngest = async () => {
    if (!manualInput || manualInput.length < 10) return;
    setIsIngestingManual(true);
    try {
      const res = await fetch("/api/admin/queue/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rawText: manualInput, 
          source: manualSource || "manual_admin", 
          sourceUrl: manualSourceUrl || undefined, 
          imageUrl: manualImageUrl || undefined 
        }),
      });
      if (res.ok) { 
        mutate(); 
        setManualInput(""); setManualSource(""); setManualSourceUrl(""); setManualImageUrl(""); 
        setShowManualDialog(false); 
      }
    } finally { setIsIngestingManual(false); }
  };

  const handleSavePublished = async () => {
    if (!selectedPublished) return;
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = { title: pubTitle, description: pubDesc, severity: pubSeverity, sourceUrl: pubSourceUrl, imageUrl: pubImageUrl };
      if (pubPos) { body.lng = pubPos.lng; body.lat = pubPos.lat; }
      const res = await fetch(`/api/admin/events/${selectedPublished.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { mutatePublished(); }
    } finally { setIsSaving(false); }
  };

  const handleReprocess = async () => {
    if (!selectedPending) return;
    setIsReprocessing(true);
    try {
      const res = await fetch("/api/admin/reprocess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedPending.id }) });
      if (res.ok) mutate();
    } finally { setIsReprocessing(false); }
  };

  const handleProviderSwitch = async (provider: "gemini" | "openai") => {
    setIsSwitchingProvider(true);
    try { await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) }); await mutateSettings(); }
    finally { setIsSwitchingProvider(false); }
  };

  const handleClearAll = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch("/api/admin/queue?id=all", { method: "DELETE" });
      if (res.ok) { mutate(); setSelectedPendingId(null); setShowClearDialog(false); }
    } finally { setIsPublishing(false); }
  };

  const isSelected = activeTab === "pending" ? !!selectedPending : !!selectedPublished;
  const mapClickPos = activeTab === "pending" ? editPos : pubPos;
  const setMapClickPos = activeTab === "pending" ? setEditPos : setPubPos;

  return (
    <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border/40 bg-background/50 backdrop-blur-3xl flex items-center justify-between px-8 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase font-display leading-none flex items-center gap-2">
              Tactical Response Hub
              <Badge variant="outline" className="h-5 text-xs font-black border-primary/30 text-primary bg-primary/5 uppercase">Admin v2</Badge>
            </h1>
            <span className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] leading-none mt-1 opacity-80">Geospatial Intelligence (MOD)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Signals count */}
          <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-xl border border-border/40">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-black text-foreground/80">{queue?.length || 0} pending · {published?.length || 0} published</span>
          </div>
          {/* AI Provider */}
          <div className="flex items-center gap-1 bg-secondary/20 p-1 rounded-xl border border-border/30">
            {(["gemini", "openai"] as const).map(p => (
              <button key={p} onClick={() => handleProviderSwitch(p)} disabled={isSwitchingProvider}
                className={cn("flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  settings?.provider === p ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                {isSwitchingProvider && settings?.provider !== p ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                {p === "gemini" ? "Gemini" : "GPT-4o"}
                {p === "openai" && !settings?.hasOpenAIKey && <span className="text-destructive/70">⚠</span>}
              </button>
            ))}
          </div>
          {canPurge && (
            <Button variant="outline" size="sm" onClick={() => setShowClearDialog(true)}
              className="gap-2 h-9 rounded-md px-4 text-xs font-black uppercase text-destructive/80 border-destructive/20 hover:bg-destructive/10 bg-destructive/5">
              <Trash2 className="w-3.5 h-3.5" /> Purge Queue
            </Button>
          )}
          {canAddCustomEvent && (
            <Button variant="outline" size="sm" onClick={() => setShowManualDialog(true)}
              className="gap-2 h-9 rounded-md px-4 text-xs font-black uppercase text-primary/80 border-primary/20 hover:bg-primary/10 bg-primary/5">
              <Edit3 className="w-3.5 h-3.5" /> Manual Intel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { mutate(); mutatePublished(); }}
            className="gap-2 h-9 rounded-md px-4 text-xs font-black uppercase bg-secondary/20 hover:bg-secondary/40">
            <RefreshCcw className="w-3.5 h-3.5" /> Sync Ops
          </Button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="h-12 border-b border-border/30 bg-background/30 backdrop-blur-xl flex items-center gap-1 px-4 shrink-0">
        {([
          { key: "pending", label: "Moderation Queue", count: queue?.length, icon: AlertTriangle },
          { key: "published", label: "Published Events", count: published?.length, icon: CheckCircle2 },
        ] as const).map(({ key, label, count, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn("flex items-center gap-2 px-4 h-8 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground")}>
            <Icon className="w-3 h-3" />
            {label}
            {count !== undefined && (
              <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-black",
                activeTab === key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!isLayoutLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
          </div>
        ) : (
          <ResizablePanelGroup orientation="horizontal" className="flex-1 w-full h-full"
            defaultLayout={mainLayout} onLayoutChange={(l) => { setMainLayout(l); localStorage.setItem("osint-queue-main-v1", JSON.stringify(l)); }}>

            {/* Left: List */}
            <ResizablePanel defaultSize="25" minSize="18" maxSize="40" id="queue-sidebar-panel">
              <div className="w-full h-full border-r border-border/30 flex flex-col bg-card/10">
                {/* Sort bar (pending only) */}
                {activeTab === "pending" && (
                  <div className="p-3 border-b border-border/10 flex items-center justify-between bg-background/20 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Sort</span>
                    <div className="flex gap-1">
                      {(["date", "source"] as const).map(s => (
                        <button key={s} onClick={() => setSortBy(s)}
                          className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all",
                            sortBy === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
                  {/* PENDING LIST */}
                  {activeTab === "pending" && (
                    <>
                      {isLoading && <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary/20" /></div>}
                      {!isLoading && Object.entries(groupedQueue).map(([date, items]) => (
                        <div key={date} className="space-y-2">
                          <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl py-1.5 px-1 border-b border-border/20 flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest uppercase text-primary/80 flex items-center gap-1.5">
                              <Activity className="w-3 h-3" />{date}
                            </span>
                            <Badge variant="outline" className="h-4 text-[9px] border-border/30 opacity-50 px-1">{items.length} MSG</Badge>
                          </div>
                          {items.map(item => (
                            <div key={item.id}
                              className={cn("p-3 rounded-xl cursor-pointer transition-all border group relative overflow-hidden",
                                selectedPendingId === item.id ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20" : "bg-background/40 hover:bg-secondary/30 border-border/20")}
                              onClick={() => setSelectedPendingId(item.id)}>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h3 className={cn("font-black text-xs tracking-tight line-clamp-2 flex-1 uppercase leading-snug",
                                  selectedPendingId === item.id ? "text-primary" : item.status === "failed" ? "text-destructive/80" : item.suggestedTitle ? "text-foreground" : "text-muted-foreground")}>
                                  {item.status === "processing" ? "PROBING SIGNAL..." : item.status === "failed" ? "ENRICHMENT FAILED" : item.suggestedTitle || "ANALYZING..."}
                                </h3>
                                {item.status === "processing" ? <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" /> :
                                  item.lng ? <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /></div> :
                                  <AlertTriangle className="w-3 h-3 text-destructive/60 shrink-0 animate-pulse" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed">{item.rawSource}</p>
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums">{formatRelativeTime(item.sourceCreatedAt || item.createdAt)}</span>
                                  {item.source && <Badge variant="outline" className="h-3.5 text-[9px] px-1.5 font-black border-primary/20 text-primary bg-primary/5">{item.source}</Badge>}
                                  {item.imageUrl && <ImageIcon className="w-2.5 h-2.5 text-muted-foreground/30" />}
                                  {item.sourceUrl && <Globe className="w-2.5 h-2.5 text-primary/40" />}
                                </div>
                                <ChevronRight className={cn("w-3 h-3 transition-all text-muted-foreground/20", selectedPendingId === item.id ? "text-primary translate-x-0.5" : "group-hover:text-primary/40")} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {!isLoading && (!queue || queue.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-24 opacity-20">
                          <Zap className="w-8 h-8 mb-3" />
                          <p className="text-[11px] font-black uppercase tracking-widest">Sector Neutral</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* PUBLISHED LIST */}
                  {activeTab === "published" && (
                    <>
                      {isLoadingPublished && <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary/20" /></div>}
                      {!isLoadingPublished && Object.entries(groupedPublished).map(([date, items]) => (
                        <div key={date} className="space-y-2">
                          <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl py-1.5 px-1 border-b border-border/20 flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest uppercase text-emerald-500/80 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" />{date}
                            </span>
                            <Badge variant="outline" className="h-4 text-[9px] border-border/30 opacity-50 px-1">{items.length}</Badge>
                          </div>
                          {items.map(item => (
                            <div key={item.id}
                              className={cn("p-3 rounded-xl cursor-pointer transition-all border group",
                                selectedPublishedId === item.id ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20" : "bg-background/40 hover:bg-secondary/30 border-border/20")}
                              onClick={() => setSelectedPublishedId(item.id)}>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h3 className="font-black text-xs tracking-tight line-clamp-2 flex-1 uppercase leading-snug text-foreground">{item.title}</h3>
                                <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase border shrink-0", severityColor(item.severity))}>{item.severity}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground/60 line-clamp-1 leading-relaxed">{item.description}</p>
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                                <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums">{formatRelativeTime(item.createdAt)}</span>
                                <div className="flex items-center gap-1.5">
                                  {item.imageUrl && <ImageIcon className="w-2.5 h-2.5 text-muted-foreground/30" />}
                                  {item.sourceUrl && <Globe className="w-2.5 h-2.5 text-primary/40" />}
                                  <ChevronRight className={cn("w-3 h-3 transition-all text-muted-foreground/20", selectedPublishedId === item.id ? "text-emerald-500 translate-x-0.5" : "group-hover:text-emerald-500/40")} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {!isLoadingPublished && (!published || published.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-24 opacity-20">
                          <CheckCircle2 className="w-8 h-8 mb-3" />
                          <p className="text-[11px] font-black uppercase tracking-widest">No Published Events</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/20 hover:bg-border/40 transition-colors" />

            {/* Right: Details + Map */}
            <ResizablePanel defaultSize="75" id="queue-content-panel">
              <div className="w-full h-full flex flex-col shadow-[inset_24px_0_48px_-24px_rgba(0,0,0,0.5)] bg-background">
                {isSelected ? (
                  <ResizablePanelGroup orientation="horizontal" className="flex-1 w-full h-full"
                    defaultLayout={innerLayout}
                    onLayoutChange={(l) => { setInnerLayout(l); localStorage.setItem("osint-queue-inner-v1", JSON.stringify(l)); }}>

                    {/* Details Panel */}
                    <ResizablePanel defaultSize="60" minSize="35" id="queue-details-panel">
                      <div className="w-full h-full flex flex-col border-r border-border/20">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">

                          {/* PENDING DETAILS */}
                          {activeTab === "pending" && selectedPending && (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2.5 h-2.5 rounded-full", selectedPending.status === "failed" ? "bg-destructive" : "bg-primary shadow-[0_0_12px_rgba(var(--primary),0.8)]")} />
                                  <h2 className="text-xs font-black uppercase tracking-widest text-foreground/70">
                                    {selectedPending.status === "failed" ? "Enrichment Failure" : "Enrichment Protocol"}
                                  </h2>
                                </div>
                                {selectedPending.status === "failed" && <Badge variant="destructive" className="animate-pulse text-xs font-black uppercase">AI Failed</Badge>}
                              </div>

                              {selectedPending.status === "failed" && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3 text-destructive">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <p className="text-xs font-medium">AI enrichment failed. Manual entry required below.</p>
                                </div>
                              )}

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Assigned Title</label>
                                <input className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                  value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Pending designation..." />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Summary SITREP</label>
                                <textarea className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm h-36 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all leading-relaxed font-medium"
                                  value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Intelligence summary..." />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                    <Link2 className="w-3 h-3" /> Source URL
                                  </label>
                                  <input className="w-full bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={editSourceUrl} onChange={e => setEditSourceUrl(e.target.value)} placeholder="https://t.me/..." />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Severity</label>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {SEVERITY_OPTIONS.map(s => (
                                      <button key={s} onClick={() => setEditSeverity(s)}
                                        className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all",
                                          editSeverity === s ? severityColor(s) : "border-border/30 text-muted-foreground hover:border-border/50")}>
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Raw Source */}
                              <div className="bg-secondary/10 border border-border/30 rounded-2xl p-6 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Signal Source Content</label>
                                  <div className="flex items-center gap-2">
                                    {(selectedPending.sourceUrl || editSourceUrl) && (
                                      <a href={selectedPending.sourceUrl || editSourceUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs font-black border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-full transition-all">
                                        <ExternalLink className="w-3 h-3" /> Open Source
                                      </a>
                                    )}
                                    <Badge variant="outline" className="text-xs font-black border-emerald-500/20 text-emerald-500 bg-emerald-500/5">ENCRYPTED</Badge>
                                  </div>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground font-medium italic">&ldquo;{selectedPending.rawSource}&rdquo;</p>
                                {selectedPending.imageUrl && (
                                  <div className="rounded-xl overflow-hidden border border-border/20">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={selectedPending.imageUrl} alt="Signal Visual" className="w-full max-h-48 object-cover" />
                                    <div className="p-2 bg-black/20 flex items-center gap-2">
                                      <ImageIcon className="w-3 h-3 text-muted-foreground" />
                                      <a href={selectedPending.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-primary hover:underline">Full Resolution</a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* PUBLISHED DETAILS */}
                          {activeTab === "published" && selectedPublished && (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                  <h2 className="text-xs font-black uppercase tracking-widest text-foreground/70">Event Editor</h2>
                                </div>
                                <Badge variant="outline" className="text-xs font-black border-emerald-500/30 text-emerald-500 bg-emerald-500/5">PUBLISHED</Badge>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Title</label>
                                <input className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                  value={pubTitle} onChange={e => setPubTitle(e.target.value)} />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Description</label>
                                <textarea className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all leading-relaxed font-medium"
                                  value={pubDesc} onChange={e => setPubDesc(e.target.value)} />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Severity</label>
                                <div className="flex gap-1.5 flex-wrap">
                                  {SEVERITY_OPTIONS.map(s => (
                                    <button key={s} onClick={() => setPubSeverity(s)}
                                      className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all",
                                        pubSeverity === s ? severityColor(s) : "border-border/30 text-muted-foreground hover:border-border/50")}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                  <Link2 className="w-3 h-3" /> Source URL
                                </label>
                                <div className="flex gap-2">
                                  <input className="flex-1 bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                    value={pubSourceUrl} onChange={e => setPubSourceUrl(e.target.value)} placeholder="https://t.me/..." />
                                  {pubSourceUrl && (
                                    <a href={pubSourceUrl} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center justify-center w-10 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
                                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                  <ImageIcon className="w-3 h-3" /> Image URL
                                </label>
                                <div className="flex gap-2">
                                  <input className="flex-1 bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                    value={pubImageUrl} onChange={e => setPubImageUrl(e.target.value)} placeholder="https://blob.vercel.app/..." />
                                  {pubImageUrl && (
                                    <a href={pubImageUrl} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center justify-center w-10 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
                                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                    </a>
                                  )}
                                </div>
                                {pubImageUrl && (
                                  <div className="rounded-xl overflow-hidden border border-border/20 mt-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={pubImageUrl} alt="Preview" className="w-full max-h-36 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  </div>
                                )}
                              </div>

                              <div className="text-[10px] text-muted-foreground/40 font-mono pt-2 border-t border-border/10">
                                ID: {selectedPublished.id.slice(0,8)}... · Published {formatRelativeTime(selectedPublished.createdAt)} · Updated {formatRelativeTime(selectedPublished.updatedAt)}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Action Bar */}
                        <div className="flex gap-3 p-4 lg:p-5 bg-card/60 backdrop-blur-2xl border-t border-border/20 items-center justify-between flex-row-reverse shrink-0">
                          {activeTab === "pending" && selectedPending && (
                            <div className="flex gap-3">
                              {canModerate && (
                                <>
                                  <Button variant="outline" onClick={handleReprocess} disabled={isReprocessing || isPublishing}
                                    className="h-10 px-5 rounded-xl text-xs font-black uppercase gap-2 hover:bg-primary/10 hover:border-primary/40 transition-all">
                                    {isReprocessing ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />} Rescan
                                  </Button>
                                  <Button variant="outline" onClick={handleDeletePending} disabled={isPublishing}
                                    className="h-10 px-5 rounded-xl text-xs font-black uppercase gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                                    <X className="w-3.5 h-3.5" /> Delete
                                  </Button>
                                  <Button onClick={handlePublish} disabled={isPublishing || !editPos}
                                    className="h-10 px-7 rounded-xl text-sm font-black uppercase gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    {isPublishing ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldCheck className="w-4 h-4 stroke-[3]" />} Authorize
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                          {activeTab === "published" && selectedPublished && (
                            <div className="flex gap-3">
                              {canModerate && (
                                <>
                                  {canPurge && (
                                    <Button variant="outline" onClick={() => setShowDeletePublishedDialog(true)} disabled={isPublishing}
                                      className="h-10 px-5 rounded-xl text-xs font-black uppercase gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                                      <Trash2 className="w-3.5 h-3.5" /> Unpublish
                                    </Button>
                                  )}
                                  <Button onClick={handleSavePublished} disabled={isSaving}
                                    className="h-10 px-7 rounded-xl text-sm font-black uppercase gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Edit3 className="w-4 h-4" />} Save Changes
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                          {/* ID display */}
                          <div className="flex flex-col items-start gap-0.5 p-2 px-3.5 rounded-xl border border-border/10 bg-secondary/5">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Intel ID</span>
                            <span className="text-[11px] font-mono text-muted-foreground/60">
                              {(activeTab === "pending" ? selectedPending?.id : selectedPublished?.id)?.slice(0, 18)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border/20 hover:bg-border/40 transition-colors" />

                    {/* Map Panel */}
                    <ResizablePanel defaultSize="40" minSize="20" id="queue-map-panel">
                      <div className="w-full h-full flex flex-col bg-card/5">
                        <div className="p-6 border-b border-border/20 bg-background/30 backdrop-blur-md space-y-3">
                          <h3 className="text-xs font-black uppercase tracking-[0.4em] font-display">Spatial Correlator</h3>
                          <div className="relative group">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                            <input type="text" placeholder="SEARCH TARGET (E.G. PENTAGON)..."
                              onKeyDown={async (e) => {
                                if (e.key !== "Enter") return;
                                const val = (e.target as HTMLInputElement).value;
                                const coords = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=1`)).json();
                                if (coords.features?.[0]) {
                                  const [lng, lat] = coords.features[0].geometry.coordinates;
                                  setMapClickPos({ lng, lat });
                                  mapRef.current?.flyTo({ center: [lng, lat], zoom: 15 });
                                }
                              }}
                              className="w-full bg-background/60 border border-border/40 rounded-xl pl-10 pr-4 h-10 text-xs font-black uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/40" />
                          </div>
                          <div className="flex items-center justify-between">
                            {mapClickPos ? (
                              <span className="text-xs font-mono text-emerald-500 font-black flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SYSTEM_LOCK_STABLE
                              </span>
                            ) : (
                              <span className="text-xs font-mono text-destructive font-black flex items-center gap-2 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> NO_COORDINATES
                              </span>
                            )}
                            <span className="text-xs font-mono text-foreground bg-secondary/30 px-2 py-0.5 rounded border border-border/20">
                              {mapClickPos ? `${mapClickPos.lat.toFixed(5)}°N / ${mapClickPos.lng.toFixed(5)}°E` : "UNKNOWN_LOC"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 relative">
                          <Map ref={mapRef}
                            initialViewState={{ longitude: mapClickPos?.lng || 0, latitude: mapClickPos?.lat || 20, zoom: mapClickPos ? 12 : 1.5 }}
                            onClick={(e: MapLayerMouseEvent) => setMapClickPos({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
                            mapStyle={theme === "dark" ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/bright"}
                            style={{ width: "100%", height: "100%" }}>
                            {mapClickPos && (
                              <Marker longitude={mapClickPos.lng} latitude={mapClickPos.lat} anchor="bottom">
                                <div className="relative">
                                  <div className="absolute inset-0 scale-[2.5] blur-lg bg-primary/40 rounded-full animate-pulse" />
                                  <MapPin className="text-primary fill-primary/30 w-9 h-9 -mt-9 stroke-[2.5] drop-shadow-2xl relative z-10" />
                                </div>
                              </Marker>
                            )}
                            <NavigationControl position="bottom-right" />
                          </Map>
                          {/* Recalibrate button */}
                          <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2">
                            <Card className="bg-background/80 backdrop-blur-2xl border-primary/20 p-2.5 text-center text-[10px] font-black tracking-[0.3em] uppercase border-dashed border-2">
                              Point of Interest Selection Phase
                            </Card>
                            {(() => {
                              const suggLng = activeTab === "pending" ? selectedPending?.lng : selectedPublished?.lng;
                              const suggLat = activeTab === "pending" ? selectedPending?.lat : selectedPublished?.lat;
                              return suggLng && suggLat ? (
                                <Button variant="outline" size="sm"
                                  onClick={() => { mapRef.current?.flyTo({ center: [suggLng, suggLat], zoom: 12 }); setMapClickPos({ lng: suggLng, lat: suggLat }); }}
                                  className="bg-primary/10 backdrop-blur-2xl border-primary/40 h-9 text-xs font-black uppercase gap-2 hover:bg-primary/20 text-primary">
                                  <MapPin className="w-3 h-3" /> Recalibrate to Suggestion
                                </Button>
                              ) : null;
                            })()}
                          </div>
                          <div className="absolute inset-0 pointer-events-none border-[16px] border-primary/5 rounded-3xl" />
                        </div>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-16 animate-in fade-in duration-700">
                    <div className="relative mb-10">
                      <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                      <div className="w-28 h-28 rounded-[2rem] bg-secondary/20 flex items-center justify-center border border-primary/10 relative backdrop-blur-2xl">
                        <Activity className="w-10 h-10 text-primary/40 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black font-display uppercase tracking-tight mb-3 flex items-center gap-3 text-foreground/90">
                      <span className="opacity-20">{"///"}</span>
                      {activeTab === "pending" ? "Silent Registry" : "Select an Event"}
                      <span className="opacity-20">{"///"}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground/50 max-w-md leading-relaxed font-medium">
                      {activeTab === "pending"
                        ? "Select a pending signal from the registry to begin the enrichment and authorization protocol."
                        : "Select a published event from the list to view details, update source links, media, severity or coordinates."}
                    </p>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Purge Queue Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border-destructive/20 rounded-3xl p-8 font-sans">
          <DialogHeader className="space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-destructive animate-bounce" />
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight font-display">System Purge Authorization</DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium leading-relaxed">
              EXTREME CAUTION: This will permanently erase all unverified intelligence from the moderation queue. Data recovery is not possible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-5 border-t border-border/20 mt-5">
            <Button variant="ghost" onClick={() => setShowClearDialog(false)} className="flex-1 h-11 rounded-xl text-xs font-black uppercase">Abort Purge</Button>
            <Button variant="destructive" onClick={handleClearAll} disabled={isPublishing} className="flex-1 h-11 rounded-xl text-xs font-black uppercase shadow-xl shadow-destructive/20">
              {isPublishing ? <Loader2 className="animate-spin" /> : "Confirm Wipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Published Dialog */}
      <Dialog open={showDeletePublishedDialog} onOpenChange={setShowDeletePublishedDialog}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border-destructive/20 rounded-3xl p-8 font-sans">
          <DialogHeader className="space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight font-display">Unpublish Event</DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium leading-relaxed">
              This will permanently remove <strong>&ldquo;{selectedPublished?.title}&rdquo;</strong> from the public map. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-5 border-t border-border/20 mt-5">
            <Button variant="ghost" onClick={() => setShowDeletePublishedDialog(false)} className="flex-1 h-11 rounded-xl text-xs font-black uppercase">Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePublished} disabled={isPublishing} className="flex-1 h-11 rounded-xl text-xs font-black uppercase">
              {isPublishing ? <Loader2 className="animate-spin" /> : "Confirm Unpublish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Intel Input Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-3xl border-primary/20 rounded-[2.5rem] p-10 font-sans shadow-[0_32px_128px_-16px_rgba(var(--primary),0.2)]">
          <DialogHeader className="space-y-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                <Edit3 className="w-7 h-7 text-primary shadow-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight font-display">Intelligence Ingestion</DialogTitle>
                <DialogDescription className="text-muted-foreground/60 font-medium text-xs tracking-wide uppercase">Manual Manual Signal Injection Protocol</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">Raw Intelligence Content</label>
              <textarea placeholder="DESCRIBE THE SITUATION IN DETAIL..." 
                className="w-full bg-secondary/20 border border-border/20 rounded-2xl p-5 text-sm h-40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all leading-relaxed font-medium placeholder:text-muted-foreground/20"
                value={manualInput} onChange={e => setManualInput(e.target.value)} />
              <p className="text-[9px] text-muted-foreground/40 font-bold tracking-widest uppercase pl-1">Minimum 10 characters required for AI enrichment</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">Source Name</label>
                <input placeholder="E.G. OSINTDEFENDER" 
                  className="w-full bg-secondary/20 border border-border/20 rounded-xl px-4 h-12 text-xs font-black uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/20"
                  value={manualSource} onChange={e => setManualSource(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">Original URL</label>
                <input placeholder="HTTP://..." 
                  className="w-full bg-secondary/20 border border-border/20 rounded-xl px-4 h-12 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/20"
                  value={manualSourceUrl} onChange={e => setManualSourceUrl(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">Image Endpoint (Optional)</label>
              <input placeholder="HTTPS://BOLB.VERCEL.APP/..." 
                className="w-full bg-secondary/20 border border-border/20 rounded-xl px-4 h-12 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/20"
                value={manualImageUrl} onChange={e => setManualImageUrl(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="flex gap-4 pt-10 mt-4 border-t border-border/10">
            <Button variant="ghost" onClick={() => setShowManualDialog(false)} className="flex-1 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-secondary/40">Abort Protocol</Button>
            <Button onClick={handleManualIngest} disabled={isIngestingManual || manualInput.length < 10} 
              className="flex-1 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isIngestingManual ? <Loader2 className="animate-spin" /> : "Initiate Injection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`.custom-scrollbar::-webkit-scrollbar{width:4px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:hsl(var(--primary)/.15);border-radius:10px}`}</style>
    </div>
  );
}
