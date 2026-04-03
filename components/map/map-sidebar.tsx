"use client";

/**
 * components/map/map-sidebar.tsx
 *
 * The left collapsible sidebar showing the live event feed.
 * Extracted from map-view.tsx — reads/writes via useMapStore().
 */

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Camera,
  ChevronRight,
  ExternalLink,
  Filter,
  Globe,
  Maximize2,
  X,
  Zap,
} from "lucide-react";
import { 
  motion, 
  AnimatePresence, 
} from "framer-motion";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import type { MapRef } from "react-map-gl/maplibre";

import { deriveEventType } from "@/components/map/map-view";
import { EVENT_TYPE_LABELS, ICON_MAPPING } from "@/lib/constants";
import type { MapEvent } from "@/lib/schemas";
import { useMapStore } from "@/lib/stores/map-store";

interface MapSidebarProps {
  events: MapEvent[];
  isLoading: boolean;
  fetchError: Error | null;
  mapRef: React.RefObject<MapRef | null>;
}

export function MapSidebar({
  events,
  isLoading,
  fetchError,
  mapRef,
}: MapSidebarProps) {
  const {
    isSidebarOpen,
    setSidebarOpen,
    selectedEvent,
    setSelectedEvent,
    clusterFilter,
    setClusterFilter,
    eventTypeFilter,
    setEventTypeFilter,
  } = useMapStore();
  const [isOverviewOpen, setIsOverviewOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  // ── Responsive Detection ───────────────────────────────────────────────────
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const searchParams = useSearchParams();
  const theater = searchParams.get("theater");

  // ── Filtered sidebar events ────────────────────────────────────────────────
  const sidebarEvents = React.useMemo(() => {
    const evts = [...events].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    let filtered = evts;
    if (clusterFilter)
      filtered = filtered.filter((e) => clusterFilter.includes(e.id));
    if (eventTypeFilter) {
      filtered = filtered.filter((e) => {
        const type =
          e.eventType && e.eventType !== "unknown"
            ? e.eventType
            : deriveEventType(e.title);
        return type === eventTypeFilter;
      });
    }
    return filtered;
  }, [events, clusterFilter, eventTypeFilter]);

  // ── Theater summary stats ──────────────────────────────────────────────────
  const theaterStats = React.useMemo(() => {
    if (!theater || !events.length) return null;
    const stats = {
      total: 0,
      critical: 0,
      types: {} as Record<string, number>,
    };
    events.forEach((e) => {
      stats.total++;
      if (e.severity === "critical") stats.critical++;
      const type = deriveEventType(e.title);
      stats.types[type] = (stats.types[type] || 0) + 1;
    });
    return stats;
  }, [events, theater]);

  // ── Group events by date label ─────────────────────────────────────────────
  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, MapEvent[]> = {};
    sidebarEvents.forEach((item) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [sidebarEvents]);

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <motion.div
          initial={isMobile ? { y: "100%" } : { x: "-100%" }}
          animate={isMobile ? { y: 0 } : { x: 0 }}
          exit={isMobile ? { y: "100%" } : { x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          drag={isMobile ? "y" : false}
          dragConstraints={{ top: 0, bottom: 500 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (isMobile && info.offset.y > 150) setSidebarOpen(false);
          }}
          className={cn(
            "bg-background/80 backdrop-blur-xl border-border/50 flex flex-col z-[70] shadow-2xl",
            isMobile 
              ? "fixed bottom-0 left-0 right-0 h-[75vh] rounded-t-[2.5rem] border-t" 
              : "h-full lg:relative border-r w-[380px]"
          )}
        >
          {/* Mobile Drag Handle */}
          {isMobile && (
            <div className="w-full flex justify-center py-4 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
            </div>
          )}
          
          <div className={cn("flex flex-col h-full overflow-hidden", isMobile ? "px-6 pb-6" : "p-6")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
              {clusterFilter
                ? `Cluster Sync (${clusterFilter.length})`
                : "Live Events Feed"}
            </h3>
          </div>
          {isLoading ? (
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-muted-foreground/30" />
          )}
        </div>

        {/* Active Cluster Filter Banner */}
        {clusterFilter && (
          <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                {clusterFilter.length} events in cluster
              </span>
            </div>
            <button
              onClick={() => setClusterFilter(null)}
              className="hover:text-orange-300 transition-colors"
              title="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Event Type Filter Banner */}
        {eventTypeFilter && !theaterStats && !clusterFilter && (
          <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                Filtered: {eventTypeFilter.replace("_", " ")}
              </span>
            </div>
            <button
              onClick={() => setEventTypeFilter(null)}
              className="hover:text-primary/70 transition-colors"
              title="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Theater Overview */}
        {theaterStats && !clusterFilter && (
          <div className="mb-6 space-y-4 border-b border-white/5 pb-6">
            <button
              onClick={() => setIsOverviewOpen(!isOverviewOpen)}
              className="flex items-center justify-between w-full group/ov"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/90 group-hover/ov:text-primary transition-colors">
                  Theater Overview
                </span>
                <ChevronRight className={cn("w-3 h-3 text-white/20 transition-transform duration-300", isOverviewOpen && "rotate-90")} />
              </div>
              <span className="text-[10px] uppercase font-black text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 shadow-lg shadow-rose-500/5">
                {theaterStats.critical} CRITICAL
              </span>
            </button>

            {isOverviewOpen && (
              <div className="grid grid-cols-3 gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
              {Object.entries(EVENT_TYPE_LABELS).map(([type, { label }]) => {
                const Icon = ICON_MAPPING[type] || Activity;
                const count = theaterStats?.types[type] || 0;
                if (count === 0 && eventTypeFilter !== type) return null;
                return (
                  <button
                    key={type}
                    onClick={() =>
                      setEventTypeFilter(eventTypeFilter === type ? null : type)
                    }
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-[9.5px] font-black uppercase tracking-tighter",
                      eventTypeFilter === type
                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.05] z-10"
                        : "bg-secondary/20 border-border/10 text-muted-foreground hover:bg-secondary/40 hover:border-border/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 mb-1.5",
                        eventTypeFilter === type
                          ? "text-primary-foreground"
                          : "text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                      )}
                    />
                    <span className="truncate w-full text-center">{label}</span>
                    <span className="text-[10px] font-bold bg-background/50 px-1.5 py-0.5 rounded-full mt-1.5 min-w-[20px]">
                      {count}
                    </span>
                  </button>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* Event Feed */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
          {sidebarEvents.length > 0 ? (
            Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date} className="space-y-3">
                <div className="sticky top-0 bg-background/80 backdrop-blur-xl py-3 z-10 flex items-center gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-foreground/90">
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-border/20" />
                </div>
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "p-4 rounded-2xl bg-secondary/20 border border-border/20 hover:bg-secondary/40 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] group relative font-sans",
                      selectedEvent?.id === e.id &&
                        "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5"
                    )}
                    onClick={() => setSelectedEvent(e)}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            e.severity === "critical"
                              ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                              : e.severity === "high"
                              ? "bg-orange-500"
                              : "bg-primary"
                          )}
                        />
                        <span className="text-xs font-semibold truncate tracking-tight font-display">
                          {e.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            mapRef.current?.panTo([e.lng, e.lat]);
                          }}
                          title="Locate on map"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-primary"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                         <span className="text-[10px] font-bold text-primary tabular-nums flex-shrink-0 uppercase tracking-wider">
                          {formatTime(e.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed mb-3">
                      {e.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {e.sourceUrl ? (
                        <a
                          href={e.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(ev) => ev.stopPropagation()}
                          className="text-[11px] font-semibold text-primary/70 flex items-center gap-1 hover:text-primary transition-colors hover:underline underline-offset-2"
                        >
                          <Globe className="w-2.5 h-2.5" />
                          {e.sourceUrl.includes("t.me")
                            ? "TELEGRAM"
                            : "INTEL SOURCE"}
                          <ExternalLink className="w-2 h-2" />
                        </a>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-1.5">
                        {e.imageUrl && (
                          <Camera className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                        )}
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
              <Activity className="w-12 h-12 mb-4 animate-pulse" />
              <p className="text-xs font-medium uppercase tracking-wide">
                {fetchError
                  ? `Error: ${fetchError.message}`
                  : "Scanning Viewport..."}
              </p>
            </div>
          )}
        </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
