import { addMonthsToMonth, todayIn } from "@finance-ia/finance-core";
import { render, screen, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { AuthProvider } from "@/features/auth/auth-provider";
import { withUserSetup } from "@/features/auth/gateway";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { createCashFlowService } from "@/features/cash-flow/service";
import { PrivacyProvider } from "@/providers/privacy-provider";
import { HealthPage } from "../components/health-page";

async function renderWith(seed: (uid: string) => Promise<void>) {
  window.localStorage.clear();
  setDataStoreForTests(createMemoryStore());
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  const user = await gateway.signUpWithEmail({
    name: "Juliana",
    email: "juliana@exemplo.com",
    password: "financas2026",
  });
  await seed(user.uid);
  render(
    <AuthProvider gateway={gateway}>
      <PrivacyProvider>
        <ToastProvider>
          <HealthPage />
        </ToastProvider>
      </PrivacyProvider>
    </AuthProvider>,
  );
}

describe("Saúde financeira", () => {
  it("sem lançamentos, explica o que falta para a nota aparecer", async () => {
    await renderWith(async () => {});
    expect(await screen.findByText("Seu IFA está a caminho")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Cadastre uma conta com o saldo atual" }),
    ).toHaveAttribute("href", "/contas");
  });

  it("mostra nota, faixa, pilares, recomendações e evolução", async () => {
    const today = todayIn();
    const month = today.slice(0, 7);
    const months = [-2, -1, 0].map((offset) => addMonthsToMonth(month, offset));
    await renderWith(async (uid) => {
      const repos = getRepositories();
      const accountId = await repos.accounts.create(uid, {
        name: "Itaú",
        type: "checking",
        color: "chart-2",
        icon: "landmark",
        initialBalance: 0,
        initialBalanceDate: `${months[0]}-01`,
      });
      const service = createCashFlowService(repos);
      const context = { uid, today, categories: await repos.categories.list(uid), cards: [] };
      for (const item of months) {
        const base = {
          status: "paid" as const,
          accountId,
          cardId: null,
          notes: null,
          repeat: { kind: "none" as const },
        };
        await service.create(
          {
            ...base,
            type: "income",
            amount: 1_000_000,
            description: "Salário",
            date: `${item}-01`,
            categoryId: "inc-salario",
          },
          context,
        );
        await service.create(
          {
            ...base,
            type: "expense",
            amount: 950_000,
            description: "Despesas",
            date: `${item}-01`,
            categoryId: "exp-moradia",
          },
          context,
        );
      }
    });

    const card = await screen.findByRole("region", { name: "Seu IFA" });
    expect(
      within(card).getByRole("img", { name: /^IFA \d+ de 1000, faixa Atenção$/ }),
    ).toBeInTheDocument();

    const spending = screen.getByRole("article", { name: "Controle de gastos" });
    expect(spending).toHaveTextContent("Sobram 5% da renda");
    const recommendations = screen.getByRole("region", { name: "Recomendações" });
    expect(within(recommendations).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(
      within(recommendations).getByRole("heading", { name: "Guarde 20% da renda" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Evolução histórica" })).toBeInTheDocument();
    expect(screen.getByText(/Calculada com os seus registros de cada mês\./)).toBeInTheDocument();
  });
});
