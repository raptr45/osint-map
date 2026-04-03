"use client";

/**
 * components/map/map-popup.tsx
 *
 * Popup card shown when a map marker is selected.
 * Extracted from map-view.tsx (was PopupContent function inside same file).
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  Maximize2,
  Trash2,
  X,
  Activity,
  ChevronRight,
} from "lucide-react";
import * as React from "react";
import { formatDistanceToNow } from "date-fns";

import { ICON_MAPPING, EVENT_TYPE_LABELS } from "@/lib/constants";
import { deriveEventType } from "@/components/map/map-view";
import type { MapEvent } from "@/lib/schemas";
import type { Severity } from "@/lib/schemas";

interface MapPopupProps {
  event: MapEvent;
  canEdit: boolean;
  canDelete: boolean;
  isEditing: boolean;
  onToggleEdit: (val: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<MapEvent>) => Promise<void>;
  onLightbox: (url: string) => void;
}

export function MapPopup({
  event, canEdit, canDelete, isEditing,
  onToggleEdit, onDelete, onUpdate, onLightbox,
}: MapPopupProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [expandedType, setExpandedType] = React.useState(false);
  const [title, setTitle] = React.useState(event.title);
  const [desc, setDesc] = React.useState(event.description ?? "");
  const [severity, setSeverity] = React.useState<Severity>(event.severity);
  const [eventType, setEventType] = React.useState(() =>
    event.eventType && event.eventType !== "unknown" ? event.eventType : deriveEventType(event.title)
  );

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  if (isEditing) {
    return (
    <div className="p-4 w-full md:w-[280px] bg-card/95 backdrop-blur-2xl text-card-foreground md:border border-border/40 md:shadow-2xl md:rounded-2xl font-sans space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Title</label>
          <input
            className="w-full bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            value={title} onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Description</label>
          <textarea
            className="w-full bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 text-xs min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all leading-relaxed"
            value={desc} onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Severity</label>
          <div className="flex gap-1.5">
            {(["low", "medium", "high", "critical"] as const).map((s) => (
              <button key={s} onClick={() => setSeverity(s)}
                className={cn(
                  "flex-1 py-1 rounded-md text-[11px] font-semibold uppercase transition-all border",
                  severity === s ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                )}
              >{s}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between cursor-pointer group px-1" onClick={() => setExpandedType(!expandedType)}>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest cursor-pointer group-hover:text-foreground transition-colors">Event Type</label>
            <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform", expandedType && "rotate-90")} />
          </div>
          {!expandedType ? (
            <button onClick={() => setExpandedType(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all text-[11px] font-semibold uppercase">
              <div className="flex items-center gap-2">
                {(() => { const CurrentIcon = ICON_MAPPING[eventType] || Activity; return <CurrentIcon className="w-4 h-4 text-primary" />; })()}
                <span>{EVENT_TYPE_LABELS[eventType]?.label || "Select Type"}</span>
              </div>
              <span className="text-[10px] text-muted-foreground opacity-60">Change</span>
            </button>
          ) : (
            <div className="flex gap-1 flex-wrap">
              {Object.entries(EVENT_TYPE_LABELS).map(([type, { label }]) => {
                const Icon = ICON_MAPPING[type] || Activity;
                return (
                  <button key={type} onClick={() => { setEventType(type); setExpandedType(false); }} title={label}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border transition-all",
                      eventType === type ? "bg-primary/20 border-primary text-primary" : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-lg gap-2 text-[11px] font-semibold uppercase" onClick={() => onToggleEdit(false)} disabled={isSaving}>
            <X className="w-3 h-3" /> Cancel
          </Button>
          <Button variant="default" size="sm" className="h-9 rounded-lg gap-2 text-[11px] font-semibold uppercase shadow-lg shadow-primary/10 hover:scale-[1.02]"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              try { await onUpdate(event.id, { title, description: desc, severity, eventType }); }
              finally { setIsSaving(false); }
            }}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}{" "}Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-[300px] bg-card/95 md:backdrop-blur-2xl text-card-foreground md:shadow-[0_24px_64px_rgba(0,0,0,0.4)] md:rounded-2xl overflow-hidden font-sans md:border border-white/5 animate-in fade-in zoom-in-95 duration-200 pb-8 md:pb-0">
      {event.imageUrl && !imageError && (
        <div className="relative cursor-zoom-in group overflow-hidden" onClick={() => onLightbox(event.imageUrl!)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.imageUrl} alt={event.title} onError={() => setImageError(true)}
            className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3 h-3" />
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider font-display flex-shrink-0",
              event.severity === "critical" ? "bg-red-500/15 text-red-500 border border-red-500/20"
                : event.severity === "high" ? "bg-orange-500/15 text-orange-500 border border-orange-500/20"
                : event.severity === "medium" ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/20"
                : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
            )}>
              {event.severity}
            </div>
            {event.sourceUrl && (
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-medium text-muted-foreground/60 hover:text-primary flex items-center gap-1 truncate transition-colors">
                {event.sourceUrl.includes("t.me") ? <><Globe className="w-2.5 h-2.5 flex-shrink-0" /> TG<ExternalLink className="w-2 h-2 flex-shrink-0" /></>
                  : <><Globe className="w-2.5 h-2.5 flex-shrink-0" /> SOURCE<ExternalLink className="w-2 h-2 flex-shrink-0" /></>}
              </a>
            )}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground/50 tabular-nums flex-shrink-0">{formatTime(event.createdAt)}</span>
        </div>
        <h4 className="font-bold text-sm leading-snug tracking-tight font-display">{event.title}</h4>
        <p className="text-[11px] text-muted-foreground/80 line-clamp-3 leading-relaxed">{event.description}</p>
        {event.sourceUrl && (
          <Button asChild size="sm" variant="outline" className="w-full h-8 text-[11px] font-semibold gap-1.5 border-border/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all">
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              {event.sourceUrl.includes("t.me") ? "OPEN ON TELEGRAM" : "VIEW INTEL SOURCE"}
            </a>
          </Button>
        )}
        {canEdit && (
          <div className="pt-2 border-t border-border/20">
            {showDeleteConfirm && canDelete ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[11px] font-semibold text-destructive uppercase text-center tracking-wide">Confirm Deletion?</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-[11px] font-semibold uppercase" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</Button>
                  <Button variant="destructive" size="sm" className="flex-1 h-8 rounded-lg text-[11px] font-semibold uppercase" disabled={isDeleting}
                    onClick={async () => { setIsDeleting(true); await onDelete(event.id); setIsDeleting(false); }}>
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}{" "}Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {canDelete && (
                  <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg gap-1.5 text-[11px] font-semibold uppercase hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
                    onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                )}
                <Button variant="outline" size="sm" className={cn("h-8 rounded-lg gap-1.5 text-[11px] font-semibold uppercase hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all", canDelete ? "flex-1" : "w-full")}
                  onClick={() => onToggleEdit(true)}>
                  <Edit3 className="w-3 h-3" /> Edit
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
