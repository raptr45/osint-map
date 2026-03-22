import { db } from "@/lib/db";
import { pendingEvents } from "@/lib/schema";
import { desc, sql, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";

export async function GET() {
  if (!(await hasClearance("analyst"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const queue = await db.select({
      id: pendingEvents.id,
      rawSource: pendingEvents.rawSource,
      suggestedTitle: pendingEvents.suggestedTitle,
      suggestedDescription: pendingEvents.suggestedDescription,
      status: pendingEvents.status,
      source: pendingEvents.source,
      sourceCreatedAt: pendingEvents.sourceCreatedAt,
      createdAt: pendingEvents.createdAt,
      externalId: pendingEvents.externalId,
      lng: sql<number | null>`ST_X(${pendingEvents.suggestedCoordinates})`,
      lat: sql<number | null>`ST_Y(${pendingEvents.suggestedCoordinates})`,
    })
    .from(pendingEvents)
    .orderBy(desc(sql`COALESCE(${pendingEvents.sourceCreatedAt}, ${pendingEvents.createdAt})`));

    return NextResponse.json(queue);
  } catch (error) {
    console.error("Failed to fetch moderation queue:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await hasClearance("moderator"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    if (id === "all") {
      await db.delete(pendingEvents);
      return NextResponse.json({ success: true, message: "Queue cleared" });
    }
    
    await db.delete(pendingEvents).where(eq(pendingEvents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
