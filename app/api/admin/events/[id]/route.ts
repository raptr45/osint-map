import { db } from "@/lib/db";
import { publishedEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasClearance("moderator"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await db.delete(publishedEvents).where(eq(publishedEvents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasClearance("moderator"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { title, description, severity, eventType, lng, lat, sourceUrl, imageUrl, sourceCreatedAt } = await req.json();

    const updateData: Record<string, unknown> = {
      title,
      description,
      severity,
      updatedAt: new Date(),
    };

    if (eventType !== undefined) updateData.eventType = eventType;
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (sourceCreatedAt !== undefined) {
      updateData.sourceCreatedAt = sourceCreatedAt ? new Date(sourceCreatedAt) : null;
    }

    if (lng !== undefined && lat !== undefined) {
      const { pointSql } = await import("@/lib/map-logic");
      updateData.coordinates = pointSql(lng, lat);
    }

    await db.update(publishedEvents)
      .set(updateData)
      .where(eq(publishedEvents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
