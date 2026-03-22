import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export type ClearanceLevel = "owner" | "admin" | "moderator" | "analyst" | "user";

const ROLE_RANKS: Record<ClearanceLevel, number> = {
  owner: 4,
  admin: 4,
  moderator: 3,
  analyst: 2,
  user: 1
};

export async function hasClearance(requiredLevel: ClearanceLevel) {
  const session = await getServerSession();
  if (!session) return false;
  
  const userRank = ROLE_RANKS[session.user.role as ClearanceLevel] || 1;
  const requiredRank = ROLE_RANKS[requiredLevel];
  return userRank >= requiredRank;
}

export async function requireClearance(requiredLevel: ClearanceLevel) {
  const session = await getServerSession();
  if (!session) redirect("/auth/sign-in");
  
  const userRank = ROLE_RANKS[session.user.role as ClearanceLevel] || 1;
  const requiredRank = ROLE_RANKS[requiredLevel];
  if (userRank < requiredRank) redirect("/");
  
  return session;
}

// Deprecated backwards compatibility flags
export async function isAdmin() {
  return await hasClearance("admin");
}

export async function protectAdmin() {
  return await requireClearance("analyst"); // By default, let analysts view the admin layout
}
