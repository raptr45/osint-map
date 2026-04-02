import { db } from "@/lib/db";
import { pendingEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";
import { reprocessEvent } from "@/lib/ingest-pipeline";
import { ReprocessBodySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  if (!(await hasClearance("moderator"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = ReprocessBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.format() },
      { status: 400 }
    );
  }

  const { id } = result.data;

  try {
    const event = await db.query.pendingEvents.findFirst({
      where: eq(pendingEvents.id, id),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Trigger AI parsing for the existing record
    const success = await reprocessEvent(event.id, event.rawSource);

    if (success) {
      return NextResponse.json({ success: true, message: "Intel successfully reprocessed." });
    } else {
      return NextResponse.json(
        { error: "AI enrichment failed. Check logs for details." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to reprocess event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
