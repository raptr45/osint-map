import { pgTable, text, timestamp, uuid, customType, boolean, jsonb } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Custom type for PostGIS geometry supporting WGS84 (SRID 4326)
const geometry = customType<{ data: string }>( {
  dataType() {
    return "geometry(Point, 4326)";
  },
});

export const publishedEvents = pgTable("published_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  severity: text("severity").$type<"low" | "medium" | "high" | "critical">().default("low").notNull(),
  imageUrl: text("image_url"),
  sourceMetadata: jsonb("source_metadata"),
  coordinates: geometry("coordinates").notNull(),
  userId: text("user_id").references(() => user.id),
  sourceCreatedAt: timestamp("source_created_at"), // Original Telegram/RSS time
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const pendingEvents = pgTable("pending_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").unique(), // tg_channel_msgid
  source: text("source"), // e.g. "liveuamap"
  rawSource: text("raw_source").notNull(), // Original scrape content (Telegram/RSS/Social)
  suggestedTitle: text("suggested_title"),
  suggestedDescription: text("suggested_description"),
  suggestedCoordinates: geometry("suggested_coordinates"),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"), // Direct link back to the original post
  sourceMetadata: jsonb("source_metadata"),
  status: text("status").$type<"pending" | "processing" | "processed" | "rejected" | "failed">().default("pending"),
  sourceCreatedAt: timestamp("source_created_at"), // Original Telegram/RSS time
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  level: text("level").$type<"info" | "warn" | "error">().default("info").notNull(),
  module: text("module").notNull(), // e.g. "INGEST", "AI", "AUTH"
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ingestSources = pgTable("ingest_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").$type<"telegram" | "rss" | "x" | "custom">().notNull(),
  value: text("value").notNull(), // username or URL
  name: text("name"), // display name
  isActive: boolean("is_active").default(true).notNull(),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
