"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Globe, Clock, ChevronDown, Check, Calendar, X, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import * as React from "react";

const TIME_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Past Hour", value: "1" },
  { label: "Past 6 Hours", value: "6" },
  { label: "Past 24 Hours", value: "24" },
  { label: "Past 7 Days", value: "168" },
  { label: "Past 30 Days", value: "720" },
];

const REGION_OPTIONS = [
  { label: "Global Region",     value: "global",        theater: null },
  { label: "Ukraine & E. Europe", value: "31.1,48.3,5", theater: "UA" },
  { label: "Middle East",        value: "45.0,30.0,4", theater: "IQ" },
  { label: "Korean Peninsula",   value: "127.0,37.0,6",theater: "KR" },
  { label: "Lebanon",            value: "35.5,33.9,8", theater: "LB" },
  { label: "Gaza Strip",         value: "34.4,31.4,10",theater: "PS" },
  { label: "Iran",               value: "53.7,32.4,5", theater: "IR" },
  { label: "Yemen",              value: "47.0,15.5,6", theater: "YE" },
];

export function HeaderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTime = searchParams.get("hours") || "24";
  const currentRegion = searchParams.get("region") || "global";
  const currentFrom = searchParams.get("from");
  const currentTo = searchParams.get("to");
  const isCustomRange = !!(currentFrom && currentTo);

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [fromDate, setFromDate] = React.useState(currentFrom || "");
  const [toDate, setToDate] = React.useState(currentTo || "");
  const [timeMenuOpen, setTimeMenuOpen] = React.useState(false);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "global") {
      params.delete(key);
      params.delete("theater"); // clear country highlight
    } else {
      params.set(key, value);
    }
    // When changing region, also set/clear theater
    if (key === "region") {
      const opt = REGION_OPTIONS.find((o) => o.value === value);
      if (opt?.theater) {
        params.set("theater", opt.theater);
      } else {
        params.delete("theater");
      }
    }
    // Clear custom range when switching to preset
    if (key === "hours") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`?${params.toString()}`);
  };

  const applyCustomRange = () => {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", fromDate);
    params.set("to", toDate);
    params.delete("hours");
    router.push(`?${params.toString()}`);
    setShowDatePicker(false);
    setTimeMenuOpen(false);
  };

  const clearCustomRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    params.set("hours", "24");
    router.push(`?${params.toString()}`);
    setFromDate("");
    setToDate("");
  };

  const formatDateLabel = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const activeTimeLabel = isCustomRange
    ? `${formatDateLabel(currentFrom!)} – ${formatDateLabel(currentTo!)}`
    : TIME_OPTIONS.find((o) => o.value === currentTime)?.label || "Past 24 Hours";

  const activeRegionLabel =
    REGION_OPTIONS.find((o) => o.value === currentRegion)?.label || "Global Region";

  return (
    <>
      <div className="hidden lg:flex items-center gap-1.5 bg-secondary/20 p-1 rounded-full border border-border/40">
      {/* Region Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full gap-2 px-5 h-9 text-[11px] font-semibold uppercase tracking-wide hover:bg-background/60 outline-none font-display transition-all border border-transparent hover:border-border/40"
          >
            <Globe className="w-3 h-3 text-primary" />
            <span className="opacity-80">{activeRegionLabel}</span>
            <ChevronDown className="w-2.5 h-2.5 text-muted-foreground opacity-40" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-48 p-1 backdrop-blur-xl bg-card/80 border-border/50 rounded-xl font-sans"
        >
          {REGION_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => updateFilter("region", opt.value)}
              className={cn(
                "flex items-center justify-between rounded-lg cursor-pointer text-xs font-medium",
                currentRegion === opt.value && "bg-primary/10 text-primary"
              )}
            >
              {opt.label}
              {currentRegion === opt.value && <Check className="w-3 h-3" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Time Filter */}
      <DropdownMenu open={timeMenuOpen} onOpenChange={setTimeMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full gap-2 px-5 h-9 text-[11px] font-semibold uppercase tracking-wide hover:bg-background/60 outline-none font-display transition-all border border-transparent hover:border-border/40 max-w-[260px]",
              isCustomRange && "text-primary border-primary/20 bg-primary/5"
            )}
          >
            {isCustomRange ? (
              <Calendar className="w-3 h-3 text-primary flex-shrink-0" />
            ) : (
              <Clock className="w-3 h-3 text-primary flex-shrink-0" />
            )}
            <span className="opacity-80 truncate">{activeTimeLabel}</span>
            <ChevronDown className="w-2.5 h-2.5 text-muted-foreground opacity-40 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 p-1 backdrop-blur-xl bg-card/95 border-border/50 rounded-xl font-sans shadow-2xl"
          onInteractOutside={(e) => {
            // Prevent close when interacting with inner date picker
            if ((e.target as HTMLElement)?.closest("[data-date-picker]")) {
              e.preventDefault();
            }
          }}
        >
          {TIME_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => { updateFilter("hours", opt.value); setShowDatePicker(false); }}
              className={cn(
                "flex items-center justify-between rounded-lg cursor-pointer text-xs font-medium",
                !isCustomRange && currentTime === opt.value && "bg-primary/10 text-primary"
              )}
            >
              {opt.label}
              {!isCustomRange && currentTime === opt.value && <Check className="w-3 h-3" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="my-1" />

          {/* Custom Range Toggle */}
          <DropdownMenuItem
            className={cn(
              "flex items-center justify-between rounded-lg cursor-pointer text-xs font-medium",
              isCustomRange && "bg-primary/10 text-primary"
            )}
            onSelect={(e) => {
              e.preventDefault();
              setShowDatePicker((v) => !v);
            }}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Custom Date Range
            </span>
            {isCustomRange && <Check className="w-3 h-3" />}
          </DropdownMenuItem>

          {/* Inline Date Picker */}
          {showDatePicker && (
            <div data-date-picker className="px-2 pb-2 pt-1 space-y-2 mt-1 border-t border-border/20">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide pl-0.5">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-secondary/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide pl-0.5">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-secondary/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                />
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-[10px] font-bold uppercase rounded-lg shadow-sm shadow-primary/10"
                disabled={!fromDate || !toDate}
                onClick={applyCustomRange}
              >
                Apply Range
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active custom range clear button */}
      {isCustomRange && (
        <button
          onClick={clearCustomRange}
          className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Clear custom range"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 border-border/50 bg-background/50 backdrop-blur-md"
            >
              <Filter className="w-4 h-4 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 backdrop-blur-xl bg-card/95 border-border/50 rounded-2xl shadow-2xl space-y-2">
            <div className="px-2 py-1.5 text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Region Select</div>
            {REGION_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => updateFilter("region", opt.value)}
                className={cn(
                  "rounded-xl h-10 px-3 text-xs font-bold uppercase",
                  currentRegion === opt.value && "bg-primary/10 text-primary"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Globe className={cn("w-3.5 h-3.5", currentRegion === opt.value ? "text-primary" : "text-muted-foreground/40")} />
                  {opt.label}
                </div>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator className="bg-border/10" />
            
            <div className="px-2 py-1.5 text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Time Intel</div>
            {TIME_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => updateFilter("hours", opt.value)}
                className={cn(
                  "rounded-xl h-10 px-3 text-xs font-bold uppercase",
                  currentTime === opt.value && "bg-primary/10 text-primary"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Clock className={cn("w-3.5 h-3.5", currentTime === opt.value ? "text-primary" : "text-muted-foreground/40")} />
                  {opt.label}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
