import { db } from "@/lib/db";
import { pendingEvents, publishedEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { pointSql } from "@/lib/map-logic";
import { getServerSession, hasClearance } from "@/lib/admin-check";
import { PublishBodySchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !(await hasClearance("moderator"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userId = session.user.id;

  // ── Validate request body ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = PublishBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.format() },
      { status: 400 }
    );
  }

  const { id, title, description, lng, lat, severity, sourceUrl, eventType, sourceCreatedAt } =
    result.data;

  try {
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
      title:       title || pending.suggestedTitle || "Untitled Event",
      description: description ?? pending.suggestedDescription ?? "",
      severity,
      eventType:   eventType ?? "unknown",
      imageUrl:    pending.imageUrl,
      sourceUrl:   sourceUrl ?? pending.sourceUrl,
      sourceMetadata: pending.sourceMetadata,
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
