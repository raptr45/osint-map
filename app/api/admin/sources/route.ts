import { db } from "@/lib/db";
import { ingestSources, pendingEvents } from "@/lib/schema";
import { eq, sql, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-check";
import { AddSourceBodySchema, ToggleSourceBodySchema } from "@/lib/schemas";

export async function GET() {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const sources = await db.query.ingestSources.findMany({
    orderBy: (sources, { desc }) => [desc(sources.createdAt)],
  });

  // Get signal counts (last 24h) per source
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const counts = await db
    .select({
      source: pendingEvents.source,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(pendingEvents)
    .where(gte(pendingEvents.createdAt, since))
    .groupBy(pendingEvents.source);

  const countMap = Object.fromEntries(counts.map((c) => [c.source, c.count]));

  const enriched = sources.map((s) => ({
    ...s,
    signalsLast24h: countMap[s.value] ?? 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const result = AddSourceBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.format() },
      { status: 400 }
    );
  }

  const { type, value, name } = result.data;

  const [newSource] = await db
    .insert(ingestSources)
    .values({ type, value, name: name || value, isActive: true })
    .returning();

  return NextResponse.json(newSource);
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const result = ToggleSourceBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.format() },
      { status: 400 }
    );
  }

  const { id, isActive } = result.data;

  const [updated] = await db
    .update(ingestSources)
    .set({ isActive })
    .where(eq(ingestSources.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  await db.delete(ingestSources).where(eq(ingestSources.id, id));
  return new NextResponse("Deleted", { status: 200 });
}
