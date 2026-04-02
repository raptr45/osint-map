import * as React from "react";
import { CheckCircle2, ChevronRight, Globe, Image as ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublishedEvent, Severity } from "@/lib/schemas";

interface PublishedListProps {
  published: PublishedEvent[] | undefined;
  isLoading: boolean;
  selectedPublishedId: string | null;
  onSelect: (id: string) => void;
  formatRelativeTime: (d: string) => string;
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
}: PublishedListProps) {
  const groupedPublished = React.useMemo(() => {
    if (!published) return {};
    const groups: Record<string, PublishedEvent[]> = {};
    [...published].forEach((item) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [published]);

  return (
    <div className="w-full h-full border-r border-border/30 flex flex-col bg-card/10">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8 text-primary/20" />
          </div>
        )}
        {!isLoading &&
          Object.entries(groupedPublished).map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl py-1.5 px-1 border-b border-border/20 flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-500/80 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {date}
                </span>
                <Badge
                  variant="outline"
                  className="h-4 text-[9px] border-border/30 opacity-50 px-1"
                >
                  {items.length}
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
                  <p className="text-[11px] text-muted-foreground/60 line-clamp-1 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                    <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums">
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
                          "w-3 h-3 transition-all text-muted-foreground/20",
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
