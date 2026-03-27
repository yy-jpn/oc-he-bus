import { createClient } from "@/lib/supabase/server";
import { TriggerForm } from "@/components/cases/trigger-form";
import { redirect } from "next/navigation";

export default async function NewCasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, department, employee_code")
    .eq("company_id", profile.company_id!)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <TriggerForm employees={employees ?? []} />
    </div>
  );
}
