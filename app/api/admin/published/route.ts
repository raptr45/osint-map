import { db } from "@/lib/db";
import { publishedEvents } from "@/lib/schema";
import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";

export async function GET() {
  if (!(await hasClearance("analyst"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const events = await db.select({
      id: publishedEvents.id,
      title: publishedEvents.title,
      description: publishedEvents.description,
      severity: publishedEvents.severity,
      eventType: publishedEvents.eventType,
      imageUrl: publishedEvents.imageUrl,
      sourceUrl: publishedEvents.sourceUrl,
      sourceCreatedAt: publishedEvents.sourceCreatedAt,
      createdAt: publishedEvents.createdAt,
      updatedAt: publishedEvents.updatedAt,
      lng: sql<number | null>`ST_X(${publishedEvents.coordinates})`,
      lat: sql<number | null>`ST_Y(${publishedEvents.coordinates})`,
    })
    .from(publishedEvents)
    .orderBy(desc(publishedEvents.createdAt))
    .limit(200);

    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch published events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
