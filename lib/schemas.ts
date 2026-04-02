/**
 * lib/schemas.ts
 *
 * Single runtime source of truth for all Zod schemas.
 * Inferred TypeScript types replace all hand-written interfaces
 * in map-view.tsx, queue/page.tsx, and ai-parser.ts.
 */

import { z } from "zod";

// ─── Shared Enums ─────────────────────────────────────────────────────────────

export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const EventTypeSchema = z.enum([
  "airstrike",
  "explosion",
  "artillery",
  "missile",
  "drone",
  "armor",
  "ground_assault",
  "police",
  "naval",
  "fire",
  "casualties",
  "wmd",
  "cyber",
  "infrastructure",
  "disaster",
  "political",
  "protest",
  "humanitarian",
  "unknown",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const SourceTypeSchema = z.enum(["telegram", "rss", "x", "custom"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const RoleActionSchema = z.enum([
  "approve_admin",
  "approve_moderator",
  "approve_analyst",
  "reject",
  "demote",
]);
export type RoleAction = z.infer<typeof RoleActionSchema>;

export const AiProviderSchema = z.enum(["gemini", "openai"]);
export type AiProvider = z.infer<typeof AiProviderSchema>;

// ─── Public Map Event ─────────────────────────────────────────────────────────

/** Returned by GET /api/events — the client-side map marker type. */
export const MapEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  severity: SeveritySchema,
  eventType: z.string().nullable().optional(),
  lng: z.number(),
  lat: z.number(),
  imageUrl: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type MapEvent = z.infer<typeof MapEventSchema>;

/** Viewport query params for GET /api/events */
export const ViewportQuerySchema = z.object({
  minLng: z.coerce.number().min(-180).max(180),
  minLat: z.coerce.number().min(-90).max(90),
  maxLng: z.coerce.number().min(-180).max(180),
  maxLat: z.coerce.number().min(-90).max(90),
  hours: z.coerce.number().int().positive().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ViewportQuery = z.infer<typeof ViewportQuerySchema>;

// ─── Admin Queue (Pending Events) ─────────────────────────────────────────────

/** Returned by GET /api/admin/queue */
export const PendingEventSchema = z.object({
  id: z.string().uuid(),
  rawSource: z.string(),
  suggestedTitle: z.string().nullable(),
  suggestedDescription: z.string().nullable(),
  status: z.enum(["pending", "processing", "processed", "rejected", "failed"]),
  source: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sourceCreatedAt: z.string().nullable(),
  createdAt: z.string(),
  lng: z.number().nullable(),
  lat: z.number().nullable(),
  externalId: z.string().nullable(),
});
export type PendingEvent = z.infer<typeof PendingEventSchema>;

/** Returned by GET /api/admin/published */
export const PublishedEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  severity: SeveritySchema,
  eventType: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceCreatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lng: z.number().nullable(),
  lat: z.number().nullable(),
});
export type PublishedEvent = z.infer<typeof PublishedEventSchema>;

// ─── Admin API Request Bodies ─────────────────────────────────────────────────

/** POST /api/admin/publish */
export const PublishBodySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  severity: SeveritySchema,
  sourceUrl: z.string().nullable().optional(),
  eventType: EventTypeSchema.optional(),
  sourceCreatedAt: z.string().nullable().optional(),
});
export type PublishBody = z.infer<typeof PublishBodySchema>;

/** PATCH /api/admin/events/[id] */
export const UpdateEventBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  severity: SeveritySchema.optional(),
  eventType: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sourceCreatedAt: z.string().nullable().optional(),
  lng: z.number().min(-180).max(180).optional(),
  lat: z.number().min(-90).max(90).optional(),
});
export type UpdateEventBody = z.infer<typeof UpdateEventBodySchema>;

/** POST /api/admin/sources */
export const AddSourceBodySchema = z.object({
  type: SourceTypeSchema,
  value: z.string().min(1),
  name: z.string().optional(),
});
export type AddSourceBody = z.infer<typeof AddSourceBodySchema>;

/** PATCH /api/admin/sources */
export const ToggleSourceBodySchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});
export type ToggleSourceBody = z.infer<typeof ToggleSourceBodySchema>;

/** PATCH /api/admin/roles */
export const UpdateRoleBodySchema = z.object({
  userId: z.string().min(1),
  action: RoleActionSchema,
});
export type UpdateRoleBody = z.infer<typeof UpdateRoleBodySchema>;

/** POST /api/admin/settings */
export const ProviderBodySchema = z.object({
  provider: AiProviderSchema,
});
export type ProviderBody = z.infer<typeof ProviderBodySchema>;

/** POST /api/admin/reprocess */
export const ReprocessBodySchema = z.object({
  id: z.string().uuid(),
});
export type ReprocessBody = z.infer<typeof ReprocessBodySchema>;

/** POST /api/admin/queue/manual */
export const ManualIngestBodySchema = z.object({
  rawText: z.string().min(10),
  source: z.string().optional(),
  sourceUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});
export type ManualIngestBody = z.infer<typeof ManualIngestBodySchema>;

// ─── AI Pipeline ──────────────────────────────────────────────────────────────

/** Runtime-validated shape of AI parser output from Gemini / OpenAI. */
export const ParsedIntelSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  locationName: z.string().nullable(),
  severity: SeveritySchema,
});
export type ParsedIntel = z.infer<typeof ParsedIntelSchema>;

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export const AdminStatSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.string(),
});
export type AdminStat = z.infer<typeof AdminStatSchema>;

export const AdminActivitySchema = z.object({
  type: z.string(),
  label: z.string(),
  time: z.union([z.string(), z.date()]),
  status: z.string(),
});
export type AdminActivity = z.infer<typeof AdminActivitySchema>;

export const AdminStatsResponseSchema = z.object({
  stats: z.array(AdminStatSchema),
  activity: z.array(AdminActivitySchema),
  chartData: z.array(z.number()),
});
export type AdminStatsResponse = z.infer<typeof AdminStatsResponseSchema>;

// ─── Ingest Sources ───────────────────────────────────────────────────────────

export const IngestSourceSchema = z.object({
  id: z.string().uuid(),
  type: SourceTypeSchema,
  value: z.string(),
  name: z.string().nullable(),
  isActive: z.boolean(),
  lastFetchedAt: z.string().nullable(),
  createdAt: z.string(),
  signalsLast24h: z.number().optional(),
});
export type IngestSource = z.infer<typeof IngestSourceSchema>;

// ─── AI Settings ─────────────────────────────────────────────────────────────

export const AiSettingsSchema = z.object({
  provider: AiProviderSchema,
  envProvider: z.string(),
  hasGeminiKey: z.boolean(),
  hasOpenAIKey: z.boolean(),
});
export type AiSettings = z.infer<typeof AiSettingsSchema>;
