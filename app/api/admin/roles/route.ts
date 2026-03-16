import { db } from "@/lib/db";
import { user } from "@/lib/auth-schema";
import { eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-check";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const requests = await db.select()
      .from(user)
      .where(isNotNull(user.roleRequest));

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch role requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { userId, action } = await req.json(); // action: "approve" or "reject"

    if (action === "approve") {
      await db.update(user)
        .set({ role: "admin", roleRequest: null })
        .where(eq(user.id, userId));
    } else {
      await db.update(user)
        .set({ roleRequest: "rejected" })
        .where(eq(user.id, userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
