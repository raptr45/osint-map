import { NextRequest, NextResponse } from "next/server";
import { getEventsInViewport } from "@/lib/map-logic";
import { ViewportQuerySchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const result = ViewportQuerySchema.safeParse({
    minLng: searchParams.get("minLng"),
    minLat: searchParams.get("minLat"),
    maxLng: searchParams.get("maxLng"),
    maxLat: searchParams.get("maxLat"),
    hours:  searchParams.get("hours")  ?? undefined,
    from:   searchParams.get("from")   ?? undefined,
    to:     searchParams.get("to")     ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: result.error.format() },
      { status: 400 }
    );
  }

  const { minLng, minLat, maxLng, maxLat, hours, from, to } = result.data;

  const fromDate = from ? new Date(from) : undefined;
  // Set end of day for the "to" date
  const toDate = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : undefined;

  try {
    const events = await getEventsInViewport(
      minLng, minLat, maxLng, maxLat,
      hours,
      fromDate,
      toDate
    );
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch viewport events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
