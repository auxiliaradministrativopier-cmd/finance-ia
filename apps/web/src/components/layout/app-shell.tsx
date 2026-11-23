import { DemoModeBanner } from "@/components/feedback/demo-mode-banner";
import { OfflineBanner } from "@/components/feedback/offline-banner";
import { TimeZoneSync } from "@/features/settings/time-zone-sync";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

/** Estrutura da área logada: menu lateral (desktop), barra superior, conteúdo e barra inferior (celular). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="flex min-h-dvh flex-col lg:pl-sidebar">
        <TimeZoneSync />
        <DemoModeBanner />
        <OfflineBanner />
        <TopBar />
        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto w-full max-w-content flex-1 px-4 pt-5 pb-[calc(var(--spacing-tabbar)+32px+env(safe-area-inset-bottom,0px))] outline-none lg:px-8 lg:pt-8 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
