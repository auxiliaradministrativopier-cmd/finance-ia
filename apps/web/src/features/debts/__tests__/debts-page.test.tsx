import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { AuthProvider } from "@/features/auth/auth-provider";
import { withUserSetup } from "@/features/auth/gateway";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { PrivacyProvider } from "@/providers/privacy-provider";
import { installDialogPolyfill } from "@/test/dialog-polyfill";
import { DebtDetailPage } from "../components/debt-detail-page";
import { DebtsPage } from "../components/debts-page";

beforeAll(installDialogPolyfill);

async function signIn() {
  window.localStorage.clear();
  setDataStoreForTests(createMemoryStore());
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  const user = await gateway.signUpWithEmail({
    name: "Juliana",
    email: "juliana@exemplo.com",
    password: "financas2026",
  });
  return { gateway, uid: user.uid };
}

function wrap(gateway: Parameters<typeof AuthProvider>[0]["gateway"], children: React.ReactNode) {
  return (
    <AuthProvider gateway={gateway}>
      <PrivacyProvider>
        <ToastProvider>{children}</ToastProvider>
      </PrivacyProvider>
    </AuthProvider>
  );
}

describe("Dívidas", () => {
  it("cadastra um financiamento com parcela sugerida e mostra o percentual pago", async () => {
    const { gateway } = await signIn();
    render(wrap(gateway, <DebtsPage />));
    await screen.findByText("Dívida organizada é dívida que acaba");

    fireEvent.click(screen.getByRole("button", { name: "Financiamento" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("radio", { name: "Financiamento" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.change(within(sheet).getByLabelText("Modalidade"), {
      target: { value: "vehicle_financing" },
    });
    fireEvent.change(within(sheet).getByLabelText("Nome"), { target: { value: "Carro" } });
    fireEvent.change(within(sheet).getByLabelText("Credor"), { target: { value: "Banco Azul" } });
    fireEvent.change(within(sheet).getByLabelText("Valor inicial"), {
      target: { value: "4800000" },
    });
    fireEvent.change(within(sheet).getByLabelText("Saldo atual"), { target: { value: "3600000" } });
    fireEvent.change(within(sheet).getByLabelText("Como são as parcelas"), {
      target: { value: "price" },
    });
    fireEvent.change(within(sheet).getByLabelText("Taxa de juros (% ao mês)"), {
      target: { value: "1,5" },
    });
    expect(within(sheet).getByText("Equivale a 19,56% ao ano.")).toBeInTheDocument();
    fireEvent.change(within(sheet).getByLabelText("Número de parcelas"), {
      target: { value: "48" },
    });
    fireEvent.click(within(sheet).getByRole("button", { name: /^Usar R\$/ }));
    expect(within(sheet).getByLabelText("Valor da parcela")).toHaveValue("1.410,00");

    await act(async () =>
      fireEvent.click(within(sheet).getByRole("button", { name: "Cadastrar dívida" })),
    );
    expect(await screen.findByText("Dívida cadastrada.")).toBeInTheDocument();

    const card = await screen.findByRole("article", { name: "Carro" });
    expect(within(card).getByText("25% pago")).toBeInTheDocument();
    expect(within(card).getByText("1,5% a.m.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resumo das dívidas" })).toHaveTextContent(
      "1 dívida em aberto",
    );
  });

  it("detalhe mostra evolução, simulação de antecipação e registra pagamento", async () => {
    const { gateway, uid } = await signIn();
    const id = await getRepositories().debts.create(uid, {
      name: "Empréstimo",
      creditor: "Banco Azul",
      type: "personal_loan",
      originalAmount: 1_000_000,
      currentBalance: 1_000_000,
      monthlyRate: 2,
      amortization: "price",
      installmentAmount: 94_560,
      installmentCount: 12,
      startDate: "2026-11-01",
      nextDueDate: "2099-12-01",
    });
    render(wrap(gateway, <DebtDetailPage id={id} />));

    expect(await screen.findByRole("heading", { name: "Evolução da dívida" })).toBeInTheDocument();
    const simulator = screen.getByRole("region", { name: "Simulação de antecipação" });
    fireEvent.change(within(simulator).getByLabelText("Valor para antecipar hoje"), {
      target: { value: "300000" },
    });
    expect(within(simulator).getByText(/^Você economiza/).textContent).toMatch(
      /de juros e termina \d+ meses antes\./,
    );

    fireEvent.click(within(simulator).getByRole("button", { name: "Registrar esta antecipação" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByLabelText("Valor pago")).toHaveValue("3.000,00");
    expect(within(sheet).getByRole("button", { name: "Antecipação" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(within(sheet).getByLabelText("Pago com"), { target: { value: "" } });
    await act(async () =>
      fireEvent.click(within(sheet).getByRole("button", { name: "Registrar pagamento" })),
    );

    expect(await screen.findByText("Antecipação registrada.")).toBeInTheDocument();
    const situation = screen.getByRole("region", { name: "Situação da dívida" });
    expect(situation).toHaveTextContent("30% pago");
    expect(screen.getByRole("region", { name: "Pagamentos" })).toHaveTextContent("Antecipação");
  });
});
