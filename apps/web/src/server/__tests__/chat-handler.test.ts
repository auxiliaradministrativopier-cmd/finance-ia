// @vitest-environment node
import type { AssistantContext, ChatEvent } from "@/features/assistant/schema";
import { createChatHandler, type ModelRequest } from "../ai/chat-handler";
import { createRateLimiter } from "../ai/rate-limit";

const context: AssistantContext = {
  today: "2026-11-22",
  hasData: true,
  month: {
    month: "2026-11",
    incomeReceived: 8000,
    incomeExpected: 8000,
    expensePaid: 5000,
    expenseExpected: 6200,
    projectedResult: 1800,
  },
  history: [{ month: "2026-11", income: 8000, expense: 6200 }],
  accounts: { total: 3000, count: 1 },
  spending: {
    balanceNow: 3000,
    pendingIncome: 0,
    pendingExpense: 1200,
    provisionsToSave: 300,
    debtInstallmentsDue: 0,
    cardInvoicesDue: 0,
    projectedEndOfMonth: 1800,
    available: 1500,
    perDay: 166.66,
    daysLeft: 9,
  },
  savings: { avgMonthly: 1500, rate: 0.19 },
  categories: [{ name: "Moradia", thisMonth: 2500, avg3Months: 2400, shareOfExpenses: 0.4 }],
  largestExpenses: [
    {
      description: "Pix para fulano@gmail.com",
      category: "Outros",
      amount: 900,
      date: "2026-11-10",
      paidWithCard: false,
    },
  ],
  upcomingBills: [],
  reserve: { months: 0.5, target6Months: 37200, aboveTarget: 0 },
  goals: [],
  debts: [],
  health: null,
};

function setup(
  options: { apiKey?: string | null; events?: ChatEvent[]; fail?: boolean; max?: number } = {},
) {
  const calls: ModelRequest[] = [];
  const handler = createChatHandler({
    verify: async (header) => (header === "Bearer valido" ? { uid: "u1", authTime: null } : null),
    limiter: createRateLimiter([{ windowMs: 60_000, max: options.max ?? 10 }]),
    config: () => ({
      apiKey: options.apiKey === undefined ? "sk-teste" : options.apiKey,
      model: "claude-opus-5-5",
    }),
    stream: async function* (request) {
      calls.push(request);
      for (const event of options.events ?? [
        { type: "text", text: "Olá" },
        { type: "done", stopReason: "end_turn" },
      ])
        yield event;
      if (options.fail) throw new Error("boom");
    },
  });
  const post = (body: unknown, token = "valido") =>
    handler(
      new Request("http://localhost/api/ia/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  return { post, calls };
}

const valid = { messages: [{ role: "user", content: "Quanto posso gastar?" }], context };
const readEvents = async (response: Response) =>
  (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as ChatEvent);

describe("POST /api/ia/chat", () => {
  it("sem token válido, recusa sem chamar a IA", async () => {
    const { post, calls } = setup();
    expect((await post(valid, "")).status).toBe(401);
    expect((await post(valid, "falso")).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("valida o formato e o tamanho do pedido", async () => {
    const { post } = setup();
    expect((await post("{não é json")).status).toBe(400);
    expect((await post({ messages: [], context })).status).toBe(400);
    expect(
      (await post({ messages: [{ role: "user", content: "x".repeat(1600) }], context })).status,
    ).toBe(400);
    expect(
      (
        await post({
          messages: [{ role: "user", content: "oi" }],
          context: { ...context, extra: "x".repeat(200_000) },
        })
      ).status,
    ).toBe(413);
  });

  it("limita o número de perguntas por usuário", async () => {
    const { post } = setup({ max: 2 });
    await post(valid);
    await post(valid);
    const blocked = await post(valid);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("sem chave configurada, avisa que o assistente não está disponível", async () => {
    const { post, calls } = setup({ apiKey: null });
    expect((await post(valid)).status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it("mascara dados sensíveis da pergunta e do resumo antes de chamar a IA", async () => {
    const { post, calls } = setup();
    await post({
      messages: [{ role: "user", content: "Meu CPF é 123.456.789-09, quanto posso gastar?" }],
      context,
    });
    const request = calls[0]!;
    expect(request.messages[0]!.content).toBe("Meu CPF é [CPF], quanto posso gastar?");
    expect(request.system.context).toContain("Pix para [e-mail]");
    expect(request.system.context).not.toContain("gmail");
    expect(request.system.context).toMatch(/^<dados_financeiros>/);
    expect(request.system.stable).toContain(
      "Responda com base apenas nos dados financeiros do próprio usuário",
    );
    expect(request.model).toBe("claude-opus-5-5");
  });

  it("devolve a resposta em partes (uma linha JSON por evento), sem cache", async () => {
    const { post } = setup({
      events: [
        { type: "text", text: "Você pode " },
        { type: "text", text: "gastar R$ 1.500,00." },
        { type: "done", stopReason: "end_turn" },
      ],
    });
    const response = await post(valid);
    expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await readEvents(response)).toEqual([
      { type: "text", text: "Você pode " },
      { type: "text", text: "gastar R$ 1.500,00." },
      { type: "done", stopReason: "end_turn" },
    ]);
  });

  it("falha no meio da resposta vira um evento de erro, sem detalhes internos", async () => {
    const { post } = setup({ events: [{ type: "text", text: "Parcial" }], fail: true });
    const events = await readEvents(await post(valid));
    expect(events.at(-1)).toEqual({
      type: "error",
      code: "failed",
      message: "Não consegui responder agora. Tente de novo.",
    });
  });
});
