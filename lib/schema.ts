import { pgTable, text, timestamp, uuid, customType } from "drizzle-orm/pg-core";
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
  coordinates: geometry("coordinates").notNull(),
  userId: text("user_id").references(() => user.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const pendingEvents = pgTable("pending_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  rawSource: text("raw_source").notNull(), // Original scrape content (Telegram/RSS/Social)
  suggestedTitle: text("suggested_title"),
  suggestedDescription: text("suggested_description"),
  suggestedCoordinates: geometry("suggested_coordinates"),
  status: text("status").$type<"pending" | "processed" | "rejected">().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
