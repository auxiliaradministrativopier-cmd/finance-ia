import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getScreen, type ScreenId } from "@/config/screens";

/** Tela reservada: mostra o objetivo e a fase do roadmap até a tela ser implementada. */
export function ScreenPlaceholder({ screen: id }: { screen: ScreenId }) {
  const screen = getScreen(id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={screen.title} description={screen.objective} />
      <Card className="items-center gap-4 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
          <Construction className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col items-center gap-2">
          <Badge tone="neutral">Fase {screen.phase} do roadmap</Badge>
          <p className="max-w-md text-body text-ink-muted">
            Esta é a tela {screen.number} do Mapa de Telas. A estrutura e a rota já estão prontas; o
            conteúdo chega na fase indicada.
          </p>
        </div>
      </Card>
    </div>
  );
}
