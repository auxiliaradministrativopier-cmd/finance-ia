import { describe, expect, it } from "vitest";
import { monthsToReach, spendingAllowance } from "../planning";

describe("quanto posso gastar", () => {
  it("desconta o previsto e o que separar, e divide pelos dias restantes", () => {
    const result = spendingAllowance({
      balanceNow: 300_000,
      pendingIncome: 100_000,
      pendingExpense: 150_000,
      setAside: 50_000,
      today: "2026-11-22",
    });
    expect(result).toEqual({
      projectedEndOfMonth: 250_000,
      available: 200_000,
      daysLeft: 9,
      perDay: 22_222,
    });
  });

  it("nunca fica negativo", () => {
    const result = spendingAllowance({
      balanceNow: 0,
      pendingIncome: 0,
      pendingExpense: 80_000,
      setAside: 0,
      today: "2026-02-28",
    });
    expect(result).toMatchObject({
      projectedEndOfMonth: -80_000,
      available: 0,
      daysLeft: 1,
      perDay: 0,
    });
  });
});

describe("quando atinjo a meta", () => {
  it("arredonda para cima e trata metas sem sobra mensal", () => {
    expect(monthsToReach(1_000_000, 300_000)).toBe(4);
    expect(monthsToReach(0, 0)).toBe(0);
    expect(monthsToReach(500, 0)).toBeNull();
  });
});
