import { Badge } from "@/components/ui/badge";
import type { PublishedEvent, Severity } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Globe,
  Image as ImageIcon,
  Loader2,
  Search,
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

interface PublishedListProps {
  published: PublishedEvent[] | undefined;
  isLoading: boolean;
  selectedPublishedId: string | null;
  onSelect: (id: string) => void;
  formatRelativeTime: (d: string) => string;
  sortBy: "date" | "severity" | "title";
  onSortChange: (sort: "date" | "severity" | "title") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;
}

const severityColor = (s: Severity) =>
  ({
    critical: "bg-red-500/15 text-red-500 border-red-500/30",
    high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  }[s] ?? "bg-secondary text-secondary-foreground");

export function PublishedList({
  published,
  isLoading,
  selectedPublishedId,
  onSelect,
  formatRelativeTime,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
}: PublishedListProps) {
  const [search, setSearch] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("global");

  const activeRegion = GEOGRAPHIC_REGIONS.find(r => r.id === regionFilter) || GEOGRAPHIC_REGIONS[0];

  const filteredAndSorted = React.useMemo(() => {
    if (!published) return [];

    // Filter
    let filtered = [...published];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(s) ||
          item.description?.toLowerCase().includes(s)
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
      if (sortBy === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "severity") {
        const orderMap = { critical: 3, high: 2, medium: 1, low: 0 };
        comparison =
          (orderMap[a.severity as Severity] || 0) -
          (orderMap[b.severity as Severity] || 0);
      } else {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [published, sortBy, sortOrder, search, activeRegion]);

  const groupedPublished = React.useMemo(() => {
    const groups: Record<string, PublishedEvent[]> = {};
    filteredAndSorted.forEach((item) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const groupKey =
        sortBy === "severity"
          ? "Severity Active"
          : date;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [filteredAndSorted, sortBy]);

  const handleSortClick = (s: "date" | "severity" | "title") => {
    if (sortBy === s) {
      onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(s);
      onSortOrderChange("desc");
    }
  };

  return (
    <div className="w-full h-full border-r border-border/30 flex flex-col bg-card/10">
      <div className="p-3 border-b border-border/10 bg-background/40 space-y-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="SEARCH ACTIVE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/10 border border-border/30 rounded-lg pl-8 pr-28 h-8 text-[10px] font-bold uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-muted-foreground/50"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 h-5 px-2 rounded font-black text-[8px] uppercase tracking-widest transition-all border",
                    regionFilter !== "global"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
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
                        ? "bg-emerald-500 text-primary-foreground focus:bg-emerald-500 focus:text-primary-foreground"
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
            {(["date", "severity", "title"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSortClick(s)}
                className={cn(
                  "px-2 py-1 rounded-md text-[8px] flex items-center gap-1 font-black uppercase tracking-widest transition-all border",
                  sortBy === s
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-sm"
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
          Object.entries(groupedPublished).map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl py-1.5 px-1 border-b border-border/20 flex items-center justify-between px-2">
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {date}
                </span>
                <Badge
                  variant="outline"
                  className="h-4 text-[9px] border-border/40 text-muted-foreground/90 px-1.5"
                >
                  {items.length} EVENT
                </Badge>
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-xl cursor-pointer transition-all border group",
                    selectedPublishedId === item.id
                      ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20"
                      : "bg-background/40 hover:bg-secondary/30 border-border/20"
                  )}
                  onClick={() => onSelect(item.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-black text-xs tracking-tight line-clamp-2 flex-1 uppercase leading-snug text-foreground">
                      {item.title}
                    </h3>
                    <span
                      className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase border shrink-0",
                        severityColor(item.severity as Severity)
                      )}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/90 line-clamp-1 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                    <span className="text-[10px] font-black text-muted-foreground/80 tabular-nums">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.imageUrl && (
                        <ImageIcon className="w-2.5 h-2.5 text-muted-foreground/30" />
                      )}
                      {item.sourceUrl && (
                        <Globe className="w-2.5 h-2.5 text-primary/40" />
                      )}
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 transition-all text-muted-foreground/40",
                          selectedPublishedId === item.id
                            ? "text-emerald-500 translate-x-0.5"
                            : "group-hover:text-emerald-500/40"
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        {!isLoading && (!published || published.length === 0) && (
          <div className="flex flex-col items-center justify-center py-24 opacity-20">
            <CheckCircle2 className="w-8 h-8 mb-3" />
            <p className="text-[11px] font-black uppercase tracking-widest">
              No Published Events
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
