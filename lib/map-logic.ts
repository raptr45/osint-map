import { sql } from "drizzle-orm";
import { publishedEvents } from "./schema";
import { db } from "./db";

/**
 * Fetches events within a given map bounding box.
 * @param minLng - Minimum longitude (West)
 * @param minLat - Minimum latitude (South)
 * @param maxLng - Maximum longitude (East)
 * @param maxLat - Maximum latitude (North)
 */
export async function getEventsInViewport(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  hours?: number,
  from?: Date,
  to?: Date
) {
  const whereClause = [
    sql`ST_Within(
      ${publishedEvents.coordinates}, 
      ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
    )`
  ];

  if (from && to) {
    // Custom date range takes priority over hours preset
    whereClause.push(sql`${publishedEvents.createdAt} >= ${from.toISOString()}`);
    whereClause.push(sql`${publishedEvents.createdAt} <= ${to.toISOString()}`);
  } else if (hours) {
    whereClause.push(sql`${publishedEvents.createdAt} >= NOW() - INTERVAL '${sql.raw(hours.toString())} hours'`);
  }

  return await db.select({
    id: publishedEvents.id,
    title: publishedEvents.title,
    description: publishedEvents.description,
    severity: publishedEvents.severity,
    eventType: publishedEvents.eventType,
    imageUrl: publishedEvents.imageUrl,
    sourceUrl: publishedEvents.sourceUrl,
    createdAt: publishedEvents.createdAt,
    lng: sql<number>`ST_X(${publishedEvents.coordinates})`,
    lat: sql<number>`ST_Y(${publishedEvents.coordinates})`,
  }).from(publishedEvents).where(sql.join(whereClause, sql` AND `));
}

/**
 * Utility to convert coordinates to a PostGIS Point SQL fragment
 */
export function pointSql(lng: number, lat: number) {
  return sql`ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)`;
}
