import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getConnections } from "@/lib/actions/connections";
import { ConnectionList } from "@/components/settings/connection-list";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  const connections = await getConnections();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API連携</h1>
        <p className="text-muted-foreground">
          外部HRサービスと連携して、データを自動で取り込みます
        </p>
      </div>
      <ConnectionList connections={connections} />
    </div>
  );
}
