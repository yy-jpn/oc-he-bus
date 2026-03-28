import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getConnections } from "@/lib/actions/connections";
import { ConnectionList } from "@/components/settings/connection-list";
import { DataCoverageBanner } from "@/components/settings/data-coverage-banner";
import { getAdapterDefinition } from "@/lib/hr-integration/adapters/registry";

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

  // 全接続のカバー済みデータ種別を集約
  const coveredDataTypes = new Set<string>();
  for (const conn of connections) {
    const adapterDef = getAdapterDefinition(conn.adapterType);
    if (adapterDef) {
      for (const dt of adapterDef.supportedDataTypes) {
        coveredDataTypes.add(dt);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API連携</h1>
        <p className="text-muted-foreground">
          外部HRサービスと連携して、データを自動で取り込みます
        </p>
      </div>
      {connections.length > 0 && (
        <DataCoverageBanner coveredDataTypes={Array.from(coveredDataTypes)} />
      )}
      <ConnectionList connections={connections} />
    </div>
  );
}
