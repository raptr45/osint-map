import { create } from "zustand";
import type { Severity } from "@/lib/schemas";

interface QueueState {
  // Pending Form State
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDesc: string;
  setEditDesc: (v: string) => void;
  editSourceUrl: string;
  setEditSourceUrl: (v: string) => void;
  editSeverity: Severity;
  setEditSeverity: (v: Severity) => void;
  editEventType: string;
  setEditEventType: (v: string) => void;
  editEventTime: string;
  setEditEventTime: (v: string) => void;
  editPos: { lng: number; lat: number } | null;
  setEditPos: (pos: { lng: number; lat: number } | null) => void;

  // Published Form State
  pubTitle: string;
  setPubTitle: (v: string) => void;
  pubDesc: string;
  setPubDesc: (v: string) => void;
  pubSourceUrl: string;
  setPubSourceUrl: (v: string) => void;
  pubImageUrl: string;
  setPubImageUrl: (v: string) => void;
  pubSeverity: Severity;
  setPubSeverity: (v: Severity) => void;
  pubEventType: string;
  setPubEventType: (v: string) => void;
  pubEventTime: string;
  setPubEventTime: (v: string) => void;
  pubPos: { lng: number; lat: number } | null;
  setPubPos: (pos: { lng: number; lat: number } | null) => void;

  // Actions
  resetPendingState: () => void;
  resetPublishedState: () => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  editTitle: "",
  setEditTitle: (editTitle) => set({ editTitle }),
  editDesc: "",
  setEditDesc: (editDesc) => set({ editDesc }),
  editSourceUrl: "",
  setEditSourceUrl: (editSourceUrl) => set({ editSourceUrl }),
  editSeverity: "medium",
  setEditSeverity: (editSeverity) => set({ editSeverity }),
  editEventType: "unknown",
  setEditEventType: (editEventType) => set({ editEventType }),
  editEventTime: "",
  setEditEventTime: (editEventTime) => set({ editEventTime }),
  editPos: null,
  setEditPos: (editPos) => set({ editPos }),

  pubTitle: "",
  setPubTitle: (pubTitle) => set({ pubTitle }),
  pubDesc: "",
  setPubDesc: (pubDesc) => set({ pubDesc }),
  pubSourceUrl: "",
  setPubSourceUrl: (pubSourceUrl) => set({ pubSourceUrl }),
  pubImageUrl: "",
  setPubImageUrl: (pubImageUrl) => set({ pubImageUrl }),
  pubSeverity: "medium",
  setPubSeverity: (pubSeverity) => set({ pubSeverity }),
  pubEventType: "unknown",
  setPubEventType: (pubEventType) => set({ pubEventType }),
  pubEventTime: "",
  setPubEventTime: (pubEventTime) => set({ pubEventTime }),
  pubPos: null,
  setPubPos: (pubPos) => set({ pubPos }),

  resetPendingState: () =>
    set({
      editTitle: "",
      editDesc: "",
      editSourceUrl: "",
      editSeverity: "medium",
      editEventType: "unknown",
      editEventTime: "",
      editPos: null,
    }),

  resetPublishedState: () =>
    set({
      pubTitle: "",
      pubDesc: "",
      pubSourceUrl: "",
      pubImageUrl: "",
      pubSeverity: "medium",
      pubEventType: "unknown",
      pubEventTime: "",
      pubPos: null,
    }),
}));
