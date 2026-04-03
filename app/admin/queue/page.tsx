"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Edit3,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import * as React from "react";
import type { MapRef } from "react-map-gl/maplibre";
import {
  useAdminQueue,
  usePublishedEvents,
  useAdminSettings,
} from "@/lib/queries/events";
import { PendingList } from "@/components/admin/pending-list";
import { PublishedList } from "@/components/admin/published-list";
import { ModerationPanel } from "@/components/admin/moderation-panel";
import { QueueMap } from "@/components/admin/queue-map";
import { useQueueStore } from "@/lib/stores/queue-store";

export default function ModerationQueue() {
  const { data: session } = authClient.useSession();
  const role =
    ((session?.user as Record<string, unknown>)?.role as string) || "user";
  const canModerate = ["owner", "admin", "moderator"].includes(role);
  const canPurge = ["owner", "admin"].includes(role);
  const canAddCustomEvent = ["owner", "admin"].includes(role);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<"pending" | "published">(
    "pending"
  );

  // Pending queue
  const {
    data: queue,
    refetch: mutate,
    isLoading,
  } = useAdminQueue();
  // Published events
  const {
    data: published,
    refetch: mutatePublished,
    isLoading: isLoadingPublished,
  } = usePublishedEvents();
  const { data: settings, refetch: mutateSettings } = useAdminSettings();

  // Selection
  const [selectedPendingId, setSelectedPendingId] = React.useState<
    string | null
  >(null);
  const [selectedPublishedId, setSelectedPublishedId] = React.useState<
    string | null
  >(null);
  const selectedPending = React.useMemo(
    () => queue?.find((i) => i.id === selectedPendingId) || null,
    [queue, selectedPendingId]
  );
  const selectedPublished = React.useMemo(
    () => published?.find((i) => i.id === selectedPublishedId) || null,
    [published, selectedPublishedId]
  );

  // Editable fields (via Zustand store)
  const {
    editTitle,
    editDesc,
    editSourceUrl,
    editSeverity,
    editEventType,
    editEventTime,
    editPos,

    pubTitle,
    pubDesc,
    pubSourceUrl,
    pubImageUrl,
    pubSeverity,
    pubEventType,
    pubEventTime,
    pubPos,

    setEditTitle,
    setEditDesc,
    setEditSourceUrl,
    setEditSeverity,
    setEditEventType,
    setEditEventTime,
    setEditPos,

    setPubTitle,
    setPubDesc,
    setPubSourceUrl,
    setPubImageUrl,
    setPubSeverity,
    setPubEventType,
    setPubEventTime,
    setPubPos,
  } = useQueueStore();

  // UI state
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isReprocessing, setIsReprocessing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSwitchingProvider, setIsSwitchingProvider] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [showManualDialog, setShowManualDialog] = React.useState(false);
  const [showDeletePublishedDialog, setShowDeletePublishedDialog] =
    React.useState(false);
  const [manualInput, setManualInput] = React.useState("");
  const [manualSource, setManualSource] = React.useState("");
  const [manualSourceUrl, setManualSourceUrl] = React.useState("");
  const [manualImageUrl, setManualImageUrl] = React.useState("");
  const [isIngestingManual, setIsIngestingManual] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"date" | "source" | "status">(
    "date"
  );
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  const [sortByPublished, setSortByPublished] = React.useState<
    "date" | "severity" | "title"
  >("date");
  const [sortOrderPublished, setSortOrderPublished] = React.useState<"asc" | "desc">("desc");
  const [isLayoutLoaded, setIsLayoutLoaded] = React.useState(false);
  const [mainLayout, setMainLayout] = React.useState<
    Record<string, number> | undefined
  >(undefined);
  const [innerLayout, setInnerLayout] = React.useState<
    Record<string, number> | undefined
  >(undefined);
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
    } catch {
    } finally {
      setIsLayoutLoaded(true);
    }
  }, []);

  // Sync pending edit state
  React.useEffect(() => {
    if (!selectedPending) {
      lastPendingId.current = null;
      setEditTitle("");
      setEditDesc("");
      setEditPos(null);
      setEditSourceUrl("");
      setEditSeverity("medium");
      setEditEventType("unknown");
      setEditEventTime("");
      return;
    }
    if (lastPendingId.current !== selectedPending.id) {
      setEditTitle(selectedPending.suggestedTitle || "");
      setEditDesc(selectedPending.suggestedDescription || "");
      setEditSourceUrl(selectedPending.sourceUrl || "");
      setEditSeverity("medium");
      setEditEventType("unknown");
      // Pre-fill with the original source time so admin can tweak it
      if (selectedPending.sourceCreatedAt) {
        const d = new Date(selectedPending.sourceCreatedAt);
        setEditEventTime(d.toISOString().slice(0, 16)); // datetime-local format
      } else {
        setEditEventTime(new Date().toISOString().slice(0, 16));
      }
      if (selectedPending.lng && selectedPending.lat) {
        const p = { lng: selectedPending.lng, lat: selectedPending.lat };
        setEditPos(p);
        mapRef.current?.flyTo({
          center: [p.lng, p.lat],
          zoom: 12,
          duration: 1500,
        });
      } else {
        setEditPos(null);
      }
      lastPendingId.current = selectedPending.id;
    }
  }, [selectedPending, setEditTitle, setEditDesc, setEditPos, setEditSourceUrl, setEditSeverity, setEditEventType, setEditEventTime]);

  // Sync published edit state
  React.useEffect(() => {
    if (!selectedPublished) {
      lastPublishedId.current = null;
      setPubTitle("");
      setPubDesc("");
      setPubPos(null);
      setPubSourceUrl("");
      setPubImageUrl("");
      setPubSeverity("medium");
      setPubEventType("unknown");
      setPubEventTime("");
      return;
    }
    if (lastPublishedId.current !== selectedPublished.id) {
      setPubTitle(selectedPublished.title || "");
      setPubDesc(selectedPublished.description || "");
      setPubSourceUrl(selectedPublished.sourceUrl || "");
      setPubImageUrl(selectedPublished.imageUrl || "");
      setPubSeverity(selectedPublished.severity || "medium");
      // Sync stored eventType so picker shows correct current value
      setPubEventType(selectedPublished.eventType || "unknown");
      if (selectedPublished.sourceCreatedAt) {
        const d = new Date(selectedPublished.sourceCreatedAt);
        setPubEventTime(d.toISOString().slice(0, 16));
      } else if (selectedPublished.createdAt) {
        const d = new Date(selectedPublished.createdAt);
        setPubEventTime(d.toISOString().slice(0, 16));
      } else {
        setPubEventTime("");
      }
      if (selectedPublished.lng && selectedPublished.lat) {
        const p = { lng: selectedPublished.lng, lat: selectedPublished.lat };
        setPubPos(p);
        mapRef.current?.flyTo({
          center: [p.lng, p.lat],
          zoom: 12,
          duration: 1500,
        });
      } else {
        setPubPos(null);
      }
      lastPublishedId.current = selectedPublished.id;
    }
  }, [selectedPublished, setPubTitle, setPubDesc, setPubPos, setPubSourceUrl, setPubImageUrl, setPubSeverity, setPubEventType, setPubEventTime]);

  // Live stream for new events
  React.useEffect(() => {
    const es = new EventSource("/api/admin/stream");
    es.onmessage = (e) => {
      try {
        if (JSON.parse(e.data).type === "new_event") mutate();
      } catch {}
    };
    return () => es.close();
  }, [mutate]);

  const formatRelativeTime = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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
          sourceUrl: editSourceUrl,
          eventType: editEventType,
          sourceCreatedAt: editEventTime
            ? new Date(editEventTime).toISOString()
            : undefined,
        }),
      });
      if (res.ok) {
        mutate();
        mutatePublished();
        setSelectedPendingId(null);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePending = async () => {
    if (!selectedPending) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/admin/queue?id=${selectedPending.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutate();
        setSelectedPendingId(null);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePublished = async () => {
    if (!selectedPublished) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/admin/events/${selectedPublished.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutatePublished();
        setSelectedPublishedId(null);
        setShowDeletePublishedDialog(false);
      }
    } finally {
      setIsPublishing(false);
    }
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
          imageUrl: manualImageUrl || undefined,
        }),
      });
      if (res.ok) {
        mutate();
        setManualInput("");
        setManualSource("");
        setManualSourceUrl("");
        setManualImageUrl("");
        setShowManualDialog(false);
      }
    } finally {
      setIsIngestingManual(false);
    }
  };

  const handleSavePublished = async () => {
    if (!selectedPublished) return;
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: pubTitle,
        description: pubDesc,
        severity: pubSeverity,
        sourceUrl: pubSourceUrl,
        imageUrl: pubImageUrl,
        eventType: pubEventType,
        sourceCreatedAt: pubEventTime
          ? new Date(pubEventTime).toISOString()
          : undefined,
      };
      if (pubPos) {
        body.lng = pubPos.lng;
        body.lat = pubPos.lat;
      }
      const res = await fetch(`/api/admin/events/${selectedPublished.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        mutatePublished();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReprocess = async () => {
    if (!selectedPending) return;
    setIsReprocessing(true);
    try {
      const res = await fetch("/api/admin/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedPending.id }),
      });
      if (res.ok) mutate();
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

  const handleClearAll = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch("/api/admin/queue?id=all", { method: "DELETE" });
      if (res.ok) {
        mutate();
        setSelectedPendingId(null);
        setShowClearDialog(false);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const isSelected =
    activeTab === "pending" ? !!selectedPending : !!selectedPublished;

  return (
    <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border/40 bg-background/50 backdrop-blur-3xl flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[11px] font-black tracking-[0.2em] uppercase font-display leading-none text-foreground/90">
                Moderation Queue
              </h1>
              <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">
                Admin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* AI Provider */}
          <div className="flex items-center gap-1 bg-secondary/20 p-0.5 rounded-lg border border-border/30">
            {(["gemini", "openai"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleProviderSwitch(p)}
                disabled={isSwitchingProvider}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                  settings?.provider === p
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isSwitchingProvider && settings?.provider !== p ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Brain className="w-2.5 h-2.5" />
                )}
                {p === "gemini" ? "Gemini" : "GPT-4o"}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border/40" />

          <div className="flex items-center gap-2">
            {canPurge && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearDialog(true)}
                className="h-8 rounded-lg px-3 text-[10px] font-black uppercase text-destructive/60 hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3 h-3 mr-2" /> Purge
              </Button>
            )}
            {canAddCustomEvent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualDialog(true)}
                className="h-8 rounded-lg px-3 text-[10px] font-black uppercase border-primary/20 text-primary bg-primary/5 hover:bg-primary/10"
              >
                <Edit3 className="w-3 h-3 mr-2" /> Add Event
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                mutate();
                mutatePublished();
              }}
              className="h-8 w-8 p-0 rounded-lg bg-secondary/20 hover:bg-secondary/40 border-border/30"
              title="Refresh"
            >
              <RefreshCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {!isLayoutLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
          </div>
        ) : (
          <ResizablePanelGroup
            orientation="horizontal"
            className="flex-1 w-full h-full"
            defaultLayout={mainLayout}
            onLayoutChange={(l) => {
              setMainLayout(l);
              localStorage.setItem("osint-queue-main-v1", JSON.stringify(l));
            }}
          >
            {/* Left: List Sidebar */}
            <ResizablePanel
              defaultSize="25"
              minSize="18"
              maxSize="40"
              id="queue-sidebar-panel"
            >
              <div className="w-full h-full border-r border-border/30 flex flex-col bg-card/5">
                {/* Tab Navigator */}
                <div className="p-3 bg-background/50 border-b border-border/20">
                  <div className="bg-secondary/20 p-1 rounded-xl flex gap-1 border border-border/10">
                    {(
                      [
                        {
                          key: "pending",
                          label: "Queue",
                          count: queue?.length,
                          icon: AlertTriangle,
                        },
                        {
                          key: "published",
                          label: "Active",
                          count: published?.length,
                          icon: CheckCircle2,
                        },
                      ] as const
                    ).map(({ key, label, count, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          activeTab === key
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                        {count !== undefined && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-md text-[8px] font-bold min-w-[18px]",
                              activeTab === key
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-black/20 text-muted-foreground"
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-header area for Search/Sort inside the list components */}

                <div className="flex-1 overflow-hidden p-0">
                  {/* PENDING LIST */}
                  {activeTab === "pending" && (
                    <PendingList
                      queue={queue}
                      isLoading={isLoading}
                      selectedPendingId={selectedPendingId}
                      onSelect={(id) => setSelectedPendingId(id)}
                      sortBy={sortBy}
                      onSortChange={setSortBy}
                      sortOrder={sortOrder}
                      onSortOrderChange={setSortOrder}
                      formatRelativeTime={formatRelativeTime}
                    />
                  )}

                  {/* PUBLISHED LIST */}
                  {activeTab === "published" && (
                    <PublishedList
                      published={published}
                      isLoading={isLoadingPublished}
                      selectedPublishedId={selectedPublishedId}
                      onSelect={(id) => setSelectedPublishedId(id)}
                      formatRelativeTime={formatRelativeTime}
                      sortBy={sortByPublished}
                      onSortChange={setSortByPublished}
                      sortOrder={sortOrderPublished}
                      onSortOrderChange={setSortOrderPublished}
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle
              withHandle
              className="bg-border/20 hover:bg-border/40 transition-colors"
            />

            {/* Right: Details + Map */}
            <ResizablePanel defaultSize="75" id="queue-content-panel">
              <div className="w-full h-full flex flex-col shadow-[inset_24px_0_48px_-24px_rgba(0,0,0,0.5)] bg-background">
                {isSelected ? (
                  <ResizablePanelGroup
                    orientation="horizontal"
                    className="flex-1 w-full h-full"
                    defaultLayout={innerLayout}
                    onLayoutChange={(l) => {
                      setInnerLayout(l);
                      localStorage.setItem(
                        "osint-queue-inner-v1",
                        JSON.stringify(l)
                      );
                    }}
                  >
                    {/* Details Panel */}
                    <ResizablePanel
                      defaultSize="60"
                      minSize="35"
                      id="queue-details-panel"
                    >
                      <ModerationPanel
                        activeTab={activeTab}
                        selectedPending={selectedPending}
                        selectedPublished={selectedPublished}
                        canModerate={canModerate}
                        canPurge={canPurge}
                        isPublishing={isPublishing}
                        isSaving={isSaving}
                        isReprocessing={isReprocessing}
                        handlePublish={handlePublish}
                        handleDeletePending={handleDeletePending}
                        handleSavePublished={handleSavePublished}
                        handleDeletePublishedConfirm={() =>
                          setShowDeletePublishedDialog(true)
                        }
                        handleReprocess={handleReprocess}
                        formatRelativeTime={formatRelativeTime}
                      />
                    </ResizablePanel>

                    <ResizableHandle
                      withHandle
                      className="bg-border/20 hover:bg-border/40 transition-colors"
                    />

                    {/* Map Panel */}
                    <ResizablePanel
                      defaultSize="40"
                      minSize="20"
                      id="queue-map-panel"
                    >
                      <QueueMap
                        activeTab={activeTab}
                        selectedPending={selectedPending}
                        selectedPublished={selectedPublished}
                        mapRef={mapRef}
                      />
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
                      {activeTab === "pending"
                        ? "Select an Item"
                        : "Select an Event"}
                      <span className="opacity-20">{"///"}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground/50 max-w-md leading-relaxed font-medium">
                      {activeTab === "pending"
                        ? "Select a pending item from the list on the left to start reviewing and publishing."
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
            <DialogTitle className="text-xl font-black uppercase tracking-tight font-display">
              Clear Queue
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium leading-relaxed">
              This will permanently delete all pending items from the moderation
              queue. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-5 border-t border-border/20 mt-5">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className="flex-1 h-11 rounded-xl text-xs font-black uppercase"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={isPublishing}
              className="flex-1 h-11 rounded-xl text-xs font-black uppercase shadow-xl shadow-destructive/20"
            >
              {isPublishing ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Clear All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Published Dialog */}
      <Dialog
        open={showDeletePublishedDialog}
        onOpenChange={setShowDeletePublishedDialog}
      >
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border-destructive/20 rounded-3xl p-8 font-sans">
          <DialogHeader className="space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight font-display">
              Unpublish Event
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium leading-relaxed">
              This will permanently remove{" "}
              <strong>&ldquo;{selectedPublished?.title}&rdquo;</strong> from the
              public map. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-5 border-t border-border/20 mt-5">
            <Button
              variant="ghost"
              onClick={() => setShowDeletePublishedDialog(false)}
              className="flex-1 h-11 rounded-xl text-xs font-black uppercase"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePublished}
              disabled={isPublishing}
              className="flex-1 h-11 rounded-xl text-xs font-black uppercase"
            >
              {isPublishing ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Confirm Unpublish"
              )}
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
                <DialogTitle className="text-2xl font-black uppercase tracking-tight font-display">
                  Add Event Manually
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/60 font-medium text-xs tracking-wide uppercase">
                  Submit raw text for AI processing and review
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">
                Raw Content
              </label>
              <textarea
                placeholder="Describe the event in detail..."
                className="w-full bg-secondary/20 border border-border/20 rounded-2xl p-5 text-sm h-40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all leading-relaxed font-medium placeholder:text-muted-foreground/20"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground/40 font-bold tracking-widest uppercase pl-1">
                Minimum 10 characters required for AI processing
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">
                  Source Name
                </label>
                <input
                  placeholder="e.g. osintdefender"
                  className="w-full bg-secondary/20 border border-border/20 rounded-xl px-4 h-12 text-xs font-black uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/20"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">
                  Original URL
                </label>
                <input
                  placeholder="HTTP://..."
                  className="w-full bg-secondary/20 border border-border/20 rounded-xl px-4 h-12 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/20"
                  value={manualSourceUrl}
                  onChange={(e) => setManualSourceUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest pl-1">
                Image Endpoint (Optional)
              </label>
              <input
                placeholder="https://..."
                className="w-full bg-secondary/20 border border-border/20 rounded-xl px-4 h-12 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/20"
                value={manualImageUrl}
                onChange={(e) => setManualImageUrl(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-4 pt-10 mt-4 border-t border-border/10">
            <Button
              variant="ghost"
              onClick={() => setShowManualDialog(false)}
              className="flex-1 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-secondary/40"
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualIngest}
              disabled={isIngestingManual || manualInput.length < 10}
              className="flex-1 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isIngestingManual ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`.custom-scrollbar::-webkit-scrollbar{width:4px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:hsl(var(--primary)/.15);border-radius:10px}`}</style>
    </div>
  );
}
