import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AuthProvider } from "@/features/auth/auth-provider";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { PrivacyProvider } from "@/providers/privacy-provider";
import { DashboardPage } from "../components/dashboard-page";

async function renderDashboard() {
  window.localStorage.clear();
  // Sem contas nem lançamentos: o painel mostra o exemplo.
  setDataStoreForTests(createMemoryStore());
  const gateway = createDemoGateway(window.localStorage);
  await gateway.signUpWithEmail({
    name: "Juliana Souza",
    email: "juliana@exemplo.com",
    password: "financas2026",
  });
  render(
    <AuthProvider gateway={gateway}>
      <PrivacyProvider>
        <DashboardPage />
      </PrivacyProvider>
    </AuthProvider>,
  );
  await screen.findByText("Receitas x despesas");
}

describe("Dashboard", () => {
  it("cumprimenta pelo primeiro nome e avisa que os dados são de exemplo", async () => {
    await renderDashboard();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/, Juliana$/);
    expect(screen.getByText("Dados de exemplo")).toBeInTheDocument();
    expect(screen.getByText("Estes números são um exemplo")).toBeInTheDocument();
  });

  it("mostra os sete indicadores pedidos", async () => {
    await renderDashboard();
    expect(screen.getByText("Saldo atual")).toBeInTheDocument();
    for (const label of [
      "Receitas do mês",
      "Despesas do mês",
      "Economia do mês",
      "Investimentos",
      "Dívidas",
    ]) {
      expect(screen.getByRole("region", { name: label })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("img", { name: "IFA 742 de 1000, faixa Saudável" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Economia do mês" })).getByText("R$ 3.585,65"),
    ).toBeInTheDocument();
  });

  it("mostra as listas de contas, metas e alertas", async () => {
    await renderDashboard();
    expect(screen.getByText("Fatura Visa")).toBeInTheDocument();
    expect(screen.getByText("Em 3 dias")).toBeInTheDocument();
    expect(screen.getByText("Viagem para o Chile")).toBeInTheDocument();
    expect(screen.getByText("Delivery chegou a 92% do orçamento")).toBeInTheDocument();
  });

  it("o filtro de período muda os dois gráficos", async () => {
    await renderDashboard();
    expect(
      screen.getByText("Sobrou dinheiro em 6 de 6 meses com lançamentos."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "12 meses" }));
    expect(
      screen.getByText("Sobrou dinheiro em 11 de 12 meses com lançamentos."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "12 meses" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("oferece a tabela com os mesmos dados do gráfico", async () => {
    await renderDashboard();
    const card = screen.getByRole("region", { name: "Receitas x despesas" });
    fireEvent.click(within(card).getByRole("button", { name: "Ver tabela" }));
    const table = within(card).getByRole("table", { name: "Receitas e despesas por mês" });
    expect(within(table).getAllByRole("row")).toHaveLength(7);
  });

  it("anuncia o mês ativo ao navegar no gráfico pelo teclado", async () => {
    await renderDashboard();
    const chart = screen.getByRole("group", { name: /Receitas e despesas dos últimos 6 meses/ });
    act(() => chart.focus());
    fireEvent.keyDown(chart, { key: "Home" });
    await waitFor(() =>
      expect(within(chart).getByText(/^junho de 2026: Receitas R\$ 8\.600,00/)).toBeInTheDocument(),
    );
  });

  it("oculta os valores em todo o painel", async () => {
    await renderDashboard();
    fireEvent.click(screen.getAllByRole("button", { name: "Ocultar valores" })[0]!);
    expect(screen.queryByText("R$ 18.452,90")).not.toBeInTheDocument();
    expect(screen.getAllByText("R$ ••••").length).toBeGreaterThan(5);
  });
});
