import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdapterDefinitions } from "@/lib/actions/connections";
import { ConnectionForm } from "@/components/settings/connection-form";

export default async function NewConnectionPage() {
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

  const adapters = await getAdapterDefinitions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">新しいAPI連携を追加</h1>
        <p className="text-muted-foreground">
          外部HRサービスとの接続を設定します
        </p>
      </div>
      <ConnectionForm adapters={adapters} />
    </div>
  );
}
