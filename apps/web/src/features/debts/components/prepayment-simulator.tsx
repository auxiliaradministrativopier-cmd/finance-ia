"use client";

import { simulatePrepayment, type AmortizationSystem } from "@finance-ia/finance-core";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { MoneyField } from "@/components/ui/money-field";
import type { DebtView } from "../types";
import { formatMonthYear, formatMonths } from "./debt-status";

type Strategy = "lump_term" | "lump_payment" | "monthly";

const strategies: { value: Strategy; label: string }[] = [
  { value: "lump_term", label: "Antecipar e terminar antes" },
  { value: "lump_payment", label: "Antecipar e baixar a parcela" },
  { value: "monthly", label: "Pagar a mais todo mês" },
];

/** Simulação de antecipação: quanto se economiza de juros e de tempo. */
export function PrepaymentSimulator({
  view,
  today,
  onPrepay,
}: {
  view: DebtView;
  today: string;
  onPrepay: (amount: number) => void;
}) {
  const { debt } = view;
  const [strategy, setStrategy] = useState<Strategy>("lump_term");
  const [amount, setAmount] = useState(() =>
    Math.min(Math.round((debt.currentBalance * 0.1) / 100) * 100, debt.currentBalance),
  );

  const firstDate = debt.nextDueDate && debt.nextDueDate >= today ? debt.nextDueDate : today;
  const result = simulatePrepayment({
    balance: debt.currentBalance,
    monthlyRate: debt.monthlyRate,
    system: debt.amortization as AmortizationSystem,
    payment: view.payment,
    remainingInstallments: view.schedule.rows.length || null,
    firstDate,
    ...(strategy === "monthly"
      ? { extraMonthly: amount }
      : { lumpSum: amount, mode: strategy === "lump_term" ? "reduce_term" : "reduce_payment" }),
  });
  const { baseline, scenario } = result;
  const lump = strategy !== "monthly";
  const paysAll = lump && amount >= debt.currentBalance;

  return (
    <Card aria-labelledby="simulador" className="gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="simulador">Simulação de antecipação</CardTitle>
        <CardDescription>
          Veja quanto você economiza de juros adiantando parcelas. Antecipar abate o saldo sem os
          juros futuros (Código de Defesa do Consumidor, art. 52).
        </CardDescription>
      </div>
      <div role="group" aria-label="Como antecipar" className="flex flex-wrap gap-2">
        {strategies.map((option) => (
          <Chip
            key={option.value}
            selected={strategy === option.value}
            onClick={() => setStrategy(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
      <MoneyField
        label={lump ? "Valor para antecipar hoje" : "Valor a mais por mês"}
        value={amount}
        onChange={setAmount}
      />

      {baseline.neverEnds ? (
        <p className="text-body text-danger">
          Com a parcela atual, o saldo não diminui. Pague ao menos os juros de{" "}
          <Amount cents={view.monthInterest} /> por mês para a dívida começar a cair.
        </p>
      ) : amount <= 0 ? (
        <p className="text-body text-ink-muted">Informe um valor para ver a economia.</p>
      ) : (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="rounded-lg bg-brand-soft px-4 py-3">
            {paysAll ? (
              <p className="text-body text-ink">
                Com esse valor você quita a dívida hoje e deixa de pagar{" "}
                <Amount cents={result.interestSaved} className="font-semibold" /> de juros.
              </p>
            ) : (
              <p className="text-body text-ink">
                Você economiza <Amount cents={result.interestSaved} className="font-semibold" /> de
                juros
                {result.monthsSaved > 0
                  ? ` e termina ${formatMonths(result.monthsSaved)} antes`
                  : ""}
                {strategy === "lump_payment" ? (
                  <>
                    {" "}
                    e a parcela cai para{" "}
                    <Amount cents={scenario.payment} className="font-semibold" />
                  </>
                ) : null}
                .
              </p>
            )}
          </div>
          <dl className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-body">
            <span />
            <dt className="text-caption text-ink-muted">Sem antecipar</dt>
            <dt className="text-caption text-ink-muted">Antecipando</dt>
            <dt className="text-ink-muted">Parcela</dt>
            <dd>
              <Amount cents={baseline.payment} />
            </dd>
            <dd>
              {paysAll ? (
                "—"
              ) : (
                <Amount
                  cents={scenario.payment + (strategy === "monthly" ? amount : 0)}
                  className="font-medium"
                />
              )}
            </dd>
            <dt className="text-ink-muted">Termina em</dt>
            <dd>{baseline.endDate ? formatMonthYear(baseline.endDate) : "—"}</dd>
            <dd className="font-medium">
              {paysAll ? "Hoje" : scenario.endDate ? formatMonthYear(scenario.endDate) : "—"}
            </dd>
            <dt className="text-ink-muted">Juros até o fim</dt>
            <dd>
              <Amount cents={baseline.totalInterest} />
            </dd>
            <dd>
              <Amount cents={scenario.totalInterest} className="font-medium" />
            </dd>
          </dl>
          {lump ? (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => onPrepay(Math.min(amount, debt.currentBalance))}
            >
              Registrar esta antecipação
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}
