import { protectAdmin } from "@/lib/admin-check";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect to login or home if the user is not an admin
  await protectAdmin();

  return <>{children}</>;
}
