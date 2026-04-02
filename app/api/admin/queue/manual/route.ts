import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";
import { processIngestion } from "@/lib/ingest-pipeline";
import { ManualIngestBodySchema } from "@/lib/schemas";

/**
 * Allows authorized staff to manually ingest a raw report.
 * This triggers the full AI enrichment pipeline.
 */
export async function POST(req: Request) {
  if (!(await hasClearance("admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = ManualIngestBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.format() },
      { status: 400 }
    );
  }

  const { rawText, source, sourceUrl, imageUrl } = result.data;

  try {
    const eventId = await processIngestion(rawText, {
      source: source || "manual_admin",
      sourceUrl: sourceUrl ?? undefined,
      imageUrl:  imageUrl ?? undefined,
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
