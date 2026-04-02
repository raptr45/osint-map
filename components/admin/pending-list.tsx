import * as React from "react";
import { Activity, AlertTriangle, ChevronRight, Globe, Image as ImageIcon, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PendingEvent } from "@/lib/schemas";

interface PendingListProps {
  queue: PendingEvent[] | undefined;
  isLoading: boolean;
  selectedPendingId: string | null;
  onSelect: (id: string) => void;
  sortBy: "date" | "source";
  onSortChange: (sort: "date" | "source") => void;
  formatRelativeTime: (d: string) => string;
}

export function PendingList({
  queue,
  isLoading,
  selectedPendingId,
  onSelect,
  sortBy,
  onSortChange,
  formatRelativeTime,
}: PendingListProps) {
  const groupedQueue = React.useMemo(() => {
    if (!queue) return {};
    const sorted = [...queue].sort((a, b) => {
      if (sortBy === "source")
        return (a.source || "").localeCompare(b.source || "");
      return (
        new Date(b.sourceCreatedAt || b.createdAt).getTime() -
        new Date(a.sourceCreatedAt || a.createdAt).getTime()
      );
    });
    const groups: Record<string, PendingEvent[]> = {};
    sorted.forEach((item) => {
      const date = new Date(
        item.sourceCreatedAt || item.createdAt
      ).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [queue, sortBy]);

  return (
    <div className="w-full h-full border-r border-border/30 flex flex-col bg-card/10">
      <div className="p-3 border-b border-border/10 flex items-center justify-between bg-background/20 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
          Sort
        </span>
        <div className="flex gap-1">
          {(["date", "source"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSortChange(s)}
              className={cn(
                "px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all",
                sortBy === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {s}
            </button>
          ))}
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
              <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl py-1.5 px-1 border-b border-border/20 flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest uppercase text-primary/80 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  {date}
                </span>
                <Badge
                  variant="outline"
                  className="h-4 text-[9px] border-border/30 opacity-50 px-1"
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
                  <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed">
                    {item.rawSource}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums">
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
                        "w-3 h-3 transition-all text-muted-foreground/20",
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
