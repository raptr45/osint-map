"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Bomb,
  Camera,
  Check,
  ChevronRight,
  Cross,
  Crosshair,
  Dam,
  Edit3,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  Loader2,
  Maximize2,
  Mic2,
  Orbit,
  Radio,
  Rocket,
  Shield,
  ShieldAlert,
  Ship,
  Skull,
  Target,
  Trash2,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  GeoJSONSource,
  MapGeoJSONFeature,
  MapMouseEvent,
} from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Map, {
  FullscreenControl,
  GeolocateControl,
  Layer,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import useSWR from "swr";

// Enable proper Arabic/Hebrew/RTL text rendering on the map
if (typeof window !== "undefined") {
  try {
    maplibregl.setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
      false
    );
  } catch {
    /* RTL plugin already loaded on hot-reload, safe to ignore */
  }
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
  eventType?: string;
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
  "critical",
  "#ef4444",
  "high",
  "#f97316",
  "medium",
  "#eab308",
  /* default */ "#3b82f6",
] as maplibregl.ExpressionSpecification;

const clusterLayer: maplibregl.LayerSpecification = {
  id: "clusters",
  type: "circle",
  source: "events",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#6366f1",
      5,
      "#f97316",
      20,
      "#ef4444",
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
    "circle-radius": 18,
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.6)",
    "circle-opacity": 0.95,
  },
};

const unclusteredPulseLayer: maplibregl.LayerSpecification = {
  id: "unclustered-pulse",
  type: "circle",
  source: "events",
  filter: [
    "all",
    ["!", ["has", "point_count"]],
    ["==", ["get", "severity"], "critical"],
  ],
  paint: {
    "circle-color": "#ef4444",
    "circle-radius": 28,
    "circle-opacity": 0.25,
    "circle-stroke-width": 0,
  },
};

const criticalHeatmapLayer: maplibregl.LayerSpecification = {
  id: "critical-heatmap",
  type: "heatmap",
  source: "events",
  filter: ["==", ["get", "severity"], "critical"],
  paint: {
    "heatmap-weight": 1,
    "heatmap-intensity": 1,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(239, 68, 68, 0)",
      0.2,
      "rgba(239, 68, 68, 0.2)",
      0.5,
      "rgba(239, 68, 68, 0.4)",
      1,
      "rgba(239, 68, 68, 0.6)",
    ],
    "heatmap-radius": 40,
  },
};
const ICON_MAPPING: Record<string, LucideIcon> = {
  airstrike: Target,
  explosion: Bomb,
  artillery: Radio,
  missile: Rocket,
  drone: Orbit,
  armor: Shield,
  ground_assault: Crosshair,
  police: ShieldAlert,
  naval: Ship,
  fire: Flame,
  casualties: Skull,
  wmd: AlertTriangle,
  cyber: Radio,
  infrastructure: Dam,
  disaster: Waves,
  political: Mic2,
  protest: Mic2,
  humanitarian: Cross,
  unknown: Activity,
};

// Map icons for non-map UI (Sidebar / Popups)
const EVENT_TYPE_LABELS: Record<string, { label: string }> = {
  airstrike:      { label: "Airstrike" },
  explosion:      { label: "Explosion" },
  artillery:      { label: "Artillery" },
  missile:        { label: "Missile" },
  drone:          { label: "Drone" },
  armor:          { label: "Armor" },
  ground_assault: { label: "Ground" },
  police:         { label: "Police" },
  naval:          { label: "Naval" },
  fire:           { label: "Fire" },
  casualties:     { label: "Casualties" },
  wmd:            { label: "WMD" },
  cyber:          { label: "Cyber" },
  infrastructure: { label: "Infra" },
  disaster:       { label: "Disaster" },
  political:      { label: "Political" },
  protest:        { label: "Protest" },
  humanitarian:   { label: "Aid" },
  unknown:        { label: "Unknown" },
};

/** Derive event type from title keywords (heuristic until schema has explicit type) */
function deriveEventType(title: string): string {
  const t = title.toLowerCase();

  // 1. Most specific high tier first
  if (t.includes("nuke") || t.includes("nuclear") || t.includes("radioactive") || t.includes("chemical weapon") || t.includes("biohazard")) return "wmd";
  if (t.includes("tsunami") || t.includes("earthquake") || t.includes("volcano") || t.includes("flood") || t.includes("disaster")) return "disaster";
  
  if (t.includes("missile") || t.includes("rocket") || t.includes("sam") || t.includes("air defense") || t.includes("intercepted")) return "missile";
  if (t.includes("drone") || t.includes("uav") || t.includes("shahed") || t.includes("fpv") || t.includes("quadcopter")) return "drone";
  if (t.includes("artillery") || t.includes("shelling") || t.includes("mlrs") || t.includes("mortar")) return "artillery";
  if (t.includes("tank") || t.includes("apc") || t.includes("armored") || t.includes("convoy")) return "armor";
  if (t.includes("airstrike") || t.includes("air strike") || t.includes("aircraft") || t.includes("jet") || t.includes("f-16") || t.includes("f16") || t.includes("bomber") || t.includes("helicopter")) return "airstrike";

  // 2. Medium specificity
  if (t.includes("cyber") || t.includes("hacker") || t.includes("jamming") || t.includes("radar") || t.includes("ddos")) return "cyber";
  if (t.includes("ship") || t.includes("naval") || t.includes("vessel") || t.includes("fleet") || t.includes("submarine") || t.includes("boat")) return "naval";
  if (t.includes("fire") || t.includes("blaze") || t.includes("firebomb")) return "fire";
  if (t.includes("dead") || t.includes("killed") || t.includes("casualt") || t.includes("injur") || t.includes("medic")) return "casualties";
  if (t.includes("infrastructure") || t.includes("bridge") || t.includes("railway") || t.includes("crane") || t.includes("tunnel")) return "infrastructure";

  // 3. General action
  if (t.includes("police") || t.includes("arrest") || t.includes("patrol") || t.includes("cop")) return "police";
  if (t.includes("protest") || t.includes("rally") || t.includes("crowd") || t.includes("riot")) return "protest";
  if (t.includes("assault") || t.includes("infantry") || t.includes("troops") || t.includes("ground") || t.includes("forces") || t.includes("gunfight") || t.includes("clash")) return "ground_assault";
  if (t.includes("explosion") || t.includes("blast") || t.includes("strike") || t.includes("bombed") || t.includes("detonat")) return "explosion";
  
  // 4. Soft topics
  if (t.includes("ceasefire") || t.includes("diplomat") || t.includes("sanction") || t.includes("parliament") || t.includes("treaty") || t.includes("statement") || t.includes("speech")) return "political";
  if (t.includes("aid") || t.includes("civilian") || t.includes("hospital") || t.includes("evacuati") || t.includes("refugee") || t.includes("hostage")) return "humanitarian";

  return "unknown";
}
// ──────────────────────────────────────────────────────────────────────────────

// ─── Country boundary fill layer configs ─────────────────────────────────────
const countryFillLayer: maplibregl.LayerSpecification = {
  id: "theater-fill",
  type: "fill",
  source: "theater-boundary",
  paint: {
    "fill-color": "#6366f1",
    "fill-opacity": 0.08,
  },
};

const countryLineLayer: maplibregl.LayerSpecification = {
  id: "theater-line",
  type: "line",
  source: "theater-boundary",
  paint: {
    "line-color": "#6366f1",
    "line-width": 1.5,
    "line-opacity": 0.5,
    "line-dasharray": [4, 2],
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
  const [selectedEvent, setSelectedEvent] = React.useState<MapEvent | null>(
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const [tempPos, setTempPos] = React.useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [clusterFilter, setClusterFilter] = React.useState<string[] | null>(
    null
  );
  const [eventTypeFilter, setEventTypeFilter] = React.useState<string | null>(
    null
  );
  // Country boundary GeoJSON for the selected theater
  const [theaterGeoJson, setTheaterGeoJson] =
    React.useState<GeoJSON.FeatureCollection | null>(null);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hours = searchParams.get("hours");
  const region = searchParams.get("region");
  const theater = searchParams.get("theater"); // ISO country code e.g. "LB"
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  React.useEffect(() => {
    if (region && region !== "global" && mapRef.current) {
      const [lng, lat, zoom] = region.split(",").map(parseFloat);
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: zoom || 5,
        duration: 2000,
      });
    }
  }, [region]);

  // ── Fetch country boundary when theater changes ───────────────────────────
  React.useEffect(() => {
    setEventTypeFilter(null); // Clear type filter on theater change
    if (!theater) {
      setTheaterGeoJson(null);
      return;
    }
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?country=${theater}&format=geojson&polygon_geojson=1&limit=1`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.features?.length)
          setTheaterGeoJson(data as GeoJSON.FeatureCollection);
      })
      .catch(() => {}); // silently ignore network errors
    return () => controller.abort();
  }, [theater]);
  // ─────────────────────────────────────────────────────────────────────────

  const {
    data: events,
    isLoading,
    error: fetchError,
    mutate,
  } = useSWR<MapEvent[]>(
    bbox
      ? `/api/events?minLng=${bbox[0]}&minLat=${bbox[1]}&maxLng=${
          bbox[2]
        }&maxLat=${bbox[3]}${
          dateFrom && dateTo
            ? `&from=${dateFrom}&to=${dateTo}`
            : `&hours=${hours || "24"}`
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
      const w = bounds.getWest(),
        e = bounds.getEast();
      const s = bounds.getSouth(),
        n = bounds.getNorth();
      const lngBuffer = (e - w) * 0.2;
      const latBuffer = (n - s) * 0.2;
      setBbox([w - lngBuffer, s - latBuffer, e + lngBuffer, n + latBuffer]);
    }, 300);
  }, []);

  // Convert events to GeoJSON — uses stored eventType from DB, falls back to keyword heuristic
  const geojson: GeoJSON.FeatureCollection = React.useMemo(() => {
    const filteredEvents = (events ?? []).filter((evt) => {
      const isEditingThis = isEditing && selectedEvent?.id === evt.id;
      if (isEditingThis) return false;
      const type =
        evt.eventType && evt.eventType !== "unknown"
          ? evt.eventType
          : deriveEventType(evt.title);
      if (eventTypeFilter && type !== eventTypeFilter) return false;
      return true;
    });
    return {
      type: "FeatureCollection",
      features: filteredEvents.map((evt) => {
        const type =
          evt.eventType && evt.eventType !== "unknown"
            ? evt.eventType
            : deriveEventType(evt.title);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [evt.lng, evt.lat] },
            properties: {
              ...evt,
              eventType: type,
              iconName: `icon-${type}`,
            },
        };
      }),
    };
  }, [events, isEditing, selectedEvent, eventTypeFilter]);

  // Events visible in sidebar (respects cluster filter and event type filter)
  const sidebarEvents = React.useMemo(() => {
    let evts = events ?? [];
    if (clusterFilter) {
      evts = evts.filter((e) => clusterFilter.includes(e.id));
    }
    if (eventTypeFilter) {
      evts = evts.filter((e) => {
        const type =
          e.eventType && e.eventType !== "unknown"
            ? e.eventType
            : deriveEventType(e.title);
        return type === eventTypeFilter;
      });
    }
    return evts;
  }, [events, clusterFilter, eventTypeFilter]);

  // Theater summary stats
  const theaterStats = React.useMemo(() => {
    if (!theater || !events) return null;
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

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const mapStyle = theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  // ─── Map click handlers ────────────────────────────────────────────────────
  const handleClusterClick = React.useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const feature = e.features?.[0];
      if (!feature || !mapRef.current) return;

      const map = mapRef.current.getMap();
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number
      ];
      const currentZoom = map.getZoom();
      const fallbackZoom = Math.min(currentZoom + 2.5, 13);

      // Zoom immediately to cluster center with a sane fallback in case the cluster ID
      // is stale (SWR refreshes create new cluster IDs every 10s).
      const source = map.getSource("events") as GeoJSONSource & {
        getClusterExpansionZoom: (
          id: number,
          cb: (err: Error | null, zoom: number) => void
        ) => void;
      };

      const clusterId = feature.properties?.cluster_id as number;
      let resolved = false;

      try {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          resolved = true;
          map.easeTo({
            center: coordinates,
            zoom:
              err || zoom === undefined
                ? fallbackZoom
                : Math.min(zoom + 0.5, 13),
            duration: 600,
          });
        });
      } catch {
        resolved = true;
        map.easeTo({ center: coordinates, zoom: fallbackZoom, duration: 600 });
      }

      // Safety: if callback never fires within 400ms (stale ID edge-case), use fallback
      setTimeout(() => {
        if (!resolved)
          map.easeTo({
            center: coordinates,
            zoom: fallbackZoom,
            duration: 600,
          });
      }, 400);

      // Clear sidebar cluster filter — viewport update will refresh the list naturally
      setClusterFilter(null);
      setSelectedEvent(null);
    },
    []
  );

  const handleMarkerClick = React.useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as MapEvent & { id: string };
      // Find the full event object from our data array
      const evt = events?.find((ev) => ev.id === props.id);
      if (evt) {
        setClusterFilter(null);
        setSelectedEvent(evt);
      }
    },
    [events]
  );

  // Single unified map click handler
  const handleMapClick = React.useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const features = e.features ?? [];
      if (!features.length) {
        setClusterFilter(null);
        setSelectedEvent(null);
        return;
      }
      const feature = features[0];
      if (feature.properties?.cluster_id) {
        handleClusterClick({ ...e, features } as MapMouseEvent & {
          features: MapGeoJSONFeature[];
        });
      } else {
        handleMarkerClick({ ...e, features } as MapMouseEvent & {
          features: MapGeoJSONFeature[];
        });
      }
    },
    [handleClusterClick, handleMarkerClick]
  );

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
          {/* Compact Tactical Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/10">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                {clusterFilter ? `Cluster Sync (${clusterFilter.length})` : "Live Events Feed"}
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

          {/* Active Event Type Filter Banner (if no theater stats) */}
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
            <div className="mb-4 space-y-2 border-b border-border/20 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground font-display">
                  Theater Overview
                </span>
                <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                  {theaterStats.critical} Critical Zones
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(EVENT_TYPE_LABELS).map(([type, { label }]) => {
                  const Icon = ICON_MAPPING[type] || Activity;
                  const count = theaterStats?.types[type] || 0;
                  if (count === 0 && eventTypeFilter !== type) return null;
                  return (
                    <button
                      key={type}
                      onClick={() =>
                        setEventTypeFilter(
                          eventTypeFilter === type ? null : type
                        )
                      }
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-[9.5px] font-black uppercase tracking-tighter",
                        eventTypeFilter === type
                          ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.05] z-10"
                          : "bg-secondary/20 border-border/10 text-muted-foreground hover:bg-secondary/40 hover:border-border/30"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 mb-1.5", eventTypeFilter === type ? "text-primary-foreground" : "text-primary/70")} />
                      <span className="truncate w-full text-center">
                        {label}
                      </span>
                      <span className="text-[10px] font-bold bg-background/50 px-1.5 py-0.5 rounded-full mt-1.5 min-w-[20px]">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {/* Removed bulky live indicator */}

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
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-1/2 -translate-y-1/2 z-30 h-16 w-4 bg-background/80 backdrop-blur-xl border border-l-0 border-border/50 rounded-r-xl flex items-center justify-center hover:bg-secondary cursor-pointer transition-all shadow-xl"
        style={{ left: isSidebarOpen ? "380px" : "0" }}
      >
        <ChevronRight
          className={cn(
            "w-3 h-3 transition-transform",
            isSidebarOpen && "rotate-180"
          )}
        />
      </button>

      {/* Map Area */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          initialViewState={{ longitude: 31.1656, latitude: 48.3794, zoom: 5 }}
          onLoad={(e) => {
            updateBbox();
            const map = e.target;
            
            // Register Lucide icons as map images for the tactical marker layer
            Object.entries(ICON_MAPPING).forEach(([type, Icon]) => {
              const iconName = `icon-${type}`;
              if (!map.hasImage(iconName)) {
                // Convert Lucide React component to raw SVG string
                const svgString = renderToStaticMarkup(
                  <Icon
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );

                const img = new Image();
                img.onload = () => {
                  if (!map.hasImage(iconName)) {
                    map.addImage(iconName, img);
                  }
                };
                // Use a Data URL string to load directly into the MapLibre cache
                img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
              }
            });
          }}
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

          {/* ─── Theater Boundary Overlay ─── */}
          {theaterGeoJson && (
            <Source id="theater-boundary" type="geojson" data={theaterGeoJson}>
              <Layer {...countryFillLayer} />
              <Layer {...countryLineLayer} />
            </Source>
          )}

          {/* ─── GeoJSON Source + Layers ─── */}
          <Source
            id="events"
            type="geojson"
            data={geojson}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...criticalHeatmapLayer} />
            <Layer {...unclusteredPulseLayer} />
            <Layer {...unclusteredLayer} />

            {/* Selected marker — glow ring rendered on top */}
            {selectedEvent && (
              <Layer
                id="selected-glow"
                type="circle"
                source="events"
                filter={["==", ["get", "id"], selectedEvent.id]}
                paint={{
                  "circle-color": "#ffffff",
                  "circle-radius": 30,
                  "circle-opacity": 0.18,
                  "circle-stroke-width": 0,
                }}
              />
            )}
            {selectedEvent && (
              <Layer
                id="selected-ring"
                type="circle"
                source="events"
                filter={["==", ["get", "id"], selectedEvent.id]}
                paint={{
                  "circle-color": "rgba(0,0,0,0)",
                  "circle-radius": 22,
                  "circle-opacity": 0,
                  "circle-stroke-width": 3,
                  "circle-stroke-color": "#ffffff",
                }}
              />
            )}

            {/* Event type icon overlay using registered images */}
            <Layer
              id="unclustered-icon"
              type="symbol"
              source="events"
              filter={["!", ["has", "point_count"]]}
              layout={
                {
                  "icon-image": ["get", "iconName"],
                  "icon-size": 0.45, // Adjusted to fit inside circle markers
                  "icon-allow-overlap": true,
                  "icon-ignore-placement": true,
                  "icon-anchor": "center",
                } as maplibregl.SymbolLayerSpecification["layout"]
              }
            />
          </Source>

          {/* Active Edit Marker (Hybrid Approach) */}
          {isEditing && selectedEvent && (
            <Marker
              longitude={tempPos?.lng ?? selectedEvent.lng}
              latitude={tempPos?.lat ?? selectedEvent.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => {
                setTempPos({ lng: e.lngLat.lng, lat: e.lngLat.lat });
              }}
            >
              <div className="relative group cursor-move">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground text-[8px] font-bold px-2 py-1 rounded shadow-xl animate-bounce">
                  DRAG TO RE-POSITION
                </div>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 border-background shadow-lg ring-4 ring-primary/40 scale-110",
                    selectedEvent.severity === "critical"
                      ? "bg-red-600 shadow-xl shadow-red-600/20"
                      : selectedEvent.severity === "high"
                      ? "bg-orange-500"
                      : selectedEvent.severity === "medium"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  )}
                >
                  <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </Marker>
          )}

          {/* Popup for selected event */}
          {selectedEvent && (
            <Popup
              longitude={tempPos?.lng ?? selectedEvent.lng}
              latitude={tempPos?.lat ?? selectedEvent.lat}
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
                onToggleEdit={(val) => {
                  setIsEditing(val);
                  setTempPos(null);
                }}
                onDelete={async (id) => {
                  await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
                  mutate();
                  setSelectedEvent(null);
                  setIsEditing(false);
                }}
                onUpdate={async (id, data) => {
                  const finalData = tempPos
                    ? { ...data, lng: tempPos.lng, lat: tempPos.lat }
                    : data;
                  await fetch(`/api/admin/events/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(finalData),
                  });
                  mutate();
                  setIsEditing(false);
                  setTempPos(null);
                  if (selectedEvent)
                    setSelectedEvent({
                      ...selectedEvent,
                      ...data,
                      ...(tempPos || {}),
                    } as MapEvent);
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
  event,
  canEdit,
  canDelete,
  isEditing,
  onToggleEdit,
  onDelete,
  onUpdate,
  onLightbox,
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
  const [expandedType, setExpandedType] = React.useState(false);
  const [title, setTitle] = React.useState(event.title);
  const [desc, setDesc] = React.useState(event.description);
  const [severity, setSeverity] = React.useState(event.severity);
  const [eventType, setEventType] = React.useState(() =>
    event.eventType && event.eventType !== "unknown"
      ? event.eventType
      : deriveEventType(event.title)
  );

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (isEditing) {
    return (
      <div className="p-4 w-[280px] bg-card/95 backdrop-blur-2xl text-card-foreground border border-border/40 shadow-2xl rounded-2xl font-sans space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">
            Title
          </label>
          <input
            className="w-full bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">
            Description
          </label>
          <textarea
            className="w-full bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 text-xs min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all leading-relaxed"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">
            Severity
          </label>
          <div className="flex gap-1.5">
            {(["low", "medium", "high", "critical"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={cn(
                  "flex-1 py-1 rounded-md text-[11px] font-semibold uppercase transition-all border",
                  severity === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div 
            className="flex items-center justify-between cursor-pointer group px-1"
            onClick={() => setExpandedType(!expandedType)}
          >
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest cursor-pointer group-hover:text-foreground transition-colors">
              Event Type
            </label>
            <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform", expandedType && "rotate-90")} />
          </div>
          
          {!expandedType ? (
            <button
              onClick={() => setExpandedType(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all text-[11px] font-semibold uppercase"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const CurrentIcon = ICON_MAPPING[eventType] || Activity;
                  return <CurrentIcon className="w-4 h-4 text-primary" />;
                })()}
                <span>{EVENT_TYPE_LABELS[eventType]?.label || "Select Type"}</span>
              </div>
              <span className="text-[10px] text-muted-foreground opacity-60">Change</span>
            </button>
          ) : (
            <div className="flex gap-1 flex-wrap">
              {Object.entries(EVENT_TYPE_LABELS).map(([type, { label }]) => {
                const Icon = ICON_MAPPING[type] || Activity;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setEventType(type);
                      setExpandedType(false);
                    }}
                    title={label}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border transition-all",
                      eventType === type
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg gap-2 text-[11px] font-semibold uppercase"
            onClick={() => onToggleEdit(false)}
            disabled={isSaving}
          >
            <X className="w-3 h-3" /> Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-9 rounded-lg gap-2 text-[11px] font-semibold uppercase shadow-lg shadow-primary/10 hover:scale-[1.02]"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onUpdate(event.id, {
                  title,
                  description: desc,
                  severity,
                  eventType,
                });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}{" "}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] bg-card/95 backdrop-blur-2xl text-card-foreground shadow-[0_24px_64px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden font-sans border border-white/5 animate-in fade-in zoom-in-95 duration-200">
      {event.imageUrl && !imageError && (
        <div
          className="relative cursor-zoom-in group overflow-hidden"
          onClick={() => onLightbox(event.imageUrl!)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={event.title}
            onError={() => setImageError(true)}
            className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3 h-3" />
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider font-display flex-shrink-0",
                event.severity === "critical"
                  ? "bg-red-500/15 text-red-500 border border-red-500/20"
                  : event.severity === "high"
                  ? "bg-orange-500/15 text-orange-500 border border-orange-500/20"
                  : event.severity === "medium"
                  ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/20"
                  : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
              )}
            >
              {event.severity}
            </div>
            {event.sourceUrl && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-medium text-muted-foreground/60 hover:text-primary flex items-center gap-1 truncate transition-colors"
              >
                {event.sourceUrl.includes("t.me") ? (
                  <>
                    <Globe className="w-2.5 h-2.5 flex-shrink-0" /> TG
                    <ExternalLink className="w-2 h-2 flex-shrink-0" />
                  </>
                ) : (
                  <>
                    <Globe className="w-2.5 h-2.5 flex-shrink-0" /> SOURCE
                    <ExternalLink className="w-2 h-2 flex-shrink-0" />
                  </>
                )}
              </a>
            )}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground/50 tabular-nums flex-shrink-0">
            {formatTime(event.createdAt)}
          </span>
        </div>
        <h4 className="font-bold text-sm leading-snug tracking-tight font-display">
          {event.title}
        </h4>
        <p className="text-[11px] text-muted-foreground/80 line-clamp-3 leading-relaxed">
          {event.description}
        </p>
        {event.sourceUrl && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-full h-8 text-[11px] font-semibold gap-1.5 border-border/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
          >
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              {event.sourceUrl.includes("t.me")
                ? "OPEN ON TELEGRAM"
                : "VIEW INTEL SOURCE"}
            </a>
          </Button>
        )}
        {canEdit && (
          <div className="pt-2 border-t border-border/20">
            {showDeleteConfirm && canDelete ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[11px] font-semibold text-destructive uppercase text-center tracking-wide">
                  Confirm Deletion?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 rounded-lg text-[11px] font-semibold uppercase"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 h-8 rounded-lg text-[11px] font-semibold uppercase"
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      await onDelete(event.id);
                      setIsDeleting(false);
                    }}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}{" "}
                    Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 rounded-lg gap-1.5 text-[11px] font-semibold uppercase hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 rounded-lg gap-1.5 text-[11px] font-semibold uppercase hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all",
                    canDelete ? "flex-1" : "w-full"
                  )}
                  onClick={() => onToggleEdit(true)}
                >
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
