import { LogoMark } from "@/components/layout/logo";

/** Splash (tela 01): exibida enquanto a sessão é verificada. */
export function SplashScreen({ label = "Carregando o Finance IA" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-deep" role="status">
      <LogoMark className="size-16 animate-shimmer" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
