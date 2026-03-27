import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getImportHistory } from "@/lib/actions/imports";
import { CsvImportForm } from "@/components/settings/csv-import-form";

export default async function ImportPage() {
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

  const history = await getImportHistory();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">データ取込</h1>
        <p className="text-muted-foreground">
          CSVファイルをアップロードしてHRデータをインポートします
        </p>
      </div>
      <CsvImportForm history={history} />
    </div>
  );
}
