import { ChevronRight, Gauge, PiggyBank, Receipt, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getScreen, isScreenAvailable, type ScreenId } from "@/config/screens";

const tools: { screen: ScreenId; icon: LucideIcon }[] = [
  { screen: "provisionamentos", icon: PiggyBank },
  { screen: "dividas", icon: Receipt },
  { screen: "saude-financeira", icon: Gauge },
  { screen: "ia", icon: Sparkles },
];

/** Tela 31: Planejar. Reúne as ferramentas que olham para o futuro. */
export function PlanningPage() {
  const available = tools
    .map((tool) => ({ ...tool, info: getScreen(tool.screen) }))
    .filter((tool) => isScreenAvailable(tool.info.route));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Planejar"
        description="Prepare-se para as despesas que vêm aí, organize as dívidas e acompanhe sua saúde financeira."
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {available.map(({ screen, icon: Icon, info }) => (
          <li key={screen}>
            <Card as="article" className="h-full p-0">
              <Link
                href={info.route}
                className="flex h-full items-start gap-3 rounded-lg p-4 transition-colors hover:bg-surface-sunken"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-h3">{info.title}</span>
                  <span className="text-body text-ink-muted">{info.objective}</span>
                </span>
                <ChevronRight className="mt-1 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
