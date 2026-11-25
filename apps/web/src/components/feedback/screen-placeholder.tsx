import { ArrowLeft, Hourglass } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getScreen, type ScreenId } from "@/config/screens";

/**
 * Tela ainda não lançada: explica o que ela vai fazer e leva de volta ao app.
 * Ela não aparece nos menus (só por link direto); o conteúdo chega em uma próxima versão.
 */
export function ScreenPlaceholder({ screen: id }: { screen: ScreenId }) {
  const screen = getScreen(id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={screen.title} description={screen.objective} />
      <Card className="items-center gap-4 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
          <Hourglass className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col items-center gap-2">
          <Badge tone="neutral">Em breve</Badge>
          <p className="max-w-md text-body text-ink-muted">
            Estamos preparando esta área. Enquanto isso, o resto do Finance IA já está pronto para
            você usar.
          </p>
        </div>
        <Link href="/inicio" className={buttonVariants({ variant: "secondary" })}>
          <ArrowLeft aria-hidden="true" />
          Voltar para o início
        </Link>
      </Card>
    </div>
  );
}
