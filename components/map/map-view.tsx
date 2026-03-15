"use client";

import * as React from "react";
import Map, { NavigationControl, FullscreenControl, ScaleControl, GeolocateControl, Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { cn } from "@/lib/utils";

const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/bright";
const MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MapEvent {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  lng: number;
  lat: number;
}

export function MapView() {
  const { theme } = useTheme();
  const mapRef = React.useRef<MapRef>(null);
  const [bbox, setBbox] = React.useState<number[] | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<MapEvent | null>(null);

  const { data: events, isLoading } = useSWR(
    bbox 
      ? `/api/events?minLng=${bbox[0]}&minLat=${bbox[1]}&maxLng=${bbox[2]}&maxLat=${bbox[3]}` 
      : null,
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds for real-time feel
  );

  const updateBbox = () => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      setBbox([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    }
  };

  const mapStyle = theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden rounded-3xl border border-border/50 shadow-2xl">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 31.1656,
          latitude: 48.3794,
          zoom: 5,
        }}
        onLoad={updateBbox}
        onMoveEnd={updateBbox}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-left" />

        {events?.map((event: MapEvent) => (
          <Marker
            key={event.id}
            longitude={event.lng}
            latitude={event.lat}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedEvent(event);
            }}
          >
            <div className="cursor-pointer group">
              <div className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-background shadow-lg transition-transform hover:scale-125",
                event.severity === "critical" ? "bg-red-600" :
                event.severity === "high" ? "bg-orange-500" :
                event.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"
              )}>
                {event.severity === "critical" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-600 opacity-75"></span>
                )}
                <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          </Marker>
        ))}

        {selectedEvent && (
          <Popup
            longitude={selectedEvent.lng}
            latitude={selectedEvent.lat}
            anchor="top"
            onClose={() => setSelectedEvent(null)}
            className="z-50"
            closeButton={false}
          >
            <div className="p-3 max-w-[200px] bg-card text-card-foreground">
              <h4 className="font-bold text-sm mb-1">{selectedEvent.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{selectedEvent.description}</p>
              <div className={cn(
                "mt-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                selectedEvent.severity === "critical" ? "bg-red-100 text-red-700" :
                selectedEvent.severity === "high" ? "bg-orange-100 text-orange-700" :
                "bg-secondary text-secondary-foreground"
              )}>
                {selectedEvent.severity}
              </div>
            </div>
          </Popup>
        )}
      </Map>
      
      <div className="absolute top-4 left-4 z-10 w-80">
        <div className="bg-background/60 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">System Feed</h3>
            {isLoading && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-muted-foreground bg-primary/5 p-2 rounded-xl border border-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              SYNCING WITH GLOBAL OSINT REPOSITORIES
            </div>

            {events && events.length > 0 ? (
              <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {events.slice(0, 5).map((e: MapEvent) => (
                  <div 
                    key={e.id} 
                    className="p-2 rounded-lg bg-secondary/30 border border-border/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => {
                        mapRef.current?.flyTo({ center: [e.lng, e.lat], zoom: 12 });
                        setSelectedEvent(e);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            e.severity === "critical" ? "bg-red-500" : "bg-primary"
                        )} />
                        <span className="text-[10px] font-bold truncate uppercase">{e.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic p-2 text-center">
                Scanning current viewport for activity...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
