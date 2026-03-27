"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/layout/sidebar-context";

export function Header({ userName }: { userName: string }) {
  const supabase = createClient();
  const router = useRouter();
  const { toggle } = useSidebar();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="サイドバーを開く"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <span className="font-semibold lg:hidden">休復職フロー管理</span>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          ログアウト
        </Button>
      </div>
    </header>
  );
}
