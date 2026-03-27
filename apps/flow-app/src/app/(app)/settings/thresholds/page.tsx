import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getThresholdSettings } from "@/lib/actions/threshold-settings";
import { ThresholdSettingsForm } from "@/components/settings/threshold-settings-form";

export default async function ThresholdSettingsPage() {
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

  const settings = await getThresholdSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">閾値設定</h1>
        <p className="text-muted-foreground">
          各ルールの有効/無効、パラメータ、自動承認の設定を管理します
        </p>
      </div>
      <ThresholdSettingsForm settings={settings} />
    </div>
  );
}
