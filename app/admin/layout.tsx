import { protectAdmin } from "@/lib/admin-check";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectAdmin();

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <AdminSidebar />
      <main className="flex-1 pl-64 transition-all duration-300">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
