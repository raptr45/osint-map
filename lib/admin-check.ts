import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function isAdmin() {
  const session = await getServerSession();
  return session?.user?.role === "admin";
}

export async function protectAdmin() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/login");
  }
  
  if (session.user.role !== "admin") {
    redirect("/");
  }
  
  return session;
}
