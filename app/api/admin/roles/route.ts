import { db } from "@/lib/db";
import { user } from "@/lib/auth-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-check";
import { UpdateRoleBodySchema } from "@/lib/schemas";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const allUsers = await db.select().from(user);
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateRoleBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.format() },
      { status: 400 }
    );
  }

  const { userId, action } = result.data;

  try {
    if (action.startsWith("approve_")) {
      const targetRole = action.split("approve_")[1] as "admin" | "moderator" | "analyst";
      await db.update(user)
        .set({ role: targetRole, roleRequest: null })
        .where(eq(user.id, userId));
    } else if (action === "reject") {
      await db.update(user)
        .set({ roleRequest: "rejected" })
        .where(eq(user.id, userId));
    } else if (action === "demote") {
      await db.update(user)
        .set({ role: "user", roleRequest: null })
        .where(eq(user.id, userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
