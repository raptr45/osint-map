/**
 * lib/stores/map-store.ts
 *
 * Zustand store for all map-level client state that was previously
 * scattered across 12+ useState() calls inside map-view.tsx.
 *
 * Benefits:
 * - MapView, MapSidebar, MapPopup can all read/write the same state
 *   without prop-drilling
 * - Future features (satellite feed panel, mini-map overlay) can
 *   react to selectedEvent / bbox without touching MapView at all
 * - Selector-based subscriptions prevent unnecessary re-renders
 */

import { create } from "zustand";
import type { MapEvent } from "@/lib/schemas";

interface MapStore {
  // ── Viewport ────────────────────────────────────────────────────────────
  bbox: number[] | null;
  setBbox: (bbox: number[]) => void;

  // ── Selection ────────────────────────────────────────────────────────────
  selectedEvent: MapEvent | null;
  setSelectedEvent: (event: MapEvent | null) => void;

  // ── Sidebar ──────────────────────────────────────────────────────────────
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // ── Edit Mode ────────────────────────────────────────────────────────────
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;

  // ── Lightbox ─────────────────────────────────────────────────────────────
  lightboxUrl: string | null;
  setLightboxUrl: (url: string | null) => void;

  // ── Draggable Marker Position ─────────────────────────────────────────────
  tempPos: { lng: number; lat: number } | null;
  setTempPos: (pos: { lng: number; lat: number } | null) => void;

  // ── Cluster Filter ────────────────────────────────────────────────────────
  clusterFilter: string[] | null;
  setClusterFilter: (ids: string[] | null) => void;

  // ── Event Type Filter ─────────────────────────────────────────────────────
  eventTypeFilter: string | null;
  setEventTypeFilter: (type: string | null) => void;

  // ── Theater GeoJSON ───────────────────────────────────────────────────────
  theaterGeoJson: GeoJSON.FeatureCollection | null;
  setTheaterGeoJson: (data: GeoJSON.FeatureCollection | null) => void;

  // ── Compound Actions ──────────────────────────────────────────────────────
  /** Selects an event and clears cluster filter */
  selectEvent: (event: MapEvent) => void;
  /** Closes the popup, exits edit mode, clears temp position */
  closePopup: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  // ── Viewport ──────────────────────────────────────────────────────────────
  bbox:    null,
  setBbox: (bbox) => set({ bbox }),

  // ── Selection ─────────────────────────────────────────────────────────────
  selectedEvent:    null,
  setSelectedEvent: (event) => set({ selectedEvent: event }),

  // ── Sidebar ───────────────────────────────────────────────────────────────
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  // ── Edit Mode ─────────────────────────────────────────────────────────────
  isEditing:    false,
  setIsEditing: (val) => set({ isEditing: val }),

  // ── Lightbox ──────────────────────────────────────────────────────────────
  lightboxUrl:    null,
  setLightboxUrl: (url) => set({ lightboxUrl: url }),

  // ── Draggable Marker ──────────────────────────────────────────────────────
  tempPos:    null,
  setTempPos: (pos) => set({ tempPos: pos }),

  // ── Cluster Filter ────────────────────────────────────────────────────────
  clusterFilter:    null,
  setClusterFilter: (ids) => set({ clusterFilter: ids }),

  // ── Event Type Filter ─────────────────────────────────────────────────────
  eventTypeFilter:    null,
  setEventTypeFilter: (type) => set({ eventTypeFilter: type }),

  // ── Theater GeoJSON ───────────────────────────────────────────────────────
  theaterGeoJson:    null,
  setTheaterGeoJson: (data) => set({ theaterGeoJson: data }),

  // ── Compound Actions ──────────────────────────────────────────────────────
  selectEvent: (event) =>
    set({ selectedEvent: event, clusterFilter: null }),

  closePopup: () =>
    set({ selectedEvent: null, isEditing: false, tempPos: null }),
}));
