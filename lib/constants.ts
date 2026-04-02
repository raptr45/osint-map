/**
 * lib/constants.ts
 *
 * Shared UI constants extracted from map-view.tsx and queue/page.tsx.
 * Previously duplicated identically in both files — now single source.
 */

import {
  Activity,
  AlertTriangle,
  Bomb,
  Cross,
  Crosshair,
  Dam,
  Flame,
  Mic2,
  Orbit,
  Radio,
  Rocket,
  Shield,
  ShieldAlert,
  Ship,
  Skull,
  Target,
  Waves,
  type LucideIcon,
} from "lucide-react";

// ─── Event Type Icon Mapping ───────────────────────────────────────────────────
/** Maps an event type string to its Lucide icon component. */
export const ICON_MAPPING: Record<string, LucideIcon> = {
  airstrike:      Target,
  explosion:      Bomb,
  artillery:      Radio,
  missile:        Rocket,
  drone:          Orbit,
  armor:          Shield,
  ground_assault: Crosshair,
  police:         ShieldAlert,
  naval:          Ship,
  fire:           Flame,
  casualties:     Skull,
  wmd:            AlertTriangle,
  cyber:          Radio,
  infrastructure: Dam,
  disaster:       Waves,
  political:      Mic2,
  protest:        Mic2,
  humanitarian:   Cross,
  unknown:        Activity,
};

// ─── Event Type Display Labels ─────────────────────────────────────────────────
/** Maps an event type string to its human-readable label for UI display. */
export const EVENT_TYPE_LABELS: Record<string, { label: string }> = {
  airstrike:      { label: "Airstrike" },
  explosion:      { label: "Explosion" },
  artillery:      { label: "Artillery" },
  missile:        { label: "Missile" },
  drone:          { label: "Drone" },
  armor:          { label: "Armor" },
  ground_assault: { label: "Ground" },
  police:         { label: "Police" },
  naval:          { label: "Naval" },
  fire:           { label: "Fire" },
  casualties:     { label: "Casualties" },
  wmd:            { label: "WMD" },
  cyber:          { label: "Cyber" },
  infrastructure: { label: "Infra" },
  disaster:       { label: "Disaster" },
  political:      { label: "Political" },
  protest:        { label: "Protest" },
  humanitarian:   { label: "Aid" },
  unknown:        { label: "Unknown" },
};

// ─── Severity Styling ──────────────────────────────────────────────────────────
export const SEVERITY_COLORS = {
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
  high:     "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium:   "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  low:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
} as const;

// ─── Map Styles ────────────────────────────────────────────────────────────────
export const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/bright";
export const MAP_STYLE_DARK  = "https://tiles.openfreemap.org/styles/dark";
