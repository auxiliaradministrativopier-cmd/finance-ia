import { buildLiveDashboard, hasOwnData, type LiveSources } from "../data/live-dashboard";

const tx = (
  overrides: Partial<LiveSources["transactions"][number]>,
): LiveSources["transactions"][number] => ({
  id: Math.random().toString(36).slice(2),
  type: "expense",
  status: "paid",
  amount: 10000,
  date: "2026-11-10",
  month: "2026-11",
  accountId: "acc",
  toAccountId: null,
  cardId: null,
  categoryId: "exp-mercado",
  description: "Mercado",
  invoiceMonth: null,
  ...overrides,
});

const sources = (transactions: LiveSources["transactions"]): LiveSources => ({
  today: "2026-11-22",
  accounts: [
    {
      id: "acc",
      name: "Itaú",
      initialBalance: 100000,
      initialBalanceDate: "2026-11-01",
      includeInTotal: true,
      archived: false,
    },
  ],
  cards: [{ id: "visa", name: "Visa", closingDay: 3, dueDay: 10, archived: false }],
  transactions,
  goals: [
    {
      id: "g1",
      name: "Viagem",
      targetAmount: 1000000,
      targetDate: "2027-07-01",
      currentAmount: 250000,
      status: "active",
    },
  ],
  investments: [
    { currentValue: 500000, status: "active" },
    { currentValue: 99, status: "redeemed" },
  ],
  debts: [
    {
      id: "d1",
      name: "Empréstimo",
      creditor: "Banco",
      currentBalance: 300000,
      payment: 50000,
      nextDueDate: null,
      status: "active",
    },
  ],
  provisions: [],
});

describe("Dashboard com dados reais", () => {
  it("sem conta nem lançamento, usa o exemplo", () => {
    expect(hasOwnData({ accounts: [], transactions: [] })).toBe(false);
    expect(hasOwnData({ accounts: sources([]).accounts, transactions: [] })).toBe(true);
  });

  it("calcula saldo, receitas, despesas e totais", () => {
    const data = buildLiveDashboard(
      sources([
        tx({
          type: "income",
          amount: 500000,
          date: "2026-11-05",
          categoryId: "inc-salario",
          description: "Salário",
        }),
        tx({ amount: 80000 }),
        tx({ amount: 30000, status: "pending", date: "2026-11-28", description: "Internet" }),
        tx({ amount: 20000, month: "2026-10", date: "2026-10-15" }),
      ]),
    );
    expect(data.source).toBe("live");
    expect(data.balance.current).toBe(100000 + 500000 - 80000);
    expect(data.balance.projectedEndOfMonth).toBe(100000 + 500000 - 80000 - 30000);
    expect(data.income.received).toBe(500000);
    expect(data.expense).toEqual({ spent: 80000, budget: null, previousMonth: 20000 });
    expect(data.investments).toEqual({ total: 500000, monthReturn: null, count: 1 });
    expect(data.debts).toEqual({ outstanding: 300000, monthlyPayment: 50000, count: 1 });
    expect(data.ifa).toBeNull();
    expect(data.goals[0]).toMatchObject({
      name: "Viagem",
      current: 250000,
      target: 1000000,
      targetMonth: "2027-07",
    });
    expect(data.flow.at(-1)).toEqual({ month: "2026-11", income: 500000, expense: 110000 });
    expect(data.netWorth.filter((point) => point.projected)).toHaveLength(3);
    // A evolução começa no mês do primeiro saldo acompanhado (conta aberta em novembro).
    expect(data.netWorth[0]?.month).toBe("2026-11");
  });

  it("lista contas previstas e a fatura atual do cartão", () => {
    const data = buildLiveDashboard(
      sources([
        tx({ amount: 30000, status: "pending", date: "2026-11-28", description: "Internet" }),
        tx({
          amount: 45000,
          cardId: "visa",
          accountId: null,
          invoiceMonth: "2026-12",
          description: "Restaurante",
        }),
      ]),
    );
    expect(data.upcomingBills.map((bill) => [bill.title, bill.dueDate, bill.amount])).toEqual([
      ["Internet", "2026-11-28", 30000],
      ["Fatura Visa", "2026-12-10", 45000],
    ]);
  });

  it("gera alertas factuais", () => {
    const data = buildLiveDashboard(
      sources([
        tx({ type: "income", amount: 500000, date: "2026-11-05", categoryId: "inc-salario" }),
        tx({ amount: 30000, status: "pending", date: "2026-11-15", description: "Luz" }),
      ]),
    );
    expect(data.alerts.map((alert) => alert.id)).toEqual(["overdue", "savings"]);
    expect(data.alerts[0]?.title).toBe('"Luz" está atrasada');
  });
});

describe("provisionamentos no Dashboard", () => {
  const provision = (
    overrides: Partial<LiveSources["provisions"][number]>,
  ): LiveSources["provisions"][number] => ({
    id: "p1",
    name: "IPVA 2027",
    dueDate: "2027-01-15",
    targetAmount: 252000,
    balance: 52000,
    plan: {
      monthlyNeeded: 100000,
      remaining: 200000,
      progress: 52000 / 252000,
      status: "on_track",
    },
    ...overrides,
  });

  it("resume quanto guardar por mês e o total reservado", () => {
    const data = buildLiveDashboard({
      ...sources([]),
      provisions: [
        provision({}),
        provision({
          id: "p2",
          name: "Seguro",
          dueDate: "2027-03-01",
          targetAmount: 180000,
          balance: 180000,
          plan: { monthlyNeeded: 0, remaining: 0, progress: 1, status: "completed" },
        }),
      ],
    });
    expect(data.provisions).toMatchObject({
      monthlyNeeded: 100000,
      saved: 232000,
      target: 432000,
      openCount: 1,
      behind: 0,
    });
    expect(data.provisions.items.map((item) => item.name)).toEqual(["IPVA 2027", "Seguro"]);
  });

  it("provisionamento que vence em até 30 dias entra nas próximas contas com o que falta", () => {
    const data = buildLiveDashboard({
      ...sources([]),
      provisions: [provision({ dueDate: "2026-12-10" })],
    });
    expect(data.upcomingBills).toContainEqual(
      expect.objectContaining({
        title: "IPVA 2027",
        kind: "provision",
        amount: 200000,
        dueDate: "2026-12-10",
      }),
    );
  });

  it("atrasado vira alerta", () => {
    const data = buildLiveDashboard({
      ...sources([]),
      provisions: [
        provision({
          plan: { monthlyNeeded: 100000, remaining: 200000, progress: 0.2, status: "behind" },
        }),
      ],
    });
    expect(data.alerts.find((alert) => alert.id === "provisions")).toMatchObject({
      title: '"IPVA 2027" está atrasado',
      tone: "warning",
    });
  });
});

describe("dívidas no Dashboard", () => {
  const debt = {
    id: "d1",
    name: "Financiamento do carro",
    creditor: "Banco Azul",
    currentBalance: 2_000_000,
    payment: 120_000,
    nextDueDate: "2026-12-05",
    status: "active" as const,
  };

  it("a próxima parcela entra nos vencimentos e quitadas não contam", () => {
    const data = buildLiveDashboard({
      ...sources([]),
      debts: [debt, { ...debt, id: "d2", name: "Quitada", currentBalance: 0, status: "paid_off" }],
    });
    expect(data.debts).toEqual({ outstanding: 2_000_000, monthlyPayment: 120_000, count: 1 });
    expect(data.upcomingBills).toContainEqual(
      expect.objectContaining({
        id: "debt-d1",
        kind: "debt",
        amount: 120_000,
        account: "Banco Azul",
      }),
    );
  });

  it("dívida que cresce vira alerta", () => {
    const data = buildLiveDashboard({ ...sources([]), debts: [{ ...debt, status: "growing" }] });
    expect(data.alerts).toContainEqual(
      expect.objectContaining({ id: "debts-growing", tone: "danger", href: "/patrimonio/dividas" }),
    );
  });
});
