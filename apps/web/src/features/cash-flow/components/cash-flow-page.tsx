"use client";

import { summarizeMonth } from "@finance-ia/finance-core";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Plus,
  Scale,
  Search,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Amount } from "@/components/ui/amount";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { StatTile } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import {
  applyFilters,
  groupByDay,
  type CashFlowFilters,
  type StatusFilter,
  type TypeFilter,
} from "../filters";
import { formatDayHeading, formatMonthTitle } from "@/lib/format";
import type { Transaction } from "../types";
import { getCashFlowService, useCashFlowData } from "../use-cash-flow";
import { EntrySheet } from "./entry-sheet";
import { MonthSwitcher } from "./month-switcher";
import { TransactionRow } from "./transaction-row";

const tabs: { type: TypeFilter; label: string; href: string }[] = [
  { type: "all", label: "Tudo", href: "/fluxo" },
  { type: "income", label: "Receitas", href: "/fluxo/receitas" },
  { type: "expense", label: "Despesas", href: "/fluxo/despesas" },
];

const titles: Record<TypeFilter, { title: string; description: string }> = {
  all: { title: "Fluxo de caixa", description: "Tudo o que entra e sai, mês a mês." },
  income: { title: "Receitas", description: "Acompanhe tudo o que entra." },
  expense: { title: "Despesas", description: "Entenda para onde vai o dinheiro." },
};

/** Telas 16, 17 e 18: Fluxo de caixa, Receitas e Despesas. */
export function CashFlowPage({ type }: { type: TypeFilter }) {
  const { user } = useAuth();
  const data = useCashFlowData();
  const toast = useToast();
  const currentMonth = data.today.slice(0, 7);
  const [filters, setFilters] = useState<Omit<CashFlowFilters, "type">>({
    month: currentMonth,
    status: "all",
    source: "",
    categoryId: "",
    search: "",
  });
  const [sheet, setSheet] = useState<{ open: boolean; transaction: Transaction | null }>({
    open: false,
    transaction: null,
  });

  const summary = useMemo(
    () => summarizeMonth(data.transactions, filters.month),
    [data.transactions, filters.month],
  );
  const visible = useMemo(
    () => applyFilters(data.transactions, { ...filters, type }),
    [data.transactions, filters, type],
  );
  const days = useMemo(() => groupByDay(visible), [visible]);
  const sourceNames = useMemo(() => {
    const names = new Map<string, string>();
    data.accounts.forEach((account) => names.set(`account:${account.id}`, account.name));
    data.cards.forEach((card) => names.set(`card:${card.id}`, `Cartão ${card.name}`));
    return names;
  }, [data.accounts, data.cards]);

  const filtersActive = Boolean(
    filters.search || filters.source || filters.categoryId || filters.status !== "all",
  );
  const categoryOptions = data.categories.filter(
    (category) => type === "all" || category.type === type,
  );
  const update = (patch: Partial<typeof filters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  async function markPaid(transaction: Transaction) {
    if (!user) return;
    try {
      await getCashFlowService().markPaid(transaction, user.uid);
      toast({
        title: transaction.type === "income" ? "Marcado como recebido." : "Marcado como pago.",
      });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Não foi possível atualizar.",
        tone: "error",
      });
    }
  }

  const header = (
    <PageHeader
      title={titles[type].title}
      description={titles[type].description}
      actions={
        <Button onClick={() => setSheet({ open: true, transaction: null })}>
          <Plus aria-hidden="true" />
          {type === "income"
            ? "Nova receita"
            : type === "expense"
              ? "Nova despesa"
              : "Novo lançamento"}
        </Button>
      }
    />
  );

  if (data.status === "error") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Alert tone="danger">{data.error?.message}</Alert>
      </div>
    );
  }

  const maxCategory = summary.expenseByCategory[0]?.amount ?? 1;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <nav
        aria-label="Tipo de lançamento"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.type}
              href={tab.href}
              aria-current={tab.type === type ? "page" : undefined}
              className={cn(
                "inline-flex h-control-sm items-center rounded-full border px-3 text-label font-medium",
                tab.type === type
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line-control text-ink hover:bg-surface-sunken",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <MonthSwitcher
          month={filters.month}
          currentMonth={currentMonth}
          onChange={(month) => update({ month })}
        />
      </nav>

      {data.status === "loading" ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <section
          aria-label={`Resumo de ${formatMonthTitle(filters.month)}`}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatTile
            label="Receitas"
            icon={<ArrowUpRight aria-hidden="true" />}
            value={<Amount cents={summary.income.paid} />}
            detail={
              <>
                Previsto: <Amount cents={summary.income.pending} className="font-medium text-ink" />
              </>
            }
          />
          <StatTile
            label="Despesas"
            icon={<ArrowDownRight aria-hidden="true" />}
            value={<Amount cents={summary.expense.paid} />}
            detail={
              <>
                Previsto:{" "}
                <Amount cents={summary.expense.pending} className="font-medium text-ink" />
              </>
            }
          />
          <StatTile
            label="Saldo do mês"
            icon={<Scale aria-hidden="true" />}
            value={<Amount cents={summary.balance} />}
            detail="Receitas menos despesas já efetivadas."
          />
          <StatTile
            label="Saldo projetado"
            icon={<CalendarRange aria-hidden="true" />}
            value={
              <Amount
                cents={summary.projectedBalance}
                className={summary.projectedBalance < 0 ? "text-danger" : undefined}
              />
            }
            detail={
              summary.projectedBalance < 0
                ? "Atenção: o mês fecha no vermelho."
                : "Incluindo o que ainda está previsto."
            }
          />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <section aria-label="Lançamentos" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
            <TextField
              label="Buscar lançamentos"
              type="search"
              placeholder="Descrição, categoria ou observação"
              prefix={<Search aria-hidden="true" />}
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Conta ou cartão"
                value={filters.source}
                onChange={(event) => update({ source: event.target.value })}
                options={[
                  { value: "", label: "Todas" },
                  ...data.accounts.map((account) => ({
                    value: `account:${account.id}`,
                    label: account.name,
                  })),
                  ...data.cards.map((card) => ({
                    value: `card:${card.id}`,
                    label: `Cartão ${card.name}`,
                  })),
                ]}
              />
              <SelectField
                label="Categoria"
                value={filters.categoryId}
                onChange={(event) => update({ categoryId: event.target.value })}
                options={[
                  { value: "", label: "Todas" },
                  ...categoryOptions.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Todos"],
                    ["paid", "Efetivados"],
                    ["pending", "Previstos"],
                  ] as [StatusFilter, string][]
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    selected={filters.status === value}
                    onClick={() => update({ status: value })}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
              {filtersActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => update({ search: "", source: "", categoryId: "", status: "all" })}
                >
                  <X aria-hidden="true" />
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          </div>

          <p className="text-caption text-ink-muted" aria-live="polite">
            {data.status === "ready"
              ? `${visible.length} ${visible.length === 1 ? "lançamento" : "lançamentos"} em ${formatMonthTitle(filters.month).toLowerCase()}`
              : ""}
          </p>

          {data.status === "loading" ? (
            <Card className="gap-0">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-3 py-3">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </Card>
          ) : data.accounts.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Wallet aria-hidden="true" />}
                title="Comece pela sua conta"
                description="Cadastre a conta onde você recebe e paga, com o saldo de hoje. Depois, lance receitas e despesas."
                action={
                  <Button onClick={() => setSheet({ open: true, transaction: null })}>
                    Cadastrar conta e lançar
                  </Button>
                }
              />
            </Card>
          ) : days.length === 0 ? (
            <Card>
              <EmptyState
                icon={
                  filtersActive ? (
                    <Search aria-hidden="true" />
                  ) : (
                    <CalendarRange aria-hidden="true" />
                  )
                }
                title={filtersActive ? "Nada encontrado" : "Nenhum lançamento neste mês"}
                description={
                  filtersActive
                    ? "Tente outra busca ou limpe os filtros."
                    : "Registre receitas e despesas para acompanhar seu fluxo de caixa."
                }
                action={
                  filtersActive ? undefined : (
                    <Button onClick={() => setSheet({ open: true, transaction: null })}>
                      Novo lançamento
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {days.map((day) => (
                <Card
                  key={day.date}
                  as="section"
                  aria-label={formatDayHeading(day.date, data.today)}
                  className="gap-0 pb-1"
                >
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h2 className="text-overline font-semibold tracking-[0.06em] text-ink-muted uppercase">
                      {formatDayHeading(day.date, data.today)}
                    </h2>
                    <Amount
                      cents={day.total}
                      className="text-caption font-semibold text-ink-muted"
                    />
                  </div>
                  <ul>
                    {day.items.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        today={data.today}
                        sourceName={
                          sourceNames.get(
                            transaction.cardId
                              ? `card:${transaction.cardId}`
                              : `account:${transaction.accountId}`,
                          ) ?? "Conta removida"
                        }
                        onOpen={() => setSheet({ open: true, transaction })}
                        onMarkPaid={() => void markPaid(transaction)}
                      />
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </section>

        <aside aria-label="Resumo por categoria" className="flex flex-col gap-4">
          <Card>
            <CardTitle>Gastos por categoria</CardTitle>
            {summary.expenseByCategory.length === 0 ? (
              <p className="text-body text-ink-muted">
                Sem despesas em {formatMonthTitle(filters.month).toLowerCase()}.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {summary.expenseByCategory.slice(0, 6).map(({ categoryId, amount }) => {
                  const category = data.categories.find((item) => item.id === categoryId);
                  return (
                    <li key={categoryId}>
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            categoryId: filters.categoryId === categoryId ? "" : categoryId,
                          })
                        }
                        aria-pressed={filters.categoryId === categoryId}
                        className="flex w-full cursor-pointer flex-col gap-1.5 rounded-md p-1 text-left hover:bg-surface-sunken"
                      >
                        <span className="flex items-center gap-2">
                          <CategoryIcon
                            icon={category?.icon ?? "ellipsis"}
                            color={category?.color ?? "chart-6"}
                            className="size-7"
                          />
                          <span className="min-w-0 flex-1 truncate text-body">
                            {category?.name ?? "Sem categoria"}
                          </span>
                          <Amount cents={amount} className="text-body font-medium" />
                        </span>
                        <ProgressBar
                          value={amount}
                          max={maxCategory}
                          label={`Gasto com ${category?.name ?? "categoria"}`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/fluxo/categorias"
              className={buttonVariants({ variant: "tertiary", size: "sm" })}
            >
              Gerenciar categorias
            </Link>
          </Card>
        </aside>
      </div>

      <EntrySheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        transaction={sheet.transaction}
        defaultType={type === "income" ? "income" : "expense"}
      />
    </div>
  );
}
