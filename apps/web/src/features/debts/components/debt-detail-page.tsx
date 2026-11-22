"use client";

import { ArrowLeft, Pencil, Receipt, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChartLegend } from "@/components/charts/chart-tooltip";
import { LineChart } from "@/components/charts/line-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, Overline } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { useAuth } from "@/features/auth/auth-provider";
import { formatShortDate } from "@/features/cash-flow/format";
import { ChartCard, DataTable } from "@/features/dashboard/components/chart-card";
import { useMoneyFormatters } from "@/features/dashboard/components/money";
import { formatMonthLong, formatMonthShort } from "@/features/dashboard/data/format";
import { amortizationLabels, typeLabel } from "../kinds";
import type { DebtView } from "../types";
import { getDebtService, useDebts } from "../use-debts";
import { debtEvolution } from "../views";
import { DebtFormSheet, formatRate } from "./debt-form-sheet";
import { DebtStatusBadge, formatMonthYear, formatMonths } from "./debt-status";
import { PaymentSheet } from "./payment-sheet";
import { PrepaymentSimulator } from "./prepayment-simulator";

/** Tela 40: Detalhe da dívida, com evolução, percentual pago e simulação de antecipação. */
export function DebtDetailPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { status, error, views, today } = useDebts();
  const accounts = useLiveList(getRepositories().accounts);
  const toast = useToast();
  const service = getDebtService();
  const [editing, setEditing] = useState(false);
  const [payment, setPayment] = useState<{
    kind: "regular" | "prepayment";
    amount?: number;
  } | null>(null);
  const view = views.find((item) => item.debt.id === id) ?? null;

  const back = (
    <Link
      href="/patrimonio/dividas"
      className="inline-flex h-control-sm items-center gap-1 self-start rounded-md pr-2 text-label font-semibold text-brand hover:bg-brand-soft"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Dívidas
    </Link>
  );

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }
  if (status === "error") return <Alert tone="danger">{error?.message}</Alert>;
  if (!view) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState
          icon={<Receipt aria-hidden="true" />}
          title="Dívida não encontrada"
          description="Ela pode ter sido excluída. Volte para a lista para ver as suas dívidas."
        />
      </div>
    );
  }

  const { debt } = view;
  const open = view.status !== "paid_off";

  return (
    <div className="flex flex-col gap-6">
      {back}
      <PageHeader
        title={debt.name}
        eyebrow={`${debt.creditor} · ${typeLabel(debt.type)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Editar
            </Button>
            {open ? (
              <Button onClick={() => setPayment({ kind: "regular" })}>Registrar pagamento</Button>
            ) : null}
          </>
        }
      />

      <Card variant="highlight" aria-label="Situação da dívida">
        <div className="flex items-start justify-between gap-3">
          <Overline className="text-on-deep-muted">Saldo devedor</Overline>
          <DebtStatusBadge status={view.status} />
        </div>
        <Amount cents={debt.currentBalance} className="text-amount-xl font-semibold" />
        <div className="flex flex-col gap-1.5">
          <ProgressBar
            value={Math.round(view.percentPaid * 100)}
            label="Percentual pago"
            className="bg-on-deep/15"
          />
          <p className="text-caption text-on-deep-muted">
            <span className="font-semibold text-on-deep tabular">
              {Math.round(view.percentPaid * 100)}% pago
            </span>{" "}
            · <Amount cents={Math.max(debt.originalAmount - debt.currentBalance, 0)} /> de{" "}
            <Amount cents={debt.originalAmount} />
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-on-deep/15 pt-4 sm:grid-cols-4">
          <Fact label="Parcela">{view.payment > 0 ? <Amount cents={view.payment} /> : "—"}</Fact>
          <Fact label="Taxa de juros">
            {debt.amortization === "none" ? "Sem juros" : `${formatRate(debt.monthlyRate)}% a.m.`}
          </Fact>
          <Fact label="Juros este mês">
            <Amount cents={view.monthInterest} />
          </Fact>
          <Fact label="Previsão de quitação">
            {!open
              ? "Quitada"
              : view.projectedEndDate
                ? `${formatMonthYear(view.projectedEndDate)} · ${formatMonths(view.schedule.rows.length)}`
                : "Não termina"}
          </Fact>
        </dl>
      </Card>

      {view.status === "growing" ? (
        <Alert tone="danger" title="A parcela não cobre os juros">
          Os juros do mês são de <Amount cents={view.monthInterest} />, mais que a parcela. Para a
          dívida diminuir, aumente o pagamento ou converse com o credor sobre uma renegociação.
        </Alert>
      ) : null}
      {debt.endDate &&
      view.projectedEndDate &&
      view.projectedEndDate.slice(0, 7) > debt.endDate.slice(0, 7) ? (
        <Alert tone="warning" title="Vai passar da data final">
          No ritmo atual, a última parcela fica para {formatMonthYear(view.projectedEndDate)},
          depois de {formatMonthYear(debt.endDate)}, a data final do contrato. Confira o saldo e a
          parcela.
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <EvolutionCard view={view} today={today} />
        {open ? (
          <PrepaymentSimulator
            view={view}
            today={today}
            onPrepay={(amount) => setPayment({ kind: "prepayment", amount })}
          />
        ) : (
          <Card className="gap-2">
            <CardTitle>Dívida quitada</CardTitle>
            <p className="text-body text-ink-muted">
              Parabéns. O valor que ia para esta parcela agora pode ir para uma meta ou
              investimento.
            </p>
          </Card>
        )}
      </div>

      <PaymentsCard
        view={view}
        onRemove={async (paymentId) => {
          if (!user) return;
          const item = view.payments.find((entry) => entry.id === paymentId);
          if (!item) return;
          try {
            await service.removePayment(user.uid, debt, item);
            toast({ title: "Pagamento excluído. O saldo foi recalculado.", tone: "success" });
          } catch (caught) {
            toast({
              title: caught instanceof Error ? caught.message : "Não foi possível excluir.",
              tone: "error",
            });
          }
        }}
      />

      <p className="text-caption text-ink-muted">
        {amortizationLabels[debt.amortization]} · início em {formatShortDate(debt.startDate)}
        {debt.installmentCount ? ` · ${debt.installmentCount} parcelas no contrato` : ""}
        {debt.endDate ? ` · data final ${formatShortDate(debt.endDate)}` : ""}. Os cálculos são
        estimativas; o valor exato está no contrato.
      </p>

      <DebtFormSheet
        open={editing}
        onOpenChange={setEditing}
        debt={debt}
        today={today}
        onSubmit={async (input) => {
          if (!user) return;
          await service.update(user.uid, debt.id, input);
          toast({ title: "Dívida atualizada.", tone: "success" });
          setEditing(false);
        }}
      />
      <PaymentSheet
        view={payment ? view : null}
        defaultKind={payment?.kind}
        defaultAmount={payment?.amount}
        today={today}
        accounts={accounts.items}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPayment(null);
        }}
        onSubmit={async (entry) => {
          if (!user) return;
          await service.registerPayment(user.uid, debt, entry);
          toast({
            title:
              entry.kind === "prepayment" ? "Antecipação registrada." : "Pagamento registrado.",
            tone: "success",
          });
          setPayment(null);
        }}
      />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-on-deep-muted">{label}</dt>
      <dd className="text-body font-semibold text-on-deep tabular">{children}</dd>
    </div>
  );
}

function EvolutionCard({ view, today }: { view: DebtView; today: string }) {
  const { money, tick, compactMoney } = useMoneyFormatters();
  const points = debtEvolution(view, today);
  const actual = points.filter((point) => !point.projected);
  const first = actual[0];
  const last = actual.at(-1);
  const reduced = first && last ? first.value - last.value : 0;
  const end = view.projectedEndDate;

  const description =
    view.status === "paid_off"
      ? "A dívida foi quitada."
      : `${reduced > 0 && first && last && first.month !== last.month ? `O saldo caiu ${money(reduced)} desde ${formatMonthLong(first.month)}. ` : ""}${
          end
            ? `No ritmo atual, termina em ${formatMonthYear(end)}.`
            : "Com a parcela atual, o saldo não diminui."
        }`;

  return (
    <ChartCard
      id="evolucao-divida"
      title="Evolução da dívida"
      description={description}
      legend={
        <ChartLegend
          items={[
            { label: "Saldo devedor", color: "var(--chart-4)" },
            { label: "Projeção", color: "var(--chart-4)", dashed: true },
          ]}
        />
      }
      chart={
        <LineChart
          data={points.map((point) => ({
            label: formatMonthShort(point.month),
            title: `${formatMonthLong(point.month)}${point.projected ? " (projeção)" : point.estimated ? " (estimado)" : ""}`,
            value: point.value,
            projected: point.projected,
          }))}
          seriesLabel="Saldo devedor"
          color="var(--chart-4)"
          summary={`Saldo devedor de ${first ? formatMonthLong(first.month) : ""} até a quitação prevista. Hoje: ${last ? money(last.value) : ""}.`}
          formatValue={money}
          formatTick={tick}
          formatEndLabel={compactMoney}
        />
      }
      table={
        <DataTable
          caption="Saldo devedor por mês"
          headers={["Mês", "Saldo", "Tipo"]}
          rows={points.map((point) => [
            formatMonthLong(point.month),
            money(point.value),
            point.projected ? "Projeção" : point.estimated ? "Estimado" : "Realizado",
          ])}
        />
      }
    />
  );
}

function PaymentsCard({
  view,
  onRemove,
}: {
  view: DebtView;
  onRemove: (paymentId: string) => Promise<void>;
}) {
  const totalInterest = view.payments.reduce((sum, item) => sum + item.interest, 0);
  return (
    <Card aria-labelledby="pagamentos" className="gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle id="pagamentos">Pagamentos</CardTitle>
        {view.payments.length > 0 ? (
          <span className="text-caption text-ink-muted">
            {view.payments.length} {view.payments.length === 1 ? "pagamento" : "pagamentos"} · juros
            pagos: <Amount cents={totalInterest} />
          </span>
        ) : null}
      </div>
      {view.payments.length === 0 ? (
        <p className="py-4 text-body text-ink-muted">
          Nenhum pagamento registrado ainda. Ao registrar, o saldo e a evolução se atualizam
          sozinhos.
        </p>
      ) : (
        <ul className="flex flex-col">
          {view.payments.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 border-b border-line py-3 last:border-0"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-medium">
                  {item.kind === "prepayment" ? "Antecipação" : "Parcela"}
                </span>
                <span className="text-caption text-ink-muted">
                  {formatShortDate(item.date)} · abateu <Amount cents={item.principal} />
                  {item.interest > 0 ? (
                    <>
                      {" "}
                      · juros <Amount cents={item.interest} />
                    </>
                  ) : null}
                  {item.transactionId ? " · lançado no fluxo" : ""}
                  {item.note ? ` · ${item.note}` : ""}
                </span>
              </span>
              <Amount cents={item.amount} kind="expense" className="text-amount font-medium" />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Excluir pagamento de ${formatShortDate(item.date)}`}
                onClick={() => void onRemove(item.id)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
