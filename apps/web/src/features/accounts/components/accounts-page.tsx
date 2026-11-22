"use client";

import { accountBalances, totalBalance } from "@finance-ia/finance-core";
import { Archive, ArchiveRestore, Landmark, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Overline } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { useAuth } from "@/features/auth/auth-provider";
import { useCashFlowData } from "@/features/cash-flow/use-cash-flow";
import type { Account } from "@/features/cash-flow/types";
import { AccountFormSheet, accountTypes } from "./account-form-sheet";

/** Tela 24: Contas. O saldo é calculado pelos lançamentos efetivados (até as Cloud Functions assumirem). */
export function AccountsPage() {
  const { user } = useAuth();
  const data = useCashFlowData();
  const toast = useToast();
  const [sheet, setSheet] = useState<{ open: boolean; account: Account | null }>({
    open: false,
    account: null,
  });

  const active = data.accounts.filter((account) => !account.archived);
  const archived = data.accounts.filter((account) => account.archived);
  const balances = useMemo(
    () => accountBalances(data.accounts, data.transactions, data.today),
    [data.accounts, data.transactions, data.today],
  );
  const projected = useMemo(() => {
    const endOfMonth = `${data.today.slice(0, 7)}-31`;
    return accountBalances(data.accounts, data.transactions, endOfMonth, { includePending: true });
  }, [data.accounts, data.transactions, data.today]);

  async function setArchived(account: Account, value: boolean) {
    if (!user) return;
    try {
      await getRepositories().accounts.update(user.uid, account.id, { archived: value });
      toast({
        title: value
          ? `"${account.name}" foi arquivada.`
          : `"${account.name}" voltou para a lista.`,
        action: value
          ? {
              label: "Desfazer",
              onClick: () =>
                void getRepositories().accounts.update(user.uid, account.id, { archived: false }),
            }
          : undefined,
      });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Não foi possível atualizar.",
        tone: "error",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas"
        description="O saldo de cada conta considera o saldo inicial e os lançamentos já efetivados."
        actions={
          <Button onClick={() => setSheet({ open: true, account: null })}>
            <Plus aria-hidden="true" />
            Nova conta
          </Button>
        }
      />
      {data.status === "error" ? <Alert tone="danger">{data.error?.message}</Alert> : null}
      {data.status === "loading" ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Landmark aria-hidden="true" />}
            title="Nenhuma conta ainda"
            description="Cadastre a conta onde você recebe seu dinheiro, com o saldo de hoje."
            action={
              <Button onClick={() => setSheet({ open: true, account: null })}>
                Cadastrar conta
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card variant="highlight">
            <Overline className="text-on-deep-muted">Saldo total</Overline>
            <Amount
              cents={totalBalance(data.accounts, balances)}
              className="text-amount-xl font-semibold"
            />
            <p className="text-caption text-on-deep-muted">
              Previsto para o fim do mês:{" "}
              <Amount
                cents={totalBalance(data.accounts, projected)}
                className="font-semibold text-on-deep"
              />
            </p>
          </Card>
          <Card className="gap-0 p-2">
            <ul>
              {active.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center gap-3 border-b border-line px-2 py-3 last:border-0"
                >
                  <CategoryIcon icon={account.icon} color={account.color} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium">{account.name}</span>
                    <span className="text-caption text-ink-muted">
                      {accountTypes.find((option) => option.value === account.type)?.label}
                      {account.institutionName ? ` · ${account.institutionName}` : ""}
                    </span>
                  </div>
                  {!account.includeInTotal ? <Badge tone="neutral">Fora do total</Badge> : null}
                  <div className="flex flex-col items-end">
                    <Amount
                      cents={balances.get(account.id) ?? 0}
                      className={
                        (balances.get(account.id) ?? 0) < 0
                          ? "text-amount font-semibold text-danger"
                          : "text-amount font-semibold"
                      }
                    />
                    <span className="text-caption text-ink-muted">
                      Previsto: <Amount cents={projected.get(account.id) ?? 0} />
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${account.name}`}
                    onClick={() => setSheet({ open: true, account })}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Arquivar ${account.name}`}
                    onClick={() => setArchived(account, true)}
                  >
                    <Archive aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      {archived.length > 0 ? (
        <section aria-label="Contas arquivadas" className="flex flex-col gap-2">
          <h2 className="text-h3">Arquivadas</h2>
          <Card className="gap-0 p-2">
            <ul>
              {archived.map((account) => (
                <li key={account.id} className="flex items-center gap-3 px-2 py-2.5 text-ink-muted">
                  <span className="min-w-0 flex-1 truncate">{account.name}</span>
                  <Button variant="tertiary" size="sm" onClick={() => setArchived(account, false)}>
                    <ArchiveRestore aria-hidden="true" />
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
      <AccountFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        account={sheet.account}
        today={data.today}
        onSubmit={async (input) => {
          if (!user) return;
          if (sheet.account)
            await getRepositories().accounts.update(user.uid, sheet.account.id, input);
          else
            await getRepositories().accounts.create(user.uid, {
              ...input,
              order: data.accounts.length,
            });
          toast({ title: sheet.account ? "Conta atualizada." : "Conta criada." });
          setSheet({ open: false, account: null });
        }}
      />
    </div>
  );
}
