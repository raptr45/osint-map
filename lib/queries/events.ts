"use client";

/**
 * lib/queries/events.ts
 *
 * Centralized TanStack Query hooks for all data fetching.
 * Replaces the 3 separate useSWR() calls + local fetcher definitions
 * scattered across map-view.tsx, admin/page.tsx, and queue/page.tsx.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  MapEvent,
  PendingEvent,
  PublishedEvent,
  AdminStatsResponse,
  AiSettings,
  IngestSource,
  PublishBody,
  UpdateEventBody,
} from "@/lib/schemas";

// ─── Query Key Factory ─────────────────────────────────────────────────────────
// Centralised so invalidation never has a typo mismatch.
export const queryKeys = {
  mapEvents:       (url: string | null) => ["map-events", url] as const,
  adminStats:      () => ["admin-stats"] as const,
  adminQueue:      () => ["admin-queue"] as const,
  publishedEvents: () => ["published-events"] as const,
  adminSettings:   () => ["admin-settings"] as const,
  ingestSources:   () => ["ingest-sources"] as const,
};

// ─── Shared Typed Fetcher ──────────────────────────────────────────────────────
async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

// ─── Map Events ───────────────────────────────────────────────────────────────

/**
 * Fetches events within the current viewport bounding box.
 * Auto-polls every 10s for live data; disabled for historical date ranges.
 */
export function useMapEvents(
  bbox: number[] | null,
  opts: {
    hours?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    region?: string | null;
  }
) {
  const { hours, dateFrom, dateTo, region } = opts;
  const isHistorical = !!(dateFrom && dateTo);

  const url = bbox
    ? `/api/events?minLng=${bbox[0]}&minLat=${bbox[1]}&maxLng=${bbox[2]}&maxLat=${bbox[3]}${
        isHistorical
          ? `&from=${dateFrom}&to=${dateTo}`
          : `&hours=${hours || "24"}`
      }${region ? `&region=${region}` : ""}`
    : null;

  return useQuery<MapEvent[]>({
    queryKey:       queryKeys.mapEvents(url),
    queryFn:        () => apiFetch<MapEvent[]>(url!),
    enabled:        !!bbox,
    refetchInterval: isHistorical ? 0 : 10_000,
    placeholderData: (prev) => prev, // keeps old markers while new data loads (replaces SWR keepPreviousData)
  });
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery<AdminStatsResponse>({
    queryKey:        queryKeys.adminStats(),
    queryFn:         () => apiFetch<AdminStatsResponse>("/api/admin/stats"),
    refetchInterval: 10_000,
  });
}

// ─── Admin Queue ──────────────────────────────────────────────────────────────

export function useAdminQueue() {
  return useQuery<PendingEvent[]>({
    queryKey:        queryKeys.adminQueue(),
    queryFn:         () => apiFetch<PendingEvent[]>("/api/admin/queue"),
    refetchInterval: 8_000,
  });
}

// ─── Published Events ─────────────────────────────────────────────────────────

export function usePublishedEvents() {
  return useQuery<PublishedEvent[]>({
    queryKey:            queryKeys.publishedEvents(),
    queryFn:             () => apiFetch<PublishedEvent[]>("/api/admin/published"),
    refetchOnWindowFocus: false,
  });
}

// ─── AI Settings ─────────────────────────────────────────────────────────────

export function useAdminSettings() {
  return useQuery<AiSettings>({
    queryKey:            queryKeys.adminSettings(),
    queryFn:             () => apiFetch<AiSettings>("/api/admin/settings"),
    refetchOnWindowFocus: false,
  });
}

// ─── Ingest Sources ───────────────────────────────────────────────────────────

export function useIngestSources() {
  return useQuery<IngestSource[]>({
    queryKey:            queryKeys.ingestSources(),
    queryFn:             () => apiFetch<IngestSource[]>("/api/admin/sources"),
    refetchOnWindowFocus: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Publishes a pending event → auto-invalidates queue + published list */
export function usePublishMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PublishBody) =>
      fetch("/api/admin/publish", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Publish failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminQueue() });
      qc.invalidateQueries({ queryKey: queryKeys.publishedEvents() });
    },
  });
}

/** Updates a published event → auto-invalidates published list + map */
export function useUpdateEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventBody }) =>
      fetch(`/api/admin/events/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publishedEvents() });
      // Invalidate all map-event queries (bbox-keyed)
      qc.invalidateQueries({ queryKey: ["map-events"] });
    },
  });
}

/** Deletes a published event → auto-invalidates published list + map */
export function useDeletePublishedMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/events/${id}`, { method: "DELETE" }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publishedEvents() });
      qc.invalidateQueries({ queryKey: ["map-events"] });
    },
  });
}

/** Deletes a pending event from the queue */
export function useDeletePendingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/queue?id=${id}`, { method: "DELETE" }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminQueue() });
    },
  });
}

/** Clears the entire pending queue */
export function useClearQueueMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/admin/queue?id=all", { method: "DELETE" }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Clear failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminQueue() });
    },
  });
}

/** Triggers AI reprocessing of a pending event */
export function useReprocessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch("/api/admin/reprocess", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Reprocess failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminQueue() });
    },
  });
}

/** Switches the active AI provider */
export function useProviderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: "gemini" | "openai") =>
      fetch("/api/admin/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Switch failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSettings() });
    },
  });
}

/** Manually ingests raw intel text */
export function useManualIngestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { rawText: string; source?: string; sourceUrl?: string; imageUrl?: string }) =>
      fetch("/api/admin/queue/manual", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Ingest failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminQueue() });
    },
  });
}

/** Toggles an ingest source active/inactive */
export function useToggleSourceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch("/api/admin/sources", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, isActive }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Toggle failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ingestSources() });
    },
  });
}
