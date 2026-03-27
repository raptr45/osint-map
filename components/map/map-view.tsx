"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  ExternalLink,
  Filter,
  Globe,
  Loader2,
  Maximize2,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import Map, {
  FullscreenControl,
  GeolocateControl,
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import useSWR from "swr";
import type { GeoJSONSource, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";

// Enable proper Arabic/Hebrew/RTL text rendering on the map
if (typeof window !== "undefined") {
  try {
    maplibregl.setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
      false
    );
  } catch { /* RTL plugin already loaded on hot-reload, safe to ignore */ }
}

const SCROLLBAR_STYLES = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--primary) / 0.15); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.3); }
  .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
  .maplibregl-popup-tip { display: none !important; }
`;

const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/bright";
const MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch");
    return data;
  });

interface MapEvent {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  lng: number;
  lat: number;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
}

interface MapViewProps {
  role: string;
}

// ─── Layer Paint Configs ──────────────────────────────────────────────────────
const SEVERITY_COLOR_EXPR = [
  "match",
  ["get", "severity"],
  "critical", "#ef4444",
  "high",     "#f97316",
  "medium",   "#eab308",
  /* default */ "#3b82f6",
] as maplibregl.ExpressionSpecification;

const clusterLayer: maplibregl.LayerSpecification = {
  id: "clusters",
  type: "circle",
  source: "events",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step", ["get", "point_count"],
      "#6366f1", 5, "#f97316", 20, "#ef4444",
    ],
    "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 30, 36],
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.2)",
    "circle-opacity": 0.92,
  },
};

const clusterCountLayer: maplibregl.LayerSpecification = {
  id: "cluster-count",
  type: "symbol",
  source: "events",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-size": 13,
  },
  paint: { "text-color": "#ffffff" },
};

const unclusteredLayer: maplibregl.LayerSpecification = {
  id: "unclustered-point",
  type: "circle",
  source: "events",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": SEVERITY_COLOR_EXPR,
    "circle-radius": 10,
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.6)",
    "circle-opacity": 0.95,
  },
};

const unclusteredPulseLayer: maplibregl.LayerSpecification = {
  id: "unclustered-pulse",
  type: "circle",
  source: "events",
  filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "severity"], "critical"]],
  paint: {
    "circle-color": "#ef4444",
    "circle-radius": 18,
    "circle-opacity": 0.25,
    "circle-stroke-width": 0,
  },
};
// ──────────────────────────────────────────────────────────────────────────────

export function MapView({ role }: MapViewProps) {
  const canEdit = ["owner", "admin", "moderator"].includes(role);
  const canDelete = ["owner", "admin"].includes(role);

  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const mapRef = React.useRef<MapRef>(null);

  const [bbox, setBbox] = React.useState<number[] | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<MapEvent | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const [tempPos, setTempPos] = React.useState<{ lng: number; lat: number } | null>(null);
  // Cluster filter: list of event IDs visible in the clicked cluster
  const [clusterFilter, setClusterFilter] = React.useState<string[] | null>(null);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hours = searchParams.get("hours");
  const region = searchParams.get("region");
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  React.useEffect(() => {
    if (region && region !== "global" && mapRef.current) {
      const [lng, lat, zoom] = region.split(",").map(parseFloat);
      mapRef.current.flyTo({ center: [lng, lat], zoom: zoom || 5, duration: 2000 });
    }
  }, [region]);

  const { data: events, isLoading, error: fetchError, mutate } = useSWR<MapEvent[]>(
    bbox
      ? `/api/events?minLng=${bbox[0]}&minLat=${bbox[1]}&maxLng=${bbox[2]}&maxLat=${bbox[3]}${
          dateFrom && dateTo ? `&from=${dateFrom}&to=${dateTo}` : `&hours=${hours || "24"}`
        }${region ? `&region=${region}` : ""}`
      : null,
    fetcher,
    {
      refreshInterval: dateFrom && dateTo ? 0 : 10000,
      keepPreviousData: true, // ← keeps old markers visible while new data loads
    }
  );

  // Debounced bbox update with 20% buffer padding
  const updateBbox = React.useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      const bounds = mapRef.current.getBounds();
      const w = bounds.getWest(), e = bounds.getEast();
      const s = bounds.getSouth(), n = bounds.getNorth();
      const lngBuffer = (e - w) * 0.2;
      const latBuffer = (n - s) * 0.2;
      setBbox([w - lngBuffer, s - latBuffer, e + lngBuffer, n + latBuffer]);
    }, 300);
  }, []);

  // Convert events to GeoJSON
  const geojson: GeoJSON.FeatureCollection = React.useMemo(() => ({
    type: "FeatureCollection",
    features: (events ?? []).map((evt) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [evt.lng, evt.lat] },
      properties: { ...evt },
    })),
  }), [events]);

  // Events visible in sidebar (respects cluster filter)
  const sidebarEvents = React.useMemo(() => {
    if (!clusterFilter) return events ?? [];
    return (events ?? []).filter((e) => clusterFilter.includes(e.id));
  }, [events, clusterFilter]);

  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, MapEvent[]> = {};
    sidebarEvents.forEach((item) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [sidebarEvents]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const mapStyle = theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  // ─── Map click handlers ────────────────────────────────────────────────────
  const handleClusterClick = React.useCallback((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const feature = e.features?.[0];
    if (!feature || !mapRef.current) return;
    const map = mapRef.current.getMap();
    const source = map.getSource("events") as GeoJSONSource & {
      getClusterLeaves: (id: number, limit: number, offset: number, cb: (err: Error | null, features: MapGeoJSONFeature[]) => void) => void;
    };
    const clusterId = feature.properties?.cluster_id as number;
    const count = feature.properties?.point_count as number;
    source.getClusterLeaves(clusterId, Math.min(count, 200), 0, (err, leaves) => {
      if (err || !leaves) return;
      const ids = leaves.map((f) => f.properties?.id as string).filter(Boolean);
      setClusterFilter(ids);
      setSelectedEvent(null);
      setIsSidebarOpen(true); // ensure sidebar is open
    });
  }, []);

  const handleMarkerClick = React.useCallback((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const props = feature.properties as MapEvent & { id: string };
    // Find the full event object from our data array
    const evt = events?.find((ev) => ev.id === props.id);
    if (evt) {
      setClusterFilter(null);
      setSelectedEvent(evt);
    }
  }, [events]);

  // Single unified map click handler — e.features is populated by interactiveLayerIds
  const handleMapClick = React.useCallback((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const features = e.features ?? [];
    if (!features.length) {
      // Clicked blank map — clear everything
      setClusterFilter(null);
      setSelectedEvent(null);
      return;
    }
    const feature = features[0];
    if (feature.properties?.cluster_id) {
      // Cluster click
      handleClusterClick({ ...e, features } as MapMouseEvent & { features: MapGeoJSONFeature[] });
    } else {
      // Individual marker click
      handleMarkerClick({ ...e, features } as MapMouseEvent & { features: MapGeoJSONFeature[] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden rounded-3xl border border-border/50 shadow-2xl flex">
      <style dangerouslySetInnerHTML={{ __html: SCROLLBAR_STYLES }} />

      {/* Sidebar Feed */}
      <div
        className={cn(
          "h-full bg-background/80 backdrop-blur-xl border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out z-20",
          isSidebarOpen ? "w-[380px]" : "w-0 p-0 overflow-hidden border-none"
        )}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight font-display">System Feed</h3>
                <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wide leading-none font-sans">
                  Intelligence Stream
                </p>
              </div>
            </div>
            {isLoading && <Zap className="w-4 h-4 text-primary animate-pulse" />}
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

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {/* Live indicator */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-primary/70 bg-primary/5 p-3 rounded-xl border border-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {clusterFilter ? `CLUSTER — ${clusterFilter.length} SIGNALS` : "GLOBAL REPOSITORY SYNC ACTIVE"}
            </div>

            {sidebarEvents.length > 0 ? (
              Object.entries(groupedEvents).map(([date, dayEvents]) => (
                <div key={date} className="space-y-3">
                  <div className="sticky top-0 bg-background/40 backdrop-blur-md py-1 z-10 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                      {date}
                    </span>
                    <div className="h-px flex-1 bg-border/30" />
                  </div>
                  {dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        "p-4 rounded-2xl bg-secondary/20 border border-border/20 hover:bg-secondary/40 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] group relative font-sans",
                        selectedEvent?.id === e.id && "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5"
                      )}
                      onClick={() => setSelectedEvent(e)}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              e.severity === "critical" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                              e.severity === "high" ? "bg-orange-500" : "bg-primary"
                            )}
                          />
                          <span className="text-xs font-semibold truncate tracking-tight font-display">{e.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Locate button — flies to marker without changing zoom */}
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
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums flex-shrink-0">
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
                            {e.sourceUrl.includes("t.me") ? "TELEGRAM" : "INTEL SOURCE"}
                            <ExternalLink className="w-2 h-2" />
                          </a>
                        ) : <span />}
                        <div className="flex items-center gap-1.5">
                          {e.imageUrl && <Camera className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />}
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
                  {fetchError ? `Error: ${fetchError.message}` : "Scanning Viewport..."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-1/2 -translate-y-1/2 z-30 h-16 w-4 bg-background/80 backdrop-blur-xl border border-l-0 border-border/50 rounded-r-xl flex items-center justify-center hover:bg-secondary cursor-pointer transition-all shadow-xl"
        style={{ left: isSidebarOpen ? "380px" : "0" }}
      >
        <ChevronRight className={cn("w-3 h-3 transition-transform", isSidebarOpen && "rotate-180")} />
      </button>

      {/* Map Area */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          initialViewState={{ longitude: 31.1656, latitude: 48.3794, zoom: 5 }}
          onLoad={updateBbox}
          onMoveEnd={updateBbox}
          onClick={handleMapClick}
          mapStyle={mapStyle}
          style={{ width: "100%", height: "100%" }}
          interactiveLayerIds={["clusters", "unclustered-point"]}
          onMouseEnter={(e) => {
            if ((e.features?.length ?? 0) > 0) {
              const canvas = mapRef.current?.getMap().getCanvas();
              if (canvas) canvas.style.cursor = "pointer";
            }
          }}
          onMouseLeave={() => {
            const canvas = mapRef.current?.getMap().getCanvas();
            if (canvas) canvas.style.cursor = "";
          }}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          <GeolocateControl position="top-right" />
          <ScaleControl position="bottom-left" />

          {/* ─── GeoJSON Source + Layers ─── */}
          <Source
            id="events"
            type="geojson"
            data={geojson}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredPulseLayer} />
            <Layer {...unclusteredLayer} />
          </Source>

          {/* Popup for selected event */}
          {selectedEvent && (
            <Popup
              longitude={selectedEvent.lng}
              latitude={selectedEvent.lat}
              anchor="top"
              onClose={() => setSelectedEvent(null)}
              className="z-50"
              closeButton={false}
              offset={10}
            >
              <PopupContent
                event={selectedEvent}
                canEdit={canEdit}
                canDelete={canDelete}
                isEditing={isEditing}
                onLightbox={setLightboxUrl}
                onToggleEdit={(val) => { setIsEditing(val); setTempPos(null); }}
                onDelete={async (id) => {
                  await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
                  mutate();
                  setSelectedEvent(null);
                  setIsEditing(false);
                }}
                onUpdate={async (id, data) => {
                  const finalData = tempPos ? { ...data, lng: tempPos.lng, lat: tempPos.lat } : data;
                  await fetch(`/api/admin/events/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(finalData),
                  });
                  mutate();
                  setIsEditing(false);
                  setTempPos(null);
                  if (selectedEvent) setSelectedEvent({ ...selectedEvent, ...data, ...(tempPos || {}) } as MapEvent);
                }}
              />
            </Popup>
          )}
        </Map>

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
            onClick={() => setLightboxUrl(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Intel Visual"
              className="max-w-[90%] max-h-[90%] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PopupContent (unchanged) ─────────────────────────────────────────────────
function PopupContent({
  event, canEdit, canDelete, isEditing, onToggleEdit, onDelete, onUpdate, onLightbox,
}: {
  event: MapEvent;
  canEdit: boolean;
  canDelete: boolean;
  isEditing: boolean;
  onToggleEdit: (val: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<MapEvent>) => Promise<void>;
  onLightbox: (url: string) => void;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [title, setTitle] = React.useState(event.title);
  const [desc, setDesc] = React.useState(event.description);
  const [severity, setSeverity] = React.useState(event.severity);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isEditing) {
    return (
      <div className="p-4 w-[280px] bg-card/95 backdrop-blur-2xl text-card-foreground border border-border/40 shadow-2xl rounded-2xl font-sans space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Title</label>
          <input className="w-full bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Description</label>
          <textarea className="w-full bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 text-xs min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all leading-relaxed" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Severity</label>
          <div className="flex gap-1.5">
            {(["low", "medium", "high", "critical"] as const).map((s) => (
              <button key={s} onClick={() => setSeverity(s)}
                className={cn("flex-1 py-1 rounded-md text-[11px] font-semibold uppercase transition-all border",
                  severity === s ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                )}
              >{s}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-lg gap-2 text-[11px] font-semibold uppercase" onClick={() => onToggleEdit(false)} disabled={isSaving}>
            <X className="w-3 h-3" /> Cancel
          </Button>
          <Button variant="default" size="sm" className="h-9 rounded-lg gap-2 text-[11px] font-semibold uppercase shadow-lg shadow-primary/10 hover:scale-[1.02]" disabled={isSaving}
            onClick={async () => { setIsSaving(true); try { await onUpdate(event.id, { title, description: desc, severity }); } finally { setIsSaving(false); } }}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] bg-card/95 backdrop-blur-2xl text-card-foreground shadow-[0_24px_64px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden font-sans border border-white/5 animate-in fade-in zoom-in-95 duration-200">
      {event.imageUrl && !imageError && (
        <div className="relative cursor-zoom-in group overflow-hidden" onClick={() => onLightbox(event.imageUrl!)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.imageUrl} alt={event.title} onError={() => setImageError(true)} className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3 h-3" />
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider font-display flex-shrink-0",
              event.severity === "critical" ? "bg-red-500/15 text-red-500 border border-red-500/20" :
              event.severity === "high" ? "bg-orange-500/15 text-orange-500 border border-orange-500/20" :
              event.severity === "medium" ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/20" :
              "bg-blue-500/15 text-blue-400 border border-blue-500/20"
            )}>{event.severity}</div>
            {event.sourceUrl && (
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-medium text-muted-foreground/60 hover:text-primary flex items-center gap-1 truncate transition-colors">
                {event.sourceUrl.includes("t.me") ? <><Globe className="w-2.5 h-2.5 flex-shrink-0" /> TG<ExternalLink className="w-2 h-2 flex-shrink-0" /></> : <><Globe className="w-2.5 h-2.5 flex-shrink-0" /> SOURCE<ExternalLink className="w-2 h-2 flex-shrink-0" /></>}
              </a>
            )}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground/50 tabular-nums flex-shrink-0">{formatTime(event.createdAt)}</span>
        </div>
        <h4 className="font-bold text-sm leading-snug tracking-tight font-display">{event.title}</h4>
        <p className="text-[11px] text-muted-foreground/80 line-clamp-3 leading-relaxed">{event.description}</p>
        {event.sourceUrl && (
          <Button asChild size="sm" variant="outline" className="w-full h-8 text-[11px] font-semibold gap-1.5 border-border/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all">
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              {event.sourceUrl.includes("t.me") ? "OPEN ON TELEGRAM" : "VIEW INTEL SOURCE"}
            </a>
          </Button>
        )}
        {canEdit && (
          <div className="pt-2 border-t border-border/20">
            {showDeleteConfirm && canDelete ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[11px] font-semibold text-destructive uppercase text-center tracking-wide">Confirm Deletion?</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-[11px] font-semibold uppercase" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</Button>
                  <Button variant="destructive" size="sm" className="flex-1 h-8 rounded-lg text-[11px] font-semibold uppercase" disabled={isDeleting}
                    onClick={async () => { setIsDeleting(true); await onDelete(event.id); setIsDeleting(false); }}>
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {canDelete && (
                  <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg gap-1.5 text-[11px] font-semibold uppercase hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                )}
                <Button variant="outline" size="sm" className={cn("h-8 rounded-lg gap-1.5 text-[11px] font-semibold uppercase hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all", canDelete ? "flex-1" : "w-full")} onClick={() => onToggleEdit(true)}>
                  <Edit3 className="w-3 h-3" /> Edit
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
