import { describe, expect, it } from "vitest";
import {
  nextYearlyDueDate,
  provisionBalance,
  provisionMonthsLeft,
  provisionPlan,
} from "../provisions";

describe("meses de aporte", () => {
  it("conta do mês atual até o mês do vencimento", () => {
    expect(provisionMonthsLeft("2026-11-22", "2027-01-15")).toBe(2);
    expect(provisionMonthsLeft("2026-11-22", "2027-11-22")).toBe(12);
  });

  it("vencimento neste mês vale 1; vencido vale 0", () => {
    expect(provisionMonthsLeft("2026-11-22", "2026-11-30")).toBe(1);
    expect(provisionMonthsLeft("2026-11-22", "2026-11-22")).toBe(1);
    expect(provisionMonthsLeft("2026-11-22", "2026-11-21")).toBe(0);
  });
});

describe("plano do provisionamento", () => {
  const base = {
    targetAmount: 252000,
    accumulated: 0,
    dueDate: "2027-01-15",
    startDate: "2026-11-22",
    today: "2026-11-22",
  };

  it("divide o que falta pelos meses e arredonda para cima", () => {
    const plan = provisionPlan(base);
    expect(plan).toMatchObject({
      remaining: 252000,
      monthsLeft: 2,
      monthlyNeeded: 126000,
      progress: 0,
      status: "on_track",
    });
    expect(
      provisionPlan({ ...base, targetAmount: 100000, dueDate: "2027-02-10" }).monthlyNeeded,
    ).toBe(33334);
  });

  it("desconta o que já foi guardado", () => {
    const plan = provisionPlan({ ...base, accumulated: 52000 });
    expect(plan.remaining).toBe(200000);
    expect(plan.monthlyNeeded).toBe(100000);
    expect(plan.progress).toBeCloseTo(52000 / 252000);
  });

  it("concluído quando atinge o total (sobra não conta como negativa)", () => {
    const plan = provisionPlan({ ...base, accumulated: 260000 });
    expect(plan).toMatchObject({
      remaining: 0,
      monthlyNeeded: 0,
      progress: 1,
      status: "completed",
    });
  });

  it("atrasado quando está abaixo do ritmo esperado", () => {
    // Começou em setembro para vencer em janeiro (4 meses); em novembro já deveria ter metade.
    const plan = provisionPlan({ ...base, startDate: "2026-09-10", accumulated: 50000 });
    expect(plan.expectedByNow).toBe(126000);
    expect(plan.status).toBe("behind");
    expect(provisionPlan({ ...base, startDate: "2026-09-10", accumulated: 130000 }).status).toBe(
      "on_track",
    );
  });

  it("vencido sem completar pede o restante de uma vez", () => {
    const plan = provisionPlan({ ...base, dueDate: "2026-11-10", accumulated: 100000 });
    expect(plan).toMatchObject({ status: "overdue", monthsLeft: 0, monthlyNeeded: 152000 });
  });
});

describe("saldo e renovação", () => {
  it("soma depósitos e desconta retiradas", () => {
    expect(
      provisionBalance([
        { kind: "deposit", amount: 50000 },
        { kind: "deposit", amount: 20000 },
        { kind: "withdrawal", amount: 15000 },
      ]),
    ).toBe(55000);
  });

  it("renova para o mesmo dia do ano seguinte", () => {
    expect(nextYearlyDueDate("2027-01-15")).toBe("2028-01-15");
    expect(nextYearlyDueDate("2028-02-29")).toBe("2029-02-28");
  });
});
