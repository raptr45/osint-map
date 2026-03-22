import { db } from "@/lib/db";
import { pendingEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";
import { reprocessEvent } from "@/lib/ingest-pipeline";

export async function POST(request: Request) {
  if (!(await hasClearance("moderator"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

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
      return NextResponse.json({ 
        success: true, 
        message: "Intel successfully reprocessed." 
      });
    } else {
      return NextResponse.json({ 
        error: "AI enrichment failed. Check logs for details." 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to reprocess event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
