import { NextRequest, NextResponse } from "next/server";
import { getEventsInViewport } from "@/lib/map-logic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  const minLng = parseFloat(searchParams.get("minLng") || "");
  const minLat = parseFloat(searchParams.get("minLat") || "");
  const maxLng = parseFloat(searchParams.get("maxLng") || "");
  const maxLat = parseFloat(searchParams.get("maxLat") || "");

  if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
    return NextResponse.json({ error: "Invalid bounding box coordinates" }, { status: 400 });
  }

  try {
    const events = await getEventsInViewport(minLng, minLat, maxLng, maxLat);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch viewport events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
