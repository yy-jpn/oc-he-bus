"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

export function Sidebar({
  pendingCandidateCount = 0,
}: {
  pendingCandidateCount?: number;
}) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
    { href: "/cases/new", label: "新規ケース作成", icon: "➕" },
    {
      href: "/candidates",
      label: "ケース候補",
      icon: "📋",
      badge: pendingCandidateCount > 0 ? pendingCandidateCount : undefined,
    },
    {
      href: "/settings",
      label: "設定",
      icon: "⚙️",
      children: [
        { href: "/settings/thresholds", label: "閾値設定", icon: "📏" },
        { href: "/settings/import", label: "データ取込", icon: "📥" },
      ],
    },
  ];

  const navContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="font-semibold text-sidebar-foreground" onClick={close}>
          休復職フロー管理
        </Link>
        <button
          type="button"
          onClick={close}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
          aria-label="サイドバーを閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>
      </div>
      <nav className="space-y-1 p-3">
        {navItems.map((item) => (
          <div key={item.href}>
            {item.children ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70">
                  <span>{item.icon}</span>
                  {item.label}
                </div>
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={close}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        pathname === child.href ||
                          pathname.startsWith(child.href + "/")
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <span>{child.icon}</span>
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href))
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={close} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
