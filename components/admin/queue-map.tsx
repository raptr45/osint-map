import * as React from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import Map, {
  Marker,
  NavigationControl,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { useQueueStore } from "@/lib/stores/queue-store";
import type { PendingEvent, PublishedEvent } from "@/lib/schemas";

interface QueueMapProps {
  activeTab: "pending" | "published";
  selectedPending: PendingEvent | null;
  selectedPublished: PublishedEvent | null;
  mapRef: React.RefObject<MapRef | null>;
}

export function QueueMap({
  activeTab,
  selectedPending,
  selectedPublished,
  mapRef,
}: QueueMapProps) {
  const { theme } = useTheme();
  const { editPos, setEditPos, pubPos, setPubPos } = useQueueStore();

  const mapClickPos = activeTab === "pending" ? editPos : pubPos;
  const setMapClickPos = activeTab === "pending" ? setEditPos : setPubPos;

  return (
    <div className="w-full h-full flex flex-col bg-card/5">
      <div className="p-6 border-b border-border/20 bg-background/30 backdrop-blur-md space-y-3">
        <h3 className="text-xs font-black uppercase tracking-[0.4em] font-display">
          Spatial Correlator
        </h3>
        <div className="relative group">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="SEARCH TARGET (E.G. PENTAGON)..."
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              const val = (e.target as HTMLInputElement).value;
              try {
                const res = await fetch(
                  `https://photon.komoot.io/api/?q=${encodeURIComponent(
                    val
                  )}&limit=1`
                );
                const coords = await res.json();
                if (coords.features?.[0]) {
                  const [lng, lat] = coords.features[0].geometry.coordinates;
                  setMapClickPos({ lng, lat });
                  mapRef.current?.flyTo({
                    center: [lng, lat],
                    zoom: 15,
                  });
                }
              } catch (error) {
                console.error("Geocoding failed", error);
              }
            }}
            className="w-full bg-background/60 border border-border/40 rounded-xl pl-10 pr-4 h-10 text-xs font-black uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="flex items-center justify-between">
          {mapClickPos ? (
            <span className="text-xs font-mono text-emerald-500 font-black flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
              SYSTEM_LOCK_STABLE
            </span>
          ) : (
            <span className="text-xs font-mono text-destructive font-black flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> NO_COORDINATES
            </span>
          )}
          <span className="text-xs font-mono text-foreground bg-secondary/30 px-2 py-0.5 rounded border border-border/20">
            {mapClickPos
              ? `${mapClickPos.lat.toFixed(5)}°N / ${mapClickPos.lng.toFixed(
                  5
                )}°E`
              : "UNKNOWN_LOC"}
          </span>
        </div>
      </div>
      <div className="flex-1 relative">
        <Map
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={mapRef as any}
          initialViewState={{
            longitude: mapClickPos?.lng || 0,
            latitude: mapClickPos?.lat || 20,
            zoom: mapClickPos ? 12 : 1.5,
          }}
          onClick={(e: MapLayerMouseEvent) =>
            setMapClickPos({
              lng: e.lngLat.lng,
              lat: e.lngLat.lat,
            })
          }
          mapStyle={
            theme === "dark"
              ? "https://tiles.openfreemap.org/styles/dark"
              : "https://tiles.openfreemap.org/styles/bright"
          }
          style={{ width: "100%", height: "100%" }}
        >
          {mapClickPos && (
            <Marker longitude={mapClickPos.lng} latitude={mapClickPos.lat} anchor="bottom">
              <div className="relative">
                <div className="absolute inset-x-0 bottom-0 translate-y-1/2 scale-[3.5] blur-xl bg-primary/60 rounded-full animate-pulse" />
                <MapPin className="text-primary fill-background w-12 h-12 -mt-12 stroke-[2.5] drop-shadow-[0_0_10px_rgba(var(--primary),0.5)] relative z-10" />
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
            const suggLng =
              activeTab === "pending"
                ? selectedPending?.lng
                : selectedPublished?.lng;
            const suggLat =
              activeTab === "pending"
                ? selectedPending?.lat
                : selectedPublished?.lat;
            return suggLng && suggLat ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  mapRef.current?.flyTo({
                    center: [suggLng, suggLat],
                    zoom: 12,
                  });
                  setMapClickPos({
                    lng: suggLng,
                    lat: suggLat,
                  });
                }}
                className="bg-background border-green-500/60 h-10 text-xs font-black uppercase gap-2 hover:bg-green-500/10 text-green-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2"
              >
                <MapPin className="w-3.5 h-3.5" /> RECALIBRATE TO SUGGESTION
              </Button>
            ) : null;
          })()}
        </div>
        <div className="absolute inset-0 pointer-events-none border-[16px] border-primary/5 rounded-3xl" />
      </div>
    </div>
  );
}
