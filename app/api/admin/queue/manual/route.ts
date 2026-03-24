import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";
import { processIngestion } from "@/lib/ingest-pipeline";

/**
 * Allows authorized staff to manually ingest a raw report.
 * This triggers the full AI enrichment pipeline.
 */
export async function POST(req: Request) {
  if (!(await hasClearance("admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { rawText, source, sourceUrl, imageUrl } = await req.json();

    if (!rawText || rawText.length < 10) {
      return NextResponse.json({ error: "Report text too short (min 10 chars)" }, { status: 400 });
    }

    const eventId = await processIngestion(rawText, {
      source: source || "manual_admin",
      sourceUrl,
      imageUrl,
      sourceCreatedAt: new Date(),
    });

    if (!eventId) {
      return NextResponse.json({ error: "Ingestion failed or duplicate" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: eventId });
  } catch (error) {
    console.error("Manual ingestion failure:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
