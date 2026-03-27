import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { getPendingCandidateCount } from "@/lib/actions/candidates";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile from users table
  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const userName = profile?.name || user.email || "";
  const pendingCount = await getPendingCandidateCount();

  return (
    <SidebarProvider>
      <div className="flex h-full">
        <Sidebar pendingCandidateCount={pendingCount} />
        <div className="flex flex-1 flex-col min-w-0">
          <Header userName={userName} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
