"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Card, Overline } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { useAuth } from "@/features/auth/auth-provider";
import { debtGroups, type DebtGroup } from "../kinds";
import type { Debt, DebtView } from "../types";
import { getDebtService, useDebts } from "../use-debts";
import { DebtCard } from "./debt-card";
import { DebtFormSheet } from "./debt-form-sheet";
import { PaymentSheet } from "./payment-sheet";

/** Tela 39: Dívidas. */
export function DebtsPage() {
  const { user } = useAuth();
  const { status, error, views, summary, today } = useDebts();
  const accounts = useLiveList(getRepositories().accounts);
  const toast = useToast();
  const service = getDebtService();
  const [form, setForm] = useState<{ open: boolean; debt: Debt | null; group?: DebtGroup }>({
    open: false,
    debt: null,
  });
  const [payingId, setPayingId] = useState<string | null>(null);
  const paying = views.find((view) => view.debt.id === payingId) ?? null;

  const fail = (caught: unknown) =>
    toast({
      title: caught instanceof Error ? caught.message : "Não foi possível concluir.",
      tone: "error",
    });

  // Em aberto primeiro, na ordem de quitação sugerida (maior juros); quitadas no fim.
  const ordered: DebtView[] = [
    ...summary.priority.map((id) => views.find((view) => view.debt.id === id)!),
    ...views.filter((view) => view.status === "paid_off"),
  ];

  async function remove(view: DebtView) {
    if (!user) return;
    try {
      await service.remove(user.uid, view.debt.id);
      toast({
        title: `"${view.debt.name}" foi excluída.`,
        action: { label: "Desfazer", onClick: () => void service.restore(user.uid, view.debt.id) },
      });
    } catch (caught) {
      fail(caught);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dívidas"
        description="Empréstimos, financiamentos, cartões e parcelamentos em um só lugar, com o caminho mais curto para quitar."
        actions={
          <Button onClick={() => setForm({ open: true, debt: null })}>
            <Plus aria-hidden="true" />
            Nova dívida
          </Button>
        }
      />
      {status === "error" ? <Alert tone="danger">{error?.message}</Alert> : null}

      {status === "loading" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl md:col-span-2" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : views.length === 0 ? (
        <Card className="items-start gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2">Dívida organizada é dívida que acaba</h2>
            <p className="max-w-[60ch] text-body text-ink-muted">
              Cadastre o que você deve e veja quanto já pagou, quando termina e quanto economiza
              antecipando parcelas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {debtGroups.map((group) => (
              <Button
                key={group.value}
                variant="secondary"
                size="sm"
                onClick={() => setForm({ open: true, debt: null, group: group.value })}
              >
                <CategoryIcon icon={group.icon} color={group.color} className="size-6" />
                {group.label}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card variant="highlight" aria-label="Resumo das dívidas">
            <Overline className="text-on-deep-muted">Total que falta pagar</Overline>
            <Amount cents={summary.balance} className="text-amount-xl font-semibold" />
            <p className="text-body text-on-deep-muted">
              {summary.openCount === 0
                ? "Todas as dívidas estão quitadas."
                : `${summary.openCount} ${summary.openCount === 1 ? "dívida" : "dívidas"} em aberto`}
              {summary.openCount > 0 ? (
                <>
                  {" "}
                  · parcelas de <Amount
                    cents={summary.monthlyPayments}
                    className="text-on-deep"
                  />{" "}
                  por mês, dos quais{" "}
                  <Amount cents={summary.monthInterest} className="text-on-deep" /> são juros.
                </>
              ) : null}
            </p>
            <div className="flex flex-col gap-1.5">
              <ProgressBar
                value={Math.round(summary.percentPaid * 100)}
                label="Percentual pago do total"
                className="bg-on-deep/15"
              />
              <p className="text-caption text-on-deep-muted">
                <span className="font-semibold text-on-deep tabular">
                  {Math.round(summary.percentPaid * 100)}%
                </span>{" "}
                do valor inicial já foi pago.
              </p>
            </div>
          </Card>

          {summary.growing.length > 0 ? (
            <Alert tone="danger" title="Há dívida crescendo">
              {summary.growing.length === 1
                ? `A parcela de "${summary.growing[0]!.debt.name}" não cobre os juros do mês. Vale renegociar ou aumentar o pagamento.`
                : `${summary.growing.length} dívidas têm parcela menor que os juros do mês. Vale renegociar ou aumentar os pagamentos.`}
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {ordered.map((view) => (
              <DebtCard
                key={view.debt.id}
                view={view}
                priority={
                  summary.priority.length > 1 ? summary.priority.indexOf(view.debt.id) + 1 : null
                }
                onPay={() => setPayingId(view.debt.id)}
                onEdit={() => setForm({ open: true, debt: view.debt })}
                onRemove={() => void remove(view)}
              />
            ))}
          </div>
        </>
      )}

      <DebtFormSheet
        open={form.open}
        onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
        debt={form.debt}
        defaultGroup={form.group}
        today={today}
        onSubmit={async (input) => {
          if (!user) return;
          if (form.debt) {
            await service.update(user.uid, form.debt.id, input);
            toast({ title: "Dívida atualizada.", tone: "success" });
          } else {
            await service.create(user.uid, input);
            toast({ title: "Dívida cadastrada.", tone: "success" });
          }
          setForm({ open: false, debt: null });
        }}
      />
      <PaymentSheet
        view={paying}
        today={today}
        accounts={accounts.items}
        onOpenChange={(open) => {
          if (!open) setPayingId(null);
        }}
        onSubmit={async (entry) => {
          if (!user || !paying) return;
          await service.registerPayment(user.uid, paying.debt, entry);
          toast({ title: "Pagamento registrado.", tone: "success" });
          setPayingId(null);
        }}
      />
    </div>
  );
}
