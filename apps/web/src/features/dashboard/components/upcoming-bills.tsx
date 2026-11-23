import { CalendarClock, CreditCard, Landmark, PiggyBank, Receipt } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { daysUntil } from "../data/derived";
import { formatDayMonth } from "@/lib/format";
import type { BillKind, DashboardData } from "../data/types";
import { ListCard } from "./list-card";

const kindIcon: Record<BillKind, React.ComponentType<{ className?: string }>> = {
  invoice: CreditCard,
  bill: Receipt,
  provision: PiggyBank,
  debt: Landmark,
};

function dueLabel(days: number): { text: string; tone: "danger" | "warning" | "neutral" } {
  if (days < 0) return { text: "Atrasada", tone: "danger" };
  if (days === 0) return { text: "Vence hoje", tone: "danger" };
  if (days === 1) return { text: "Amanhã", tone: "warning" };
  if (days <= 3) return { text: `Em ${days} dias`, tone: "warning" };
  return { text: `Em ${days} dias`, tone: "neutral" };
}

export function UpcomingBills({ data }: { data: DashboardData }) {
  const bills = [...data.upcomingBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <ListCard
      id="proximas-contas"
      title="Próximas contas"
      action={{ label: "Agenda", href: "/fluxo" }}
    >
      {bills.length === 0 ? (
        <p className="py-6 text-center text-body text-ink-muted">
          Nenhuma conta prevista para os próximos 30 dias.
        </p>
      ) : null}
      <ul className="flex flex-col">
        {bills.map((bill) => {
          const Icon = kindIcon[bill.kind];
          const due = dueLabel(daysUntil(data.today, bill.dueDate));
          return (
            <li
              key={bill.id}
              className="flex items-center gap-3 border-b border-line py-3 last:border-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
                <Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">{bill.title}</span>
                <span className="text-caption text-ink-muted">
                  {formatDayMonth(bill.dueDate)} · {bill.account}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Amount cents={bill.amount} className="text-amount font-medium" />
                <Badge
                  tone={due.tone}
                  icon={due.tone !== "neutral" ? <CalendarClock aria-hidden="true" /> : undefined}
                >
                  {due.text}
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>
      {bills.length > 0 ? (
        <p className="flex justify-between border-t border-line pt-3 text-caption text-ink-muted">
          <span>Total nos próximos 30 dias</span>
          <Amount cents={total} className="font-semibold text-ink" />
        </p>
      ) : null}
    </ListCard>
  );
}
