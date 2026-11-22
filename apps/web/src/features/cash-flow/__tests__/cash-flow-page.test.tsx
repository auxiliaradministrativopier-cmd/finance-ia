import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { AuthProvider } from "@/features/auth/auth-provider";
import { withUserSetup } from "@/features/auth/gateway";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { PrivacyProvider } from "@/providers/privacy-provider";
import { installDialogPolyfill } from "@/test/dialog-polyfill";
import { todayIn } from "@finance-ia/finance-core";
import { CashFlowPage } from "../components/cash-flow-page";

beforeAll(installDialogPolyfill);

let uid = "";

async function renderPage() {
  window.localStorage.clear();
  setDataStoreForTests(createMemoryStore());
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  uid = (
    await gateway.signUpWithEmail({
      name: "Juliana",
      email: "juliana@exemplo.com",
      password: "financas2026",
    })
  ).uid;
  render(
    <AuthProvider gateway={gateway}>
      <PrivacyProvider>
        <ToastProvider>
          <CashFlowPage type="all" />
        </ToastProvider>
      </PrivacyProvider>
    </AuthProvider>,
  );
  await screen.findByText("Comece pela sua conta");
}

const typeMoney = (label: string, digits: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: digits } });

async function addEntry({
  type,
  amount,
  description,
  category,
}: {
  type: "Despesa" | "Receita";
  amount: string;
  description: string;
  category: string;
}) {
  fireEvent.click(screen.getAllByRole("button", { name: "Novo lançamento" })[0]!);
  const sheet = await screen.findByRole("dialog");
  // O formulário carrega contas e categorias antes de aparecer.
  fireEvent.click(await within(sheet).findByRole("button", { name: type }));
  typeMoney("Valor", amount);
  fireEvent.change(within(sheet).getByLabelText("Descrição"), { target: { value: description } });
  fireEvent.click(within(sheet).getByRole("radio", { name: category }));
  await act(async () =>
    fireEvent.click(within(sheet).getByRole("button", { name: /^Salvar (despesa|receita)$/ })),
  );
}

describe("Fluxo de caixa", () => {
  it("cria a primeira conta, lança receita e despesa e resume o mês", async () => {
    await renderPage();

    // Primeira conta, direto no formulário de lançamento.
    fireEvent.click(screen.getAllByRole("button", { name: "Novo lançamento" })[0]!);
    const sheet = await screen.findByRole("dialog");
    fireEvent.change(within(sheet).getByLabelText("Nome da conta"), {
      target: { value: "Nubank" },
    });
    typeMoney("Saldo atual", "100000");
    await act(async () =>
      fireEvent.click(within(sheet).getByRole("button", { name: "Criar conta" })),
    );
    expect(await within(sheet).findByLabelText("Valor")).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "Cancelar" }));

    await addEntry({
      type: "Receita",
      amount: "720000",
      description: "Salário",
      category: "Salário",
    });
    expect(await screen.findByText("Receita salva.")).toBeInTheDocument();
    await addEntry({
      type: "Despesa",
      amount: "41237",
      description: "Supermercado",
      category: "Mercado",
    });
    expect(await screen.findByText("Despesa salva.")).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: /^Resumo de/ });
    expect(within(summary).getByText("R$ 7.200,00")).toBeInTheDocument();
    expect(within(summary).getByText("R$ 412,37")).toBeInTheDocument();
    // Saldo do mês e saldo projetado: iguais quando não há nada previsto.
    expect(within(summary).getAllByText("R$ 6.787,63")).toHaveLength(2);
    expect(screen.getByText("2 lançamentos", { exact: false })).toBeInTheDocument();

    const saved = await getRepositories().transactions.list(uid);
    expect(saved.map((t) => [t.description, t.categoryName, t.status, t.date]).sort()).toEqual([
      ["Salário", "Salário", "paid", todayIn()],
      ["Supermercado", "Mercado", "paid", todayIn()],
    ]);
  });

  it("valida o formulário antes de salvar", async () => {
    await renderPage();
    await getRepositories().accounts.create(uid, {
      name: "Itaú",
      type: "checking",
      color: "chart-2",
      icon: "landmark",
      initialBalance: 0,
      initialBalanceDate: todayIn(),
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Novo lançamento" })[0]!);
    const sheet = await screen.findByRole("dialog");
    await within(sheet).findByLabelText("Valor");
    await act(async () =>
      fireEvent.click(within(sheet).getByRole("button", { name: "Salvar despesa" })),
    );
    expect(within(sheet).getByText("Informe um valor maior que zero.")).toBeInTheDocument();
    expect(within(sheet).getByText("A descrição é obrigatória.")).toBeInTheDocument();
    expect(within(sheet).getByText("Escolha uma categoria.")).toBeInTheDocument();
  });

  it("busca, exclui e desfaz", async () => {
    await renderPage();
    await getRepositories().accounts.create(uid, {
      name: "Itaú",
      type: "checking",
      color: "chart-2",
      icon: "landmark",
      initialBalance: 0,
      initialBalanceDate: todayIn(),
    });
    await addEntry({
      type: "Despesa",
      amount: "5000",
      description: "Padaria",
      category: "Mercado",
    });
    await addEntry({ type: "Despesa", amount: "9000", description: "Farmácia", category: "Saúde" });
    await waitFor(() =>
      expect(screen.getByText("2 lançamentos", { exact: false })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Buscar lançamentos"), {
      target: { value: "farmacia" },
    });
    expect(screen.getByText("1 lançamento", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    fireEvent.click(screen.getByText("Padaria"));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "Excluir" }));
    await act(async () =>
      fireEvent.click(within(sheet).getAllByRole("button", { name: "Excluir" }).at(0)!),
    );
    expect(await screen.findByText("Lançamento excluído.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Padaria")).not.toBeInTheDocument());

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Desfazer" })));
    expect(await screen.findByText("Padaria")).toBeInTheDocument();
  });
});
