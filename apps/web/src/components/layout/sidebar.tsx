"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  accountNavigation,
  allSidebarHrefs,
  findActiveHref,
  sidebarNavigation,
  type NavItem,
} from "@/config/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { NewEntrySheet } from "./new-entry-sheet";
import { ThemeToggle } from "./theme-toggle";

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-body text-ink transition-colors hover:bg-surface-sunken",
        active && "bg-brand-soft font-semibold text-brand hover:bg-brand-soft",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

/** Menu lateral fixo do desktop (a partir de 1024px). */
export function Sidebar() {
  const pathname = usePathname();
  const activeHref = findActiveHref(pathname, allSidebarHrefs);
  const [newEntryOpen, setNewEntryOpen] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/inicio" aria-label="Finance IA, ir para o início" className="rounded-md">
          <Logo />
        </Link>
      </div>
      <div className="px-3 pb-2">
        <Button block onClick={() => setNewEntryOpen(true)}>
          <Plus aria-hidden="true" />
          Novo lançamento
        </Button>
      </div>
      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3 pb-4">
        {sidebarNavigation.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-3 pt-5 pb-1 text-overline font-semibold tracking-[0.06em] text-ink-muted uppercase">
              {group.label}
            </p>
            {group.items.map((item) => (
              <SidebarLink key={item.href} item={item} active={activeHref === item.href} />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-3 border-t border-line p-3">
        <div className="flex flex-col gap-0.5">
          {accountNavigation.map((item) => (
            <SidebarLink key={item.href} item={item} active={activeHref === item.href} />
          ))}
        </div>
        <ThemeToggle compact className="w-full" />
      </div>
      <NewEntrySheet open={newEntryOpen} onOpenChange={setNewEntryOpen} />
    </aside>
  );
}
