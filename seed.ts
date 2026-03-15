import "dotenv/config";
import { db } from "./lib/db";
import { publishedEvents } from "./lib/schema";
import { pointSql } from "./lib/map-logic";

async function seed() {
  console.log("🌱 Seeding OSINT events...");

  const mockEvents = [
    {
      title: "Tactical Movement Detected",
      description: "Unconfirmed reports of mechanized units moving south of Kyiv.",
      severity: "high" as const,
      lng: 30.5234,
      lat: 50.4501,
    },
    {
      title: "Infrastructure Strike",
      description: "Precision strike reported on energy facility near Kharkiv.",
      severity: "critical" as const,
      lng: 36.2304,
      lat: 49.9935,
    },
    {
      title: "Humanitarian Corridor Open",
      description: "Local authorities confirmed a temporary ceasefire for evacuation.",
      severity: "medium" as const,
      lng: 37.6173,
      lat: 47.0951,
    },
    {
      title: "Electronic Warfare Signal",
      description: "Significant GPS jamming detected in the Black Sea region.",
      severity: "low" as const,
      lng: 33.5224,
      lat: 44.6167,
    }
  ];

  for (const event of mockEvents) {
    await db.insert(publishedEvents).values({
      title: event.title,
      description: event.description,
      severity: event.severity,
      coordinates: pointSql(event.lng, event.lat),
    });
  }

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
