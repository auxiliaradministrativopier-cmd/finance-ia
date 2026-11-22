import { addMonthsToMonth, todayIn } from "@finance-ia/finance-core";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { AuthProvider } from "@/features/auth/auth-provider";
import { withUserSetup } from "@/features/auth/gateway";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { createCashFlowService } from "@/features/cash-flow/service";
import { PrivacyProvider } from "@/providers/privacy-provider";
import { AssistantPage } from "../components/assistant-page";
import type { AssistantContext, ChatEvent } from "../schema";

function ndjson(events: ChatEvent[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events)
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
  );
}

async function renderPage() {
  window.localStorage.clear();
  setDataStoreForTests(createMemoryStore());
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  const user = await gateway.signUpWithEmail({
    name: "Juliana",
    email: "juliana@exemplo.com",
    password: "financas2026",
  });
  const today = todayIn();
  const repos = getRepositories();
  const accountId = await repos.accounts.create(user.uid, {
    name: "Conta Itaú 12345-6",
    type: "checking",
    color: "chart-2",
    icon: "landmark",
    initialBalance: 100_000,
    initialBalanceDate: `${addMonthsToMonth(today.slice(0, 7), -1)}-01`,
  });
  const service = createCashFlowService(repos);
  const ctx = {
    uid: user.uid,
    today,
    categories: await repos.categories.list(user.uid),
    cards: [],
  };
  const base = {
    status: "paid" as const,
    accountId,
    cardId: null,
    notes: null,
    repeat: { kind: "none" as const },
    date: `${today.slice(0, 7)}-01`,
  };
  await service.create(
    { ...base, type: "income", amount: 800_000, description: "Salário", categoryId: "inc-salario" },
    ctx,
  );
  await service.create(
    {
      ...base,
      type: "expense",
      amount: 250_000,
      description: "Aluguel CPF 123.456.789-09",
      categoryId: "exp-moradia",
    },
    ctx,
  );
  render(
    <AuthProvider gateway={gateway}>
      <PrivacyProvider>
        <ToastProvider>
          <AssistantPage />
        </ToastProvider>
      </PrivacyProvider>
    </AuthProvider>,
  );
  await screen.findByRole("heading", { name: "Como posso ajudar com o seu dinheiro?" });
}

describe("Assistente IA", () => {
  afterEach(() => vi.restoreAllMocks());

  it("pergunta sugerida envia só o resumo mascarado e mostra a resposta em partes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ndjson([
        { type: "text", text: "Você pode gastar **R$ 4.500,00** até o fim do mês.\n\n" },
        { type: "text", text: "- Saldo atual: R$ 6.500,00" },
        { type: "done", stopReason: "end_turn" },
      ]),
    );
    await renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quanto posso gastar?" })).toBeEnabled(),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Quanto posso gastar?" })),
    );

    const answer = await screen.findByRole("article", { name: "Resposta do Finance IA" });
    await waitFor(() => expect(answer).toHaveTextContent("Saldo atual: R$ 6.500,00"));
    expect(within(answer).getByText("R$ 4.500,00").tagName).toBe("STRONG");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/ia/chat");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer demo");
    const sent = init!.body as string;
    const body = JSON.parse(sent) as { messages: unknown[]; context: AssistantContext };
    expect(body.messages).toEqual([{ role: "user", content: "Quanto posso gastar?" }]);
    expect(body.context.month).toMatchObject({ incomeReceived: 8000, expensePaid: 2500 });
    expect(body.context.largestExpenses[0]).toMatchObject({
      description: "Aluguel CPF [CPF]",
      amount: 2500,
    });
    // Nada de e-mail, nome, ids ou nomes de contas.
    expect(sent).not.toMatch(/juliana|exemplo\.com|Itaú|12345-6|123\.456/i);
  });

  it("mostra a mensagem do servidor quando o assistente não está configurado", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ message: "O assistente ainda não foi configurado neste ambiente." }),
        { status: 503 },
      ),
    );
    await renderPage();
    const input = screen.getByLabelText("Sua pergunta");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Como economizar?" } });
    await act(async () => fireEvent.keyDown(input, { key: "Enter" }));
    expect(
      await screen.findByText("O assistente ainda não foi configurado neste ambiente."),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("log")).getByText("Como economizar?")).toBeInTheDocument();
  });
});
