"use client";

import * as React from "react";
import Map, { NavigationControl, FullscreenControl, ScaleControl, GeolocateControl, Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { ExternalLink, Globe, ChevronRight, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCROLLBAR_STYLES = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--primary) / 0.15);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--primary) / 0.3);
  }
`;

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
  sourceUrl?: string | null;
  createdAt: string;
}

export function MapView() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const mapRef = React.useRef<MapRef>(null);
  const [bbox, setBbox] = React.useState<number[] | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<MapEvent | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const hours = searchParams.get("hours");
  const region = searchParams.get("region");

  React.useEffect(() => {
    if (region && region !== "global" && mapRef.current) {
      const [lng, lat, zoom] = region.split(",").map(parseFloat);
      mapRef.current.flyTo({ center: [lng, lat], zoom: zoom || 5, duration: 2000 });
    }
  }, [region]);

  const { data: events, isLoading } = useSWR(
    bbox 
      ? `/api/events?minLng=${bbox[0]}&minLat=${bbox[1]}&maxLng=${bbox[2]}&maxLat=${bbox[3]}${hours ? `&hours=${hours}` : ""}` 
      : null,
    fetcher,
    { refreshInterval: 10000 }
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

  const groupedEvents = React.useMemo(() => {
    if (!events) return {};
    const groups: Record<string, MapEvent[]> = {};
    events.forEach((item: MapEvent) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [events]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden rounded-3xl border border-border/50 shadow-2xl flex">
      <style dangerouslySetInnerHTML={{ __html: SCROLLBAR_STYLES }} />
      
      {/* Sidebar Feed */}
      <div className={cn(
        "h-full bg-background/80 backdrop-blur-xl border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out z-20",
        isSidebarOpen ? "w-[380px]" : "w-0 p-0 overflow-hidden border-none"
      )}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight font-display">System Feed</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none font-sans">Intelligence Stream</p>
              </div>
            </div>
            {isLoading && <Zap className="w-4 h-4 text-primary animate-pulse" />}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary/70 bg-primary/5 p-3 rounded-xl border border-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              GLOBAL REPOSITORY SYNC ACTIVE
            </div>

            {events && events.length > 0 ? (
                Object.entries(groupedEvents).map(([date, dayEvents]) => (
                  <div key={date} className="space-y-3">
                    <div className="sticky top-0 bg-background/40 backdrop-blur-md py-1 z-10 flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{date}</span>
                      <div className="h-px flex-1 bg-border/30" />
                    </div>
                    {dayEvents.map((e: MapEvent) => (
                      <div 
                        key={e.id} 
                        className={cn(
                          "p-4 rounded-2xl bg-secondary/20 border border-border/20 hover:bg-secondary/40 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] group relative font-sans",
                          selectedEvent?.id === e.id && "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5"
                        )}
                        onClick={() => {
                            mapRef.current?.flyTo({ center: [e.lng, e.lat], zoom: 12 });
                            setSelectedEvent(e);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    e.severity === "critical" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                                    e.severity === "high" ? "bg-orange-500" : "bg-primary"
                                )} />
                                <span className="text-[11px] font-bold truncate uppercase tracking-tight font-display">{e.title}</span>
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground tabular-nums flex-shrink-0 mt-0.5">
                              {formatTime(e.createdAt)}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed mb-3">
                          {e.description}
                        </p>
                        <div className="flex items-center justify-between">
                           {e.sourceUrl ? (
                             <a 
                               href={e.sourceUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               onClick={(ev) => ev.stopPropagation()}
                               className="text-[9px] font-bold text-primary/70 flex items-center gap-1 hover:text-primary transition-colors hover:underline underline-offset-2"
                             >
                               <Globe className="w-2.5 h-2.5" />
                               INTEL SOURCE
                               <ExternalLink className="w-2 h-2" />
                             </a>
                           ) : <span />}
                           <div className="flex items-center gap-1">
                             <span className="text-[8px] font-bold text-muted-foreground/40 group-hover:text-primary/60 transition-colors uppercase tracking-widest opacity-0 group-hover:opacity-100">Locate</span>
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
                <p className="text-xs font-bold uppercase tracking-widest">Scanning Viewport...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-1/2 -translate-y-1/2 z-30 h-16 w-4 bg-background/80 backdrop-blur-xl border border-l-0 border-border/50 rounded-r-xl flex items-center justify-center hover:bg-secondary cursor-pointer transition-all shadow-xl"
        style={{ left: isSidebarOpen ? '380px' : '0' }}
      >
        <ChevronRight className={cn("w-3 h-3 transition-transform", isSidebarOpen && "rotate-180")} />
      </button>

      {/* Map Area */}
      <div className="flex-1 relative">
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
                  event.severity === "critical" ? "bg-red-600 shadow-xl shadow-red-600/20" :
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
              offset={10}
            >
              <div className="p-4 max-w-[240px] bg-card/90 backdrop-blur-xl text-card-foreground border-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden font-sans">
                <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-display",
                    selectedEvent.severity === "critical" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                    selectedEvent.severity === "high" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                    "bg-secondary text-secondary-foreground"
                  )}>
                    {selectedEvent.severity}
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground tabular-nums opacity-60">{formatTime(selectedEvent.createdAt)}</span>
                </div>
                <h4 className="font-bold text-sm mb-2 leading-tight tracking-tight font-display">{selectedEvent.title}</h4>
                <p className="text-[11px] text-muted-foreground/90 line-clamp-4 mb-4 leading-relaxed">{selectedEvent.description}</p>
                
                {selectedEvent.sourceUrl && (
                  <Button asChild size="sm" variant="default" className="w-full h-9 text-[11px] font-bold gap-2 bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-display">
                    <a href={selectedEvent.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                      READ INTEL SOURCE
                    </a>
                  </Button>
                )}
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
