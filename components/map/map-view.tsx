"use client";

import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

import { MapPopup } from "@/components/map/map-popup";
import { MapSidebar } from "@/components/map/map-sidebar";
import { ICON_MAPPING, MAP_STYLE_DARK, MAP_STYLE_LIGHT } from "@/lib/constants";
import { useMapEvents } from "@/lib/queries/events";
import type { MapEvent } from "@/lib/schemas";
import { useMapStore } from "@/lib/stores/map-store";

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

// ─── Layer Paint Configs ───────────────────────────────────────────────────────
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

const countryFillLayer: maplibregl.LayerSpecification = {
  id: "theater-fill",
  type: "fill",
  source: "theater-boundary",
  paint: { "fill-color": "#6366f1", "fill-opacity": 0.08 },
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

/** Derives event type from title keywords (heuristic for DB rows without an explicit type) */
export function deriveEventType(title: string): string {
  const t = title.toLowerCase();
  if (
    t.includes("nuke") ||
    t.includes("nuclear") ||
    t.includes("radioactive") ||
    t.includes("chemical weapon") ||
    t.includes("biohazard")
  )
    return "wmd";
  if (
    t.includes("tsunami") ||
    t.includes("earthquake") ||
    t.includes("volcano") ||
    t.includes("flood") ||
    t.includes("disaster")
  )
    return "disaster";
  if (
    t.includes("missile") ||
    t.includes("rocket") ||
    t.includes("sam") ||
    t.includes("air defense") ||
    t.includes("intercepted")
  )
    return "missile";
  if (
    t.includes("drone") ||
    t.includes("uav") ||
    t.includes("shahed") ||
    t.includes("fpv") ||
    t.includes("quadcopter")
  )
    return "drone";
  if (
    t.includes("artillery") ||
    t.includes("shelling") ||
    t.includes("mlrs") ||
    t.includes("mortar")
  )
    return "artillery";
  if (
    t.includes("tank") ||
    t.includes("apc") ||
    t.includes("armored") ||
    t.includes("convoy")
  )
    return "armor";
  if (
    t.includes("airstrike") ||
    t.includes("air strike") ||
    t.includes("aircraft") ||
    t.includes("jet") ||
    t.includes("f-16") ||
    t.includes("f16") ||
    t.includes("bomber") ||
    t.includes("helicopter")
  )
    return "airstrike";
  if (
    t.includes("cyber") ||
    t.includes("hacker") ||
    t.includes("jamming") ||
    t.includes("radar") ||
    t.includes("ddos")
  )
    return "cyber";
  if (
    t.includes("ship") ||
    t.includes("naval") ||
    t.includes("vessel") ||
    t.includes("fleet") ||
    t.includes("submarine") ||
    t.includes("boat")
  )
    return "naval";
  if (t.includes("fire") || t.includes("blaze") || t.includes("firebomb"))
    return "fire";
  if (
    t.includes("dead") ||
    t.includes("killed") ||
    t.includes("casualt") ||
    t.includes("injur") ||
    t.includes("medic")
  )
    return "casualties";
  if (
    t.includes("infrastructure") ||
    t.includes("bridge") ||
    t.includes("railway") ||
    t.includes("crane") ||
    t.includes("tunnel")
  )
    return "infrastructure";
  if (
    t.includes("police") ||
    t.includes("arrest") ||
    t.includes("patrol") ||
    t.includes("cop")
  )
    return "police";
  if (
    t.includes("protest") ||
    t.includes("rally") ||
    t.includes("crowd") ||
    t.includes("riot")
  )
    return "protest";
  if (
    t.includes("assault") ||
    t.includes("infantry") ||
    t.includes("troops") ||
    t.includes("ground") ||
    t.includes("forces") ||
    t.includes("gunfight") ||
    t.includes("clash")
  )
    return "ground_assault";
  if (
    t.includes("explosion") ||
    t.includes("blast") ||
    t.includes("strike") ||
    t.includes("bombed") ||
    t.includes("detonat")
  )
    return "explosion";
  if (
    t.includes("ceasefire") ||
    t.includes("diplomat") ||
    t.includes("sanction") ||
    t.includes("parliament") ||
    t.includes("treaty") ||
    t.includes("statement") ||
    t.includes("speech")
  )
    return "political";
  if (
    t.includes("aid") ||
    t.includes("civilian") ||
    t.includes("hospital") ||
    t.includes("evacuati") ||
    t.includes("refugee") ||
    t.includes("hostage")
  )
    return "humanitarian";
  return "unknown";
}

interface MapViewProps {
  role: string;
}

export function MapView({ role }: MapViewProps) {
  const canEdit = ["owner", "admin", "moderator"].includes(role);
  const canDelete = ["owner", "admin"].includes(role);

  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const mapRef = React.useRef<MapRef>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();

  // ── Zustand store (replaces 12 useState hooks) ───────────────────────────
  const {
    bbox,
    setBbox,
    selectedEvent,
    setSelectedEvent,
    isSidebarOpen,
    toggleSidebar,
    isEditing,
    setIsEditing,
    lightboxUrl,
    setLightboxUrl,
    tempPos,
    setTempPos,
    setClusterFilter,
    eventTypeFilter,
    theaterGeoJson,
    setTheaterGeoJson,
    selectEvent,
    closePopup,
    setSidebarOpen,
  } = useMapStore();

  const [isMobile, setIsMobile] = React.useState(false);

  // ── Responsive Detection ───────────────────────────────────────────────────
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Auto-manage sidebar on mobile ──────────────────────────────────────────
  React.useEffect(() => {
    if (isMobile && selectedEvent) {
      setSidebarOpen(false);
    }
  }, [selectedEvent, isMobile, setSidebarOpen]);

  const hours = searchParams.get("hours");
  const region = searchParams.get("region");
  const theater = searchParams.get("theater");
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  // ── TanStack Query (replaces useSWR) ─────────────────────────────────────
  const {
    data: events,
    isLoading,
    error: fetchError,
  } = useMapEvents(bbox, { hours, dateFrom, dateTo, region });

  // ── Fly to region when URL param changes ─────────────────────────────────
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
      .catch(() => {});
    return () => controller.abort();
  }, [theater, setTheaterGeoJson]);

  // ── Debounced bbox update with 20% buffer padding ─────────────────────────
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
  }, [setBbox]);

  // ── GeoJSON for map — filtered by cluster & event type ────────────────────
  const geojson: GeoJSON.FeatureCollection = React.useMemo(() => {
    const filteredEvents = (events ?? []).filter((evt) => {
      if (isEditing && selectedEvent?.id === evt.id) return false;
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
          properties: { ...evt, eventType: type, iconName: `icon-${type}` },
        };
      }),
    };
  }, [events, isEditing, selectedEvent, eventTypeFilter]);

  // ── Map click handlers ────────────────────────────────────────────────────
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
      setTimeout(() => {
        if (!resolved)
          map.easeTo({
            center: coordinates,
            zoom: fallbackZoom,
            duration: 600,
          });
      }, 400);
      setClusterFilter(null);
      setSelectedEvent(null);
    },
    [setClusterFilter, setSelectedEvent]
  );

  const handleMarkerClick = React.useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as MapEvent & { id: string };
      const evt = events?.find((ev) => ev.id === props.id);
      if (evt) selectEvent(evt);
    },
    [events, selectEvent]
  );

  const handleMapClick = React.useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const features = e.features ?? [];
      if (!features.length) {
        closePopup();
        setClusterFilter(null);
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
    [handleClusterClick, handleMarkerClick, closePopup, setClusterFilter]
  );

  const mapStyle = theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  return (
    <div className="relative w-full h-[calc(100vh-56px)] md:h-[calc(100vh-100px)] overflow-hidden sm:rounded-3xl sm:border border-border/50 shadow-2xl flex">
      <style dangerouslySetInnerHTML={{ __html: SCROLLBAR_STYLES }} />

      {/* Sidebar */}
      <MapSidebar
        events={events ?? []}
        isLoading={isLoading}
        fetchError={fetchError as Error | null}
        mapRef={mapRef}
      />

      {/* Sidebar Toggle - Hidden on mobile, fixed positioning on desktop */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-30 h-16 w-4 bg-background/80 backdrop-blur-xl border border-l-0 border-border/50 rounded-r-xl items-center justify-center hover:bg-secondary cursor-pointer transition-all shadow-xl"
        style={{ left: isSidebarOpen ? "380px" : "0" }}
      >
        <ChevronRight
          className={cn(
            "w-3 h-3 transition-transform",
            isSidebarOpen && "rotate-180"
          )}
        />
      </button>

      {/* Mobile Sidebar Toggle - Visible ONLY on small screens */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="lg:hidden absolute bottom-8 left-6 z-[45] h-14 w-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(var(--primary),0.4)] active:scale-90 transition-all border-2 border-white/20"
        >
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
      )}

      {/* Map Area */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          initialViewState={{ longitude: 31.1656, latitude: 48.3794, zoom: 5 }}
          onLoad={(e) => {
            updateBbox();
            const map = e.target;
            Object.entries(ICON_MAPPING).forEach(([type, Icon]) => {
              const iconName = `icon-${type}`;
              if (!map.hasImage(iconName)) {
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
                  if (!map.hasImage(iconName)) map.addImage(iconName, img);
                };
                img.src =
                  "data:image/svg+xml;charset=utf-8," +
                  encodeURIComponent(svgString);
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

          {/* Theater Boundary Overlay */}
          {theaterGeoJson && (
            <Source id="theater-boundary" type="geojson" data={theaterGeoJson}>
              <Layer {...countryFillLayer} />
              <Layer {...countryLineLayer} />
            </Source>
          )}

          {/* GeoJSON Source + Layers */}
          <Source
            id="events"
            type="geojson"
            data={geojson}
            cluster
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...criticalHeatmapLayer} />
            <Layer {...unclusteredPulseLayer} />
            <Layer {...unclusteredLayer} />

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
            <Layer
              id="unclustered-icon"
              type="symbol"
              source="events"
              filter={["!", ["has", "point_count"]]}
              layout={
                {
                  "icon-image": ["get", "iconName"],
                  "icon-size": 0.45,
                  "icon-allow-overlap": true,
                  "icon-ignore-placement": true,
                  "icon-anchor": "center",
                } as maplibregl.SymbolLayerSpecification["layout"]
              }
            />
          </Source>

          {/* Active Edit Marker */}
          {isEditing && selectedEvent && (
            <Marker
              longitude={tempPos?.lng ?? selectedEvent.lng}
              latitude={tempPos?.lat ?? selectedEvent.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) =>
                setTempPos({ lng: e.lngLat.lng, lat: e.lngLat.lat })
              }
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

          {/* Desktop Popup */}
          {!isMobile && selectedEvent && (
            <Popup
              longitude={tempPos?.lng ?? selectedEvent.lng}
              latitude={tempPos?.lat ?? selectedEvent.lat}
              anchor="top"
              onClose={closePopup}
              className="z-50"
              closeButton={false}
              offset={10}
            >
              <MapPopup
                event={selectedEvent}
                canEdit={canEdit}
                canDelete={canDelete}
                isEditing={isEditing}
                onLightbox={setLightboxUrl}
                onToggleEdit={(val: boolean) => {
                  setIsEditing(val);
                  setTempPos(null);
                }}
                onDelete={async (id: string) => {
                  await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
                  qc.invalidateQueries({ queryKey: ["map-events"] });
                  closePopup();
                }}
                onUpdate={async (id: string, data: Partial<MapEvent>) => {
                  const finalData = tempPos
                    ? { ...data, lng: tempPos.lng, lat: tempPos.lat }
                    : data;
                  await fetch(`/api/admin/events/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(finalData),
                  });
                  qc.invalidateQueries({ queryKey: ["map-events"] });
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

        {/* Mobile Detail Sheet */}
        <AnimatePresence>
          {isMobile && selectedEvent && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePopup}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
              />
              
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 500 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 150) closePopup();
                }}
                className="fixed bottom-0 left-0 right-0 z-[90] bg-card/95 backdrop-blur-2xl border-t border-border/50 rounded-t-[2.5rem] shadow-[0_-8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                {/* Drag Handle */}
                <div className="w-full flex justify-center py-4 shrink-0">
                  <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
                </div>
                
                <div className="px-1 py-1 max-h-[85vh] overflow-y-auto custom-scrollbar">
                  <MapPopup
                    event={selectedEvent}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isEditing={isEditing}
                    onLightbox={setLightboxUrl}
                    onToggleEdit={(val: boolean) => {
                      setIsEditing(val);
                      setTempPos(null);
                    }}
                    onDelete={async (id: string) => {
                      await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
                      qc.invalidateQueries({ queryKey: ["map-events"] });
                      closePopup();
                    }}
                    onUpdate={async (id: string, data: Partial<MapEvent>) => {
                      const finalData = tempPos
                        ? { ...data, lng: tempPos.lng, lat: tempPos.lat }
                        : data;
                      await fetch(`/api/admin/events/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(finalData),
                      });
                      qc.invalidateQueries({ queryKey: ["map-events"] });
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
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
