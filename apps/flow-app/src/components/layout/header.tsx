"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Header({ userName }: { userName: string }) {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="lg:hidden font-semibold">休復職フロー管理</div>
      <div className="flex items-center gap-4 ml-auto">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          ログアウト
        </Button>
      </div>
    </header>
  );
}
