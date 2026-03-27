import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCandidates } from "@/lib/actions/candidates";
import { CandidateList } from "@/components/candidates/candidate-list";

export default async function CandidatesPage() {
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

  const candidates = await getCandidates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ケース候補</h1>
        <p className="text-muted-foreground">
          自動検知されたケース候補の承認・却下を行います
        </p>
      </div>
      <CandidateList candidates={candidates} />
    </div>
  );
}
