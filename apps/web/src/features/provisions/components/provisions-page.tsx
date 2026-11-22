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
import { provisionKinds, type ProvisionKind } from "../kinds";
import type { ProvisionView } from "../types";
import { getProvisionService, useProvisions } from "../use-provisions";
import { ContributionSheet, type ContributionMode } from "./contribution-sheet";
import { ProvisionCard } from "./provision-card";
import { ProvisionFormSheet } from "./provision-form-sheet";

/** Tela 33: Provisionamentos. */
export function ProvisionsPage() {
  const { user } = useAuth();
  const { status, error, views, totals, today } = useProvisions();
  const accounts = useLiveList(getRepositories().accounts);
  const toast = useToast();
  const service = getProvisionService();
  const [form, setForm] = useState<{
    open: boolean;
    view: ProvisionView | null;
    kind?: ProvisionKind;
  }>({ open: false, view: null });
  const [contribution, setContribution] = useState<{ id: string | null; mode: ContributionMode }>({
    id: null,
    mode: "deposit",
  });
  const activeContribution = views.find((view) => view.provision.id === contribution.id) ?? null;

  const notify = (title: string, tone: "success" | "error" = "success") => toast({ title, tone });
  const fail = (caught: unknown) =>
    notify(caught instanceof Error ? caught.message : "Não foi possível concluir.", "error");

  const header = (
    <PageHeader
      title="Provisionamentos"
      description="Separe aos poucos o dinheiro das despesas que não são mensais: IPVA, seguro, viagem, material escolar."
      actions={
        <Button onClick={() => setForm({ open: true, view: null })}>
          <Plus aria-hidden="true" />
          Novo provisionamento
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {header}
      {status === "error" ? <Alert tone="danger">{error?.message}</Alert> : null}

      {status === "loading" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl md:col-span-2" />
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : views.length === 0 ? (
        <Card className="items-start gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2">Nada de susto em janeiro</h2>
            <p className="max-w-[60ch] text-body text-ink-muted">
              Escolha uma despesa que vai chegar e o Finance IA calcula quanto separar por mês para
              ter o dinheiro na data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {provisionKinds.slice(0, 7).map((kind) => (
              <Button
                key={kind.value}
                variant="secondary"
                size="sm"
                onClick={() => setForm({ open: true, view: null, kind: kind.value })}
              >
                <CategoryIcon icon={kind.icon} color={kind.color} className="size-6" />
                {kind.label}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card variant="highlight" aria-label="Resumo dos provisionamentos">
            <Overline className="text-on-deep-muted">Guarde por mês</Overline>
            <Amount cents={totals.monthlyNeeded} className="text-amount-xl font-semibold" />
            <p className="text-body text-on-deep-muted">
              Para cobrir {totals.openCount}{" "}
              {totals.openCount === 1 ? "provisionamento" : "provisionamentos"} em aberto
              {totals.behind > 0
                ? ` · ${totals.behind} ${totals.behind === 1 ? "precisa" : "precisam"} de atenção`
                : ""}
              .
            </p>
            <div className="flex flex-col gap-1.5">
              <ProgressBar
                value={totals.saved}
                max={Math.max(totals.target, 1)}
                label="Total reservado"
                className="bg-on-deep/15"
              />
              <p className="text-caption text-on-deep-muted">
                Reservado: <Amount cents={totals.saved} className="font-semibold text-on-deep" /> de{" "}
                <Amount cents={totals.target} />
              </p>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {views.map((view) => (
              <ProvisionCard
                key={view.provision.id}
                view={view}
                onDeposit={() => setContribution({ id: view.provision.id, mode: "deposit" })}
                onWithdraw={() => setContribution({ id: view.provision.id, mode: "withdrawal" })}
                onHistory={() => setContribution({ id: view.provision.id, mode: "history" })}
                onEdit={() => setForm({ open: true, view })}
                onRemove={async () => {
                  if (!user) return;
                  try {
                    await service.remove(user.uid, view.provision.id);
                    toast({
                      title: `"${view.provision.name}" foi excluído.`,
                      action: {
                        label: "Desfazer",
                        onClick: () => void service.restore(user.uid, view.provision.id),
                      },
                    });
                  } catch (caught) {
                    fail(caught);
                  }
                }}
                onRenew={async () => {
                  if (!user) return;
                  try {
                    const leftover = Math.max(view.balance - view.provision.targetAmount, 0);
                    await service.renew(user.uid, view.provision, leftover, today);
                    notify(`Renovado para ${Number(view.provision.dueDate.slice(0, 4)) + 1}.`);
                  } catch (caught) {
                    fail(caught);
                  }
                }}
              />
            ))}
          </div>
        </>
      )}

      <ProvisionFormSheet
        open={form.open}
        onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
        provision={form.view?.provision ?? null}
        defaultKind={form.kind}
        balance={form.view?.balance ?? 0}
        today={today}
        accounts={accounts.items}
        onSubmit={async ({ input, initialAmount }) => {
          if (!user) return;
          if (form.view) {
            await service.update(user.uid, form.view.provision.id, input);
            notify("Provisionamento atualizado.");
          } else {
            await service.create(user.uid, input, initialAmount, today);
            notify("Provisionamento criado.");
          }
          setForm({ open: false, view: null });
        }}
      />

      <ContributionSheet
        view={activeContribution}
        mode={contribution.mode}
        today={today}
        onOpenChange={(open) => {
          if (!open) setContribution((current) => ({ ...current, id: null }));
        }}
        onContribute={async (entry) => {
          if (!user || !activeContribution) return;
          await service.contribute(
            user.uid,
            activeContribution.provision.id,
            entry,
            activeContribution.balance,
          );
          notify(entry.kind === "deposit" ? "Valor guardado." : "Valor usado.");
          setContribution((current) => ({ ...current, id: null }));
        }}
        onRemoveContribution={async (contributionId) => {
          if (!user || !activeContribution) return;
          try {
            await service.removeContribution(
              user.uid,
              activeContribution.provision.id,
              contributionId,
            );
            notify("Aporte excluído.");
          } catch (caught) {
            fail(caught);
          }
        }}
      />
    </div>
  );
}
