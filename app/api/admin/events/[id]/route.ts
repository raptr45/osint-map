import { db } from "@/lib/db";
import { publishedEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";
import { UpdateEventBodySchema } from "@/lib/schemas";

export async function DELETE(
  _req: Request,
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

  // ── Validate request body ────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateEventBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const { title, description, severity, eventType, sourceUrl, imageUrl, sourceCreatedAt, lng, lat } =
      result.data;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (title       !== undefined) updateData.title       = title;
    if (description !== undefined) updateData.description = description;
    if (severity    !== undefined) updateData.severity    = severity;
    if (eventType   !== undefined) updateData.eventType   = eventType;
    if (sourceUrl   !== undefined) updateData.sourceUrl   = sourceUrl;
    if (imageUrl    !== undefined) updateData.imageUrl    = imageUrl;
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
