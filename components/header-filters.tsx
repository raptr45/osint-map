"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Globe, Clock, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TIME_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Past Hour", value: "1" },
  { label: "Past 6 Hours", value: "6" },
  { label: "Past 24 Hours", value: "24" },
  { label: "Past 7 Days", value: "168" },
];

const REGION_OPTIONS = [
  { label: "Global Region", value: "global" },
  { label: "Ukraine & E. Europe", value: "31.1,48.3,5" },
  { label: "Middle East", value: "45.0,30.0,4" },
  { label: "Korean Peninsula", value: "127.0,37.0,6" },
];

export function HeaderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentTime = searchParams.get("hours") || "24";
  const currentRegion = searchParams.get("region") || "global";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "global") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  };

  const activeTimeLabel = TIME_OPTIONS.find(o => o.value === currentTime)?.label || "Past 24 Hours";
  const activeRegionLabel = REGION_OPTIONS.find(o => o.value === currentRegion)?.label || "Global Region";

  return (
    <div className="hidden lg:flex items-center gap-1.5 bg-secondary/20 p-1 rounded-full border border-border/40">
      {/* Region Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="rounded-full gap-2 px-5 h-9 text-[10px] font-bold uppercase tracking-widest hover:bg-background/60 outline-none font-display transition-all border border-transparent hover:border-border/40">
            <Globe className="w-3 h-3 text-primary" />
            <span className="opacity-80">{activeRegionLabel}</span>
            <ChevronDown className="w-2.5 h-2.5 text-muted-foreground opacity-40 group-hover:opacity-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 p-1 backdrop-blur-xl bg-card/80 border-border/50 rounded-xl font-sans">
          {REGION_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => updateFilter("region", opt.value)}
              className={cn(
                "flex items-center justify-between rounded-lg cursor-pointer text-[11px] font-medium",
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="rounded-full gap-2 px-5 h-9 text-[10px] font-bold uppercase tracking-widest hover:bg-background/60 outline-none font-display transition-all border border-transparent hover:border-border/40">
            <Clock className="w-3 h-3 text-primary" />
            <span className="opacity-80">{activeTimeLabel}</span>
            <ChevronDown className="w-2.5 h-2.5 text-muted-foreground opacity-40 group-hover:opacity-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 p-1 backdrop-blur-xl bg-card/80 border-border/50 rounded-xl font-sans">
          {TIME_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => updateFilter("hours", opt.value)}
              className={cn(
                "flex items-center justify-between rounded-lg cursor-pointer text-[11px] font-medium",
                currentTime === opt.value && "bg-primary/10 text-primary"
              )}
            >
              {opt.label}
              {currentTime === opt.value && <Check className="w-3 h-3" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
