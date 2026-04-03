import * as React from "react";
import { AlertTriangle, Clock, Edit3, ExternalLink, Image as ImageIcon, Link2, Loader2, ShieldCheck, Trash2, X, Zap, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/lib/stores/queue-store";
import { EVENT_TYPE_LABELS, ICON_MAPPING } from "@/lib/constants";
import type { PendingEvent, PublishedEvent, Severity } from "@/lib/schemas";

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"] as const;

const severityColor = (s: Severity) =>
  ({
    critical: "bg-red-500/15 text-red-500 border-red-500/30",
    high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  }[s] ?? "bg-secondary text-secondary-foreground");

interface ModerationPanelProps {
  activeTab: "pending" | "published";
  selectedPending: PendingEvent | null;
  selectedPublished: PublishedEvent | null;
  canModerate: boolean;
  canPurge: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  isReprocessing: boolean;
  handlePublish: () => void;
  handleDeletePending: () => void;
  handleSavePublished: () => void;
  handleDeletePublishedConfirm: () => void;
  handleReprocess: () => void;
  formatRelativeTime: (d: string) => string;
}

export function ModerationPanel({
  activeTab,
  selectedPending,
  selectedPublished,
  canModerate,
  canPurge,
  isPublishing,
  isSaving,
  isReprocessing,
  handlePublish,
  handleDeletePending,
  handleSavePublished,
  handleDeletePublishedConfirm,
  handleReprocess,
  formatRelativeTime,
}: ModerationPanelProps) {
  const {
    editTitle,
    setEditTitle,
    editDesc,
    setEditDesc,
    editSourceUrl,
    setEditSourceUrl,
    editSeverity,
    setEditSeverity,
    editEventType,
    setEditEventType,
    editEventTime,
    setEditEventTime,
    editPos,

    pubTitle,
    setPubTitle,
    pubDesc,
    setPubDesc,
    pubSourceUrl,
    setPubSourceUrl,
    pubImageUrl,
    setPubImageUrl,
    pubSeverity,
    setPubSeverity,
    pubEventType,
    setPubEventType,
    pubEventTime,
    setPubEventTime,
  } = useQueueStore();

  return (
    <div className="w-full h-full flex flex-col border-r border-border/20">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
        {/* PENDING DETAILS */}
        {activeTab === "pending" && selectedPending && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    selectedPending.status === "failed"
                      ? "bg-destructive"
                      : "bg-primary shadow-[0_0_12px_rgba(var(--primary),0.8)]"
                  )}
                />
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground/70">
                  {selectedPending.status === "failed"
                    ? "AI Error"
                    : "Review"}
                </h2>
              </div>
              {selectedPending.status === "failed" && (
                <Badge
                  variant="destructive"
                  className="animate-pulse text-xs font-black uppercase"
                >
                  AI Failed
                </Badge>
              )}
            </div>

            {selectedPending.status === "failed" && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3 text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium">
                  AI processing failed. Please fill in the fields below manually.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Title
              </label>
              <input
                className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Event title..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Description
              </label>
              <textarea
                className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm h-36 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all leading-relaxed font-medium"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Brief description of the event..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" /> Source URL
                </label>
                <input
                  className="w-full bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  value={editSourceUrl}
                  onChange={(e) => setEditSourceUrl(e.target.value)}
                  placeholder="https://t.me/..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                  Severity
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {SEVERITY_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditSeverity(s)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all",
                        editSeverity === s
                          ? severityColor(s)
                          : "border-border/30 text-muted-foreground hover:border-border/50"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Event Type Picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Event Type Icon
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(EVENT_TYPE_LABELS).map(([type, { label }]) => {
                  const Icon = ICON_MAPPING[type] || Activity;
                  return (
                    <button
                      key={type}
                      onClick={() => setEditEventType(type)}
                      title={label}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all",
                        editEventType === type
                          ? "bg-primary/20 border-primary text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3 h-3" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event Time Override */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Event Time
                <span className="text-muted-foreground/30 normal-case font-normal">
                  (overrides source time on map)
                </span>
              </label>
              <input
                type="datetime-local"
                className="w-full bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-foreground [color-scheme:dark]"
                value={editEventTime}
                onChange={(e) => setEditEventTime(e.target.value)}
              />
            </div>

            {/* Raw Source */}
            <div className="bg-secondary/10 border border-border/30 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                  Signal Source Content
                </label>
                <div className="flex items-center gap-2">
                  {(selectedPending.sourceUrl || editSourceUrl) && (
                    <a
                      href={selectedPending.sourceUrl || editSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-black border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-full transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Source
                    </a>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs font-black border-border/30 text-muted-foreground"
                  >
                    RAW
                  </Badge>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground font-medium italic">
                &ldquo;{selectedPending.rawSource}&rdquo;
              </p>
              {selectedPending.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPending.imageUrl}
                    alt="Attached image"
                    className="w-full max-h-48 object-cover"
                  />
                  <div className="p-2 bg-black/20 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3 text-muted-foreground" />
                    <a
                      href={selectedPending.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-primary hover:underline"
                    >
                      Full Resolution
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* PUBLISHED DETAILS */}
        {activeTab === "published" && selectedPublished && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground/70">
                  Event Editor
                </h2>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-black border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
              >
                PUBLISHED
              </Badge>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Title
              </label>
              <input
                className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                value={pubTitle}
                onChange={(e) => setPubTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Description
              </label>
              <textarea
                className="w-full bg-secondary/20 border border-border/30 rounded-xl p-3.5 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all leading-relaxed font-medium"
                value={pubDesc}
                onChange={(e) => setPubDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Severity
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {SEVERITY_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPubSeverity(s)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all",
                      pubSeverity === s
                        ? severityColor(s)
                        : "border-border/30 text-muted-foreground hover:border-border/50"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Type Picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Event Type Icon
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(EVENT_TYPE_LABELS).map(([type, { label }]) => {
                  const Icon = ICON_MAPPING[type] || Activity;
                  return (
                    <button
                      key={type}
                      onClick={() => setPubEventType(type)}
                      title={label}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all",
                        pubEventType === type
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "border-border/30 text-muted-foreground hover:border-border/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3 h-3" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                <Link2 className="w-3 h-3" /> Source URL
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                  value={pubSourceUrl}
                  onChange={(e) => setPubSourceUrl(e.target.value)}
                  placeholder="https://t.me/..."
                />
                {pubSourceUrl && (
                  <a
                    href={pubSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" /> Image URL
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                  value={pubImageUrl}
                  onChange={(e) => setPubImageUrl(e.target.value)}
                  placeholder="https://blob.vercel.app/..."
                />
                {pubImageUrl && (
                  <a
                    href={pubImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  </a>
                )}
              </div>
              {pubImageUrl && (
                <div className="rounded-xl overflow-hidden border border-border/20 mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pubImageUrl}
                    alt="Preview"
                    className="w-full max-h-36 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Event Time Override */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Event Time
                <span className="text-muted-foreground/30 normal-case font-normal">
                  (when this happened on the map timeline)
                </span>
              </label>
              <input
                type="datetime-local"
                className="w-full bg-secondary/20 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all text-foreground [color-scheme:dark]"
                value={pubEventTime}
                onChange={(e) => setPubEventTime(e.target.value)}
              />
            </div>

            <div className="text-[10px] text-muted-foreground/40 font-mono pt-2 border-t border-border/10">
              ID: {selectedPublished.id.slice(0, 8)}... · Published{" "}
              {formatRelativeTime(selectedPublished.createdAt)} · Updated{" "}
              {formatRelativeTime(selectedPublished.updatedAt)}
            </div>
          </>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex gap-3 p-4 lg:p-5 bg-card/60 backdrop-blur-2xl border-t border-border/20 items-center justify-between flex-row-reverse shrink-0">
        {activeTab === "pending" && selectedPending && (
          <div className="flex gap-3">
            {canModerate && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReprocess}
                  disabled={isReprocessing || isPublishing}
                  className="h-10 px-5 rounded-xl text-xs font-black uppercase gap-2 hover:bg-primary/10 hover:border-primary/40 transition-all"
                >
                  {isReprocessing ? (
                    <Loader2 className="animate-spin w-3.5 h-3.5" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}{" "}
                  Rescan
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeletePending}
                  disabled={isPublishing}
                  className="h-10 px-5 rounded-xl text-xs font-black uppercase gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                >
                  <X className="w-3.5 h-3.5" /> Delete
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || !editPos}
                  className="h-10 px-7 rounded-xl text-sm font-black uppercase gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isPublishing ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 stroke-[3]" />
                  )}{" "}
                  Publish
                </Button>
              </>
            )}
          </div>
        )}
        {activeTab === "published" && selectedPublished && (
          <div className="flex gap-3">
            {canModerate && (
              <>
                {canPurge && (
                  <Button
                    variant="outline"
                    onClick={handleDeletePublishedConfirm}
                    disabled={isPublishing}
                    className="h-10 px-5 rounded-xl text-xs font-black uppercase gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Unpublish
                  </Button>
                )}
                <Button
                  onClick={handleSavePublished}
                  disabled={isSaving}
                  className="h-10 px-7 rounded-xl text-sm font-black uppercase gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <Edit3 className="w-4 h-4" />
                  )}{" "}
                  Save Changes
                </Button>
              </>
            )}
          </div>
        )}
        {/* ID display */}
        <div className="flex flex-col items-start gap-0.5 p-2 px-3.5 rounded-xl border border-border/10 bg-secondary/5">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            Event ID
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/60">
            {(activeTab === "pending"
              ? selectedPending?.id
              : selectedPublished?.id
            )?.slice(0, 18)}
            ...
          </span>
        </div>
      </div>
    </div>
  );
}
