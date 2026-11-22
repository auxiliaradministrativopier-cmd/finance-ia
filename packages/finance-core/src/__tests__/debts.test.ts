import { describe, expect, it } from "vitest";
import {
  amortizationSchedule,
  applyPayment,
  balanceHistory,
  monthlyInterest,
  percentPaid,
  pricePayment,
  simulatePrepayment,
} from "../debts";

describe("juros e parcela", () => {
  it("calcula os juros do mês sobre o saldo", () => {
    expect(monthlyInterest(1_000_000, 2)).toBe(20_000);
    expect(monthlyInterest(1_264_000, 2.1)).toBe(26_544);
  });

  it("calcula a parcela da Tabela Price", () => {
    // R$ 10.000 a 2% a.m. em 12 meses → R$ 945,60 (arredonda para cima).
    expect(pricePayment(1_000_000, 2, 12)).toBe(94_560);
    expect(pricePayment(120_000, 0, 12)).toBe(10_000);
  });
});

describe("cronograma", () => {
  it("Price: parcela fixa quita no prazo e soma os juros", () => {
    const schedule = amortizationSchedule({
      balance: 1_000_000,
      monthlyRate: 2,
      system: "price",
      payment: 94_560,
      remainingInstallments: 12,
      firstDate: "2026-12-15",
    });
    expect(schedule.rows).toHaveLength(12);
    expect(schedule.rows.at(-1)).toMatchObject({ number: 12, date: "2027-11-15", balance: 0 });
    expect(schedule.totalInterest).toBe(schedule.totalPaid - 1_000_000);
    expect(schedule.totalInterest).toBeGreaterThan(130_000);
  });

  it("SAC: amortização fixa e parcela decrescente", () => {
    const schedule = amortizationSchedule({
      balance: 1_200_000,
      monthlyRate: 1,
      system: "sac",
      payment: null,
      remainingInstallments: 12,
      firstDate: "2026-12-15",
    });
    expect(schedule.rows).toHaveLength(12);
    expect(schedule.rows[0]).toMatchObject({
      principal: 100_000,
      interest: 12_000,
      payment: 112_000,
    });
    expect(schedule.rows[1]!.payment).toBeLessThan(schedule.rows[0]!.payment);
  });

  it("sem juros: só divide o saldo", () => {
    const schedule = amortizationSchedule({
      balance: 90_000,
      monthlyRate: 5,
      system: "none",
      payment: 30_000,
      remainingInstallments: null,
      firstDate: "2026-12-01",
    });
    expect(schedule.rows.map((row) => row.payment)).toEqual([30_000, 30_000, 30_000]);
    expect(schedule.totalInterest).toBe(0);
  });

  it("parcela menor que os juros: a dívida nunca termina", () => {
    // Rotativo: R$ 5.000 a 14% a.m. pagando R$ 500 (juros de R$ 700).
    const schedule = amortizationSchedule({
      balance: 500_000,
      monthlyRate: 14,
      system: "price",
      payment: 50_000,
      remainingInstallments: null,
      firstDate: "2026-12-01",
    });
    expect(schedule.neverEnds).toBe(true);
  });

  it("calcula a parcela pelo número de parcelas quando ela não é informada", () => {
    const schedule = amortizationSchedule({
      balance: 1_000_000,
      monthlyRate: 2,
      system: "price",
      payment: null,
      remainingInstallments: 12,
      firstDate: "2026-12-15",
    });
    expect(schedule.rows[0]?.payment).toBe(94_560);
  });
});

describe("pagamentos e percentual pago", () => {
  it("parcela normal paga os juros e amortiza o resto", () => {
    expect(applyPayment(1_000_000, 94_560, 2, "regular")).toEqual({
      interest: 20_000,
      principal: 74_560,
      balance: 925_440,
    });
  });

  it("antecipação abate direto do principal", () => {
    expect(applyPayment(1_000_000, 200_000, 2, "prepayment")).toEqual({
      interest: 0,
      principal: 200_000,
      balance: 800_000,
    });
  });

  it("não deixa o saldo negativo", () => {
    expect(applyPayment(50_000, 80_000, 2, "prepayment").balance).toBe(0);
  });

  it("percentual pago fica entre 0 e 1", () => {
    expect(percentPaid(2_000_000, 1_264_000)).toBeCloseTo(0.368);
    expect(percentPaid(100, 150)).toBe(0);
    expect(percentPaid(0, 0)).toBe(0);
  });
});

describe("simulação de antecipação", () => {
  const base = {
    balance: 1_000_000,
    monthlyRate: 2,
    system: "price" as const,
    payment: 94_560,
    remainingInstallments: 12,
    firstDate: "2026-12-15",
  };

  it("pagar a mais todo mês termina antes e economiza juros", () => {
    const result = simulatePrepayment({ ...base, extraMonthly: 50_000 });
    expect(result.baseline.months).toBe(12);
    expect(result.scenario.months).toBeLessThan(12);
    expect(result.monthsSaved).toBe(12 - result.scenario.months);
    expect(result.interestSaved).toBeGreaterThan(0);
  });

  it("antecipar hoje mantendo a parcela reduz o prazo", () => {
    const result = simulatePrepayment({ ...base, lumpSum: 300_000, mode: "reduce_term" });
    expect(result.scenario.payment).toBe(94_560);
    expect(result.scenario.months).toBeLessThan(12);
    expect(result.interestSaved).toBeGreaterThan(0);
  });

  it("antecipar hoje mantendo o prazo reduz a parcela", () => {
    const result = simulatePrepayment({ ...base, lumpSum: 300_000, mode: "reduce_payment" });
    expect(result.scenario.months).toBe(12);
    expect(result.scenario.payment).toBe(pricePayment(700_000, 2, 12));
    expect(result.scenario.payment).toBeLessThan(94_560);
  });

  it("reduzir o prazo economiza mais juros que reduzir a parcela", () => {
    const term = simulatePrepayment({ ...base, lumpSum: 300_000, mode: "reduce_term" });
    const payment = simulatePrepayment({ ...base, lumpSum: 300_000, mode: "reduce_payment" });
    expect(term.interestSaved).toBeGreaterThan(payment.interestSaved);
  });

  it("antecipar tudo quita a dívida", () => {
    const result = simulatePrepayment({ ...base, lumpSum: 1_000_000, mode: "reduce_term" });
    expect(result.scenario.months).toBe(0);
    expect(result.interestSaved).toBe(result.baseline.totalInterest);
  });
});

describe("balanceHistory", () => {
  it("reconstrói o saldo mês a mês pelos pagamentos registrados", () => {
    const points = balanceHistory({
      originalAmount: 100_000,
      currentBalance: 80_000,
      startDate: "2026-01-10",
      today: "2026-03-20",
      trackedSince: "2026-01",
      payments: [
        { date: "2026-02-10", principal: 10_000 },
        { date: "2026-03-10", principal: 10_000 },
      ],
    });
    expect(points.map((point) => point.balance)).toEqual([100_000, 90_000, 80_000]);
    expect(points.every((point) => !point.estimated)).toBe(true);
  });

  it("estima em linha reta o período antes do cadastro", () => {
    const points = balanceHistory({
      originalAmount: 120_000,
      currentBalance: 60_000,
      startDate: "2026-01-05",
      today: "2026-05-01",
      trackedSince: "2026-04",
      payments: [],
    });
    expect(points[0]).toEqual({ month: "2026-01", balance: 120_000, estimated: false });
    expect(points[2]).toEqual({ month: "2026-03", balance: 60_000, estimated: true });
    expect(points.at(-1)).toEqual({ month: "2026-05", balance: 60_000, estimated: false });
  });
});
