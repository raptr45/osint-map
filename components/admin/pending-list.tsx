import { Badge } from "@/components/ui/badge";
import type { PendingEvent } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Globe,
  Image as ImageIcon,
  Loader2,
  Search,
  Zap,
  MapPin,
  ChevronDown
} from "lucide-react";
import * as React from "react";

const GEOGRAPHIC_REGIONS = [
  { id: "global", label: "Global", bounds: null },
  { id: "europe", label: "Europe & Ukraine", bounds: { minLng: -15, maxLng: 45, minLat: 35, maxLat: 72 } },
  { id: "middle_east", label: "Middle East", bounds: { minLng: 32, maxLng: 65, minLat: 12, maxLat: 42 } },
  { id: "asia", label: "Asia & Pacific", bounds: { minLng: 65, maxLng: 180, minLat: -20, maxLat: 55 } },
  { id: "americas", label: "Americas", bounds: { minLng: -170, maxLng: -30, minLat: -60, maxLat: 75 } },
  { id: "africa", label: "Africa", bounds: { minLng: -20, maxLng: 55, minLat: -35, maxLat: 35 } },
];

interface PendingListProps {
  queue: PendingEvent[] | undefined;
  isLoading: boolean;
  selectedPendingId: string | null;
  onSelect: (id: string) => void;
  sortBy: "date" | "source" | "status";
  onSortChange: (sort: "date" | "source" | "status") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;
  formatRelativeTime: (d: string) => string;
}

export function PendingList({
  queue,
  isLoading,
  selectedPendingId,
  onSelect,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  formatRelativeTime,
}: PendingListProps) {
  const [search, setSearch] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("global");

  const activeRegion = GEOGRAPHIC_REGIONS.find(r => r.id === regionFilter) || GEOGRAPHIC_REGIONS[0];

  const filteredAndSortedQueue = React.useMemo(() => {
    if (!queue) return [];

    // Filter
    let filtered = [...queue];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.suggestedTitle?.toLowerCase().includes(s) ||
          item.rawSource?.toLowerCase().includes(s) ||
          item.source?.toLowerCase().includes(s)
      );
    }
    
    // Region Filter
    if (activeRegion.bounds) {
      filtered = filtered.filter(item => {
        if (item.lng === null || item.lat === null) return false;
        return (
          item.lng >= activeRegion.bounds!.minLng &&
          item.lng <= activeRegion.bounds!.maxLng &&
          item.lat >= activeRegion.bounds!.minLat &&
          item.lat <= activeRegion.bounds!.maxLat
        );
      });
    }

    // Sort
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "source") {
        comparison = (a.source || "").localeCompare(b.source || "");
      } else if (sortBy === "status") {
        const orderMap = {
          failed: 2,
          processing: 1,
          pending: 0,
          processed: -1,
          rejected: -2,
        };
        comparison =
          (orderMap[a.status as keyof typeof orderMap] || 0) -
          (orderMap[b.status as keyof typeof orderMap] || 0);
      } else {
        // default: date
        comparison =
          new Date(a.sourceCreatedAt || a.createdAt).getTime() -
          new Date(b.sourceCreatedAt || b.createdAt).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [queue, sortBy, sortOrder, search, activeRegion]);

  const groupedQueue = React.useMemo(() => {
    const groups: Record<string, PendingEvent[]> = {};
    filteredAndSortedQueue.forEach((item) => {
      const date = new Date(
        item.sourceCreatedAt || item.createdAt
      ).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const groupKey =
        sortBy === "status"
          ? "Status Queue"
          : date;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [filteredAndSortedQueue, sortBy]);

  const handleSortClick = (s: "date" | "source" | "status") => {
    if (sortBy === s) {
      onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(s);
      onSortOrderChange("desc");
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Search & Sort Tactical Control */}
      <div className="p-3 border-b border-border/10 bg-background/40 space-y-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="SEARCH REGISTRY..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/10 border border-border/30 rounded-lg pl-8 pr-28 h-8 text-[10px] font-bold uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 h-5 px-2 rounded font-black text-[8px] uppercase tracking-widest transition-all border",
                    regionFilter !== "global"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-background border-border/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <MapPin className="w-2.5 h-2.5" />
                  {activeRegion.label.split(" ")[0]}
                  <ChevronDown className="w-2 h-2 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-border/20 rounded-xl p-1 shadow-2xl shadow-black/40">
                {GEOGRAPHIC_REGIONS.map((region) => (
                  <DropdownMenuItem
                    key={region.id}
                    onClick={() => setRegionFilter(region.id)}
                    className={cn(
                      "text-xs font-bold font-sans rounded-lg py-2 cursor-pointer transition-all",
                      regionFilter === region.id
                        ? "bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                        : "text-muted-foreground focus:bg-secondary focus:text-foreground hover:bg-secondary"
                    )}
                  >
                    {regionFilter === region.id ? (
                      <MapPin className="w-3.5 h-3.5 mr-2" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 mr-2 opacity-40" />
                    )}
                    {region.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between float-right">
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 hidden sm:flex items-center mr-2">
              Order By
            </span>
            {(["date", "source", "status"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSortClick(s)}
                className={cn(
                  "px-2 py-1 rounded-md text-[8px] flex items-center gap-1 font-black uppercase tracking-widest transition-all border",
                  sortBy === s
                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                    : "border-transparent text-muted-foreground/80 hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {s}
                {sortBy === s &&
                  (sortOrder === "asc" ? (
                    <ArrowUp className="w-2.5 h-2.5" />
                  ) : (
                    <ArrowDown className="w-2.5 h-2.5" />
                  ))}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8 text-primary/20" />
          </div>
        )}
        {!isLoading &&
          Object.entries(groupedQueue).map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl py-1.5 px-1 border-b border-border/20 flex items-center justify-between px-2">
                <span className="text-[10px] font-black tracking-widest uppercase text-primary flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  {date}
                </span>
                <Badge
                  variant="outline"
                  className="h-4 text-[9px] border-border/40 text-muted-foreground/90 px-1.5"
                >
                  {items.length} MSG
                </Badge>
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-xl cursor-pointer transition-all border group relative overflow-hidden",
                    selectedPendingId === item.id
                      ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                      : "bg-background/40 hover:bg-secondary/30 border-border/20"
                  )}
                  onClick={() => onSelect(item.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3
                      className={cn(
                        "font-black text-xs tracking-tight line-clamp-2 flex-1 uppercase leading-snug",
                        selectedPendingId === item.id
                          ? "text-primary"
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
                        ? "ENRICHMENT FAILED"
                        : item.suggestedTitle || "ANALYZING..."}
                    </h3>
                    {item.status === "processing" ? (
                      <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                    ) : item.lng ? (
                      <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-destructive/60 shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/90 line-clamp-2 leading-relaxed">
                    {item.rawSource}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-muted-foreground/80 tabular-nums">
                        {formatRelativeTime(
                          item.sourceCreatedAt || item.createdAt
                        )}
                      </span>
                      {item.source && (
                        <Badge
                          variant="outline"
                          className="h-3.5 text-[9px] px-1.5 font-black border-primary/20 text-primary bg-primary/5"
                        >
                          {item.source}
                        </Badge>
                      )}
                      {item.imageUrl && (
                        <ImageIcon className="w-2.5 h-2.5 text-muted-foreground/30" />
                      )}
                      {item.sourceUrl && (
                        <Globe className="w-2.5 h-2.5 text-primary/40" />
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        "w-3 h-3 transition-all text-muted-foreground/40",
                        selectedPendingId === item.id
                          ? "text-primary translate-x-0.5"
                          : "group-hover:text-primary/40"
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        {!isLoading && (!queue || queue.length === 0) && (
          <div className="flex flex-col items-center justify-center py-24 opacity-20">
            <Zap className="w-8 h-8 mb-3" />
            <p className="text-[11px] font-black uppercase tracking-widest">
              Sector Neutral
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
