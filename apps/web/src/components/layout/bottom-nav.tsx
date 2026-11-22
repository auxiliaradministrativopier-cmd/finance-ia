"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isTabActive, tabNavigation, type TabItem } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { NewEntrySheet } from "./new-entry-sheet";

function Tab({ tab, active }: { tab: TabItem; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] leading-[14px] font-medium text-ink-muted",
        active && "text-brand",
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
      {tab.label}
    </Link>
  );
}

/** Barra inferior do celular: 4 abas e o botão central de novo lançamento. */
export function BottomNav() {
  const pathname = usePathname();
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [first, second, third, fourth] = tabNavigation;

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-safe lg:hidden"
      >
        <div className="mx-auto grid h-tabbar max-w-lg grid-cols-5 items-center px-2">
          <Tab tab={first} active={isTabActive(pathname, first)} />
          <Tab tab={second} active={isTabActive(pathname, second)} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setNewEntryOpen(true)}
              aria-label="Novo lançamento"
              className="-mt-5 flex size-control-lg cursor-pointer items-center justify-center rounded-full bg-brand text-on-brand shadow-md transition-[filter] hover:brightness-[.92] active:brightness-[.86]"
            >
              <Plus className="size-6" aria-hidden="true" />
            </button>
          </div>
          <Tab tab={third} active={isTabActive(pathname, third)} />
          <Tab tab={fourth} active={isTabActive(pathname, fourth)} />
        </div>
      </nav>
      <NewEntrySheet open={newEntryOpen} onOpenChange={setNewEntryOpen} />
    </>
  );
}
