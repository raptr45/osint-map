import { db } from "@/lib/db";
import { pendingEvents, publishedEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { pointSql } from "@/lib/map-logic";
import { getServerSession, hasClearance } from "@/lib/admin-check";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !(await hasClearance("moderator"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userId = session.user.id;
  try {
    const {
      id,
      title,
      description,
      lng,
      lat,
      severity,
      sourceUrl,
      eventType,
      sourceCreatedAt,
    } = await req.json();

    // 1. Get the pending event
    const [pending] = await db
      .select()
      .from(pendingEvents)
      .where(eq(pendingEvents.id, id));
    if (!pending) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 2. Insert into published_events
    await db.insert(publishedEvents).values({
      title: title || pending.suggestedTitle || "Untitled Event",
      description: description || pending.suggestedDescription || "",
      severity: severity || "medium",
      eventType: eventType || "unknown",
      imageUrl: pending.imageUrl,
      sourceUrl: sourceUrl || pending.sourceUrl,
      sourceMetadata: pending.sourceMetadata,
      // Admin-set time takes priority; fall back to original source time
      sourceCreatedAt: sourceCreatedAt
        ? new Date(sourceCreatedAt)
        : pending.sourceCreatedAt,
      coordinates: pointSql(lng, lat),
      userId,
    });

    // 3. Delete from pending_events
    await db.delete(pendingEvents).where(eq(pendingEvents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to publish event:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
