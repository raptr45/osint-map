import { db } from "@/lib/db";
import { pendingEvents, publishedEvents, ingestSources } from "@/lib/schema";
import { user } from "@/lib/auth-schema";
import { count, eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";

export async function GET() {
  if (!(await hasClearance("analyst"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const [totalEventsCount] = await db.select({ value: count() }).from(publishedEvents);
    const [pendingCount] = await db.select({ value: count() }).from(pendingEvents).where(eq(pendingEvents.status, "pending"));
    const [usersCount] = await db.select({ value: count() }).from(user);
    const [activeSourcesCount] = await db.select({ value: count() }).from(ingestSources).where(eq(ingestSources.isActive, true));

    // Get current hour's activity to compare for trend (very basic implementation)
    const hourAgo = new Date(Date.now() - 3600000);
    const [newEventsLastHour] = await db.select({ value: count() })
      .from(publishedEvents)
      .where(sql`${publishedEvents.createdAt} > ${hourAgo}`);

    // Get recent activity (mix of pending and published)
    const recentPending = await db.select({
      id: pendingEvents.id,
      label: pendingEvents.rawSource,
      createdAt: pendingEvents.createdAt,
    })
    .from(pendingEvents)
    .orderBy(desc(pendingEvents.createdAt))
    .limit(5);

    // Mapping for consistent structure
    const activity = recentPending.map(p => ({
      type: "INGEST",
      label: p.label.length > 50 ? p.label.substring(0, 50) + "..." : p.label,
      time: p.createdAt,
      status: "emerald"
    }));

    // Mock chart data for now (since we don't have a time-series aggregation yet)
    const chartData = [40, 65, 45, 90, 85, 60, 75, 50, 40, 80, 95, 70];

    return NextResponse.json({
      stats: [
        { label: "Total Events", value: totalEventsCount.value.toLocaleString(), trend: newEventsLastHour.value > 0 ? `+${newEventsLastHour.value} new` : "Stable" }, 
        { label: "Active Nodes", value: activeSourcesCount.value.toString(), trend: "Live" }, 
        { label: "Pending Review", value: pendingCount.value.toString(), trend: pendingCount.value > 10 ? "High Priority" : "Manageable" },
        { label: "Verified Users", value: usersCount.value.toString(), trend: "Authorized" },
      ],
      activity,
      chartData
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
