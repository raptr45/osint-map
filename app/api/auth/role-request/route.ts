import { db } from "@/lib/db";
import { user } from "@/lib/auth-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/admin-check";

export async function POST() {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.update(user)
      .set({ roleRequest: "pending" })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to request role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
