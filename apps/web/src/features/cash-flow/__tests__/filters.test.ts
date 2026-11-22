import { applyFilters, groupByDay, normalizeText, type CashFlowFilters } from "../filters";
import type { Transaction } from "../types";

const tx = (overrides: Partial<Transaction>) =>
  ({
    id: Math.random().toString(36).slice(2),
    type: "expense",
    status: "paid",
    amount: 1000,
    description: "Mercado",
    date: "2026-11-10",
    month: "2026-11",
    accountId: "acc",
    cardId: null,
    categoryId: "exp-mercado",
    categoryName: "Mercado",
    notes: null,
    ...overrides,
  }) as Transaction;

const base: CashFlowFilters = {
  month: "2026-11",
  type: "all",
  status: "all",
  source: "",
  categoryId: "",
  search: "",
};

const list = [
  tx({ description: "Pão de Açúcar", notes: "compras da semana" }),
  tx({
    type: "income",
    description: "Salário",
    categoryId: "inc-salario",
    categoryName: "Salário",
  }),
  tx({
    description: "Posto Shell",
    cardId: "visa",
    accountId: null,
    status: "pending",
    categoryId: "exp-transporte",
    categoryName: "Transporte",
  }),
  tx({ description: "Mercado outubro", month: "2026-10", date: "2026-10-05" }),
  tx({ type: "transfer", description: "Para a poupança", categoryId: null }),
];

describe("filtros do Fluxo de Caixa", () => {
  it("mostra só o mês escolhido e esconde transferências", () => {
    expect(applyFilters(list, base)).toHaveLength(3);
  });

  it("filtra por tipo, status, conta ou cartão e categoria", () => {
    expect(applyFilters(list, { ...base, type: "income" }).map((t) => t.description)).toEqual([
      "Salário",
    ]);
    expect(applyFilters(list, { ...base, status: "pending" }).map((t) => t.description)).toEqual([
      "Posto Shell",
    ]);
    expect(applyFilters(list, { ...base, source: "card:visa" })).toHaveLength(1);
    expect(applyFilters(list, { ...base, source: "account:acc" })).toHaveLength(2);
    expect(applyFilters(list, { ...base, categoryId: "exp-transporte" })).toHaveLength(1);
  });

  it("busca sem acentos em descrição, categoria e observações", () => {
    expect(applyFilters(list, { ...base, search: "acucar" }).map((t) => t.description)).toEqual([
      "Pão de Açúcar",
    ]);
    expect(applyFilters(list, { ...base, search: "SEMANA" })).toHaveLength(1);
    expect(applyFilters(list, { ...base, search: "transporte" })).toHaveLength(1);
    expect(applyFilters(list, { ...base, search: "pão semana" })).toHaveLength(1);
    expect(applyFilters(list, { ...base, search: "inexistente" })).toHaveLength(0);
    expect(normalizeText("Ação")).toBe("acao");
  });

  it("agrupa por dia com o total líquido", () => {
    const days = groupByDay([
      tx({ type: "income", amount: 5000, date: "2026-11-05" }),
      tx({ amount: 1200, date: "2026-11-05" }),
      tx({ amount: 300, date: "2026-11-09" }),
    ]);
    expect(days.map((day) => [day.date, day.total, day.items.length])).toEqual([
      ["2026-11-09", -300, 1],
      ["2026-11-05", 3800, 2],
    ]);
  });
});
