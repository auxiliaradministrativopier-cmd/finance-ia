import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { AuthProvider } from "@/features/auth/auth-provider";
import { withUserSetup } from "@/features/auth/gateway";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { PrivacyProvider } from "@/providers/privacy-provider";
import { installDialogPolyfill } from "@/test/dialog-polyfill";
import { ProvisionsPage } from "../components/provisions-page";

beforeAll(installDialogPolyfill);

async function renderPage() {
  window.localStorage.clear();
  setDataStoreForTests(createMemoryStore());
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  await gateway.signUpWithEmail({
    name: "Juliana",
    email: "juliana@exemplo.com",
    password: "financas2026",
  });
  render(
    <AuthProvider gateway={gateway}>
      <PrivacyProvider>
        <ToastProvider>
          <ProvisionsPage />
        </ToastProvider>
      </PrivacyProvider>
    </AuthProvider>,
  );
  await screen.findByText("Nada de susto em janeiro");
}

describe("Provisionamentos", () => {
  it("cria a partir de um modelo, mostra o cálculo ao vivo e o progresso", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Seguro" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("radio", { name: "Seguro" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.change(within(sheet).getByLabelText("Valor total"), { target: { value: "180000" } });
    fireEvent.change(within(sheet).getByLabelText("Data prevista"), {
      target: { value: "2099-06-30" },
    });
    fireEvent.change(within(sheet).getByLabelText("Já guardado (opcional)"), {
      target: { value: "30000" },
    });
    expect(within(sheet).getByText(/^Guarde/).textContent).toMatch(
      /por mês durante \d+ meses para chegar a R\$ 1\.800,00/,
    );
    expect(within(sheet).getByLabelText("Nome")).toHaveValue("Seguro 2099");

    await act(async () =>
      fireEvent.click(within(sheet).getByRole("button", { name: "Criar provisionamento" })),
    );
    expect(await screen.findByText("Provisionamento criado.")).toBeInTheDocument();

    const card = await screen.findByRole("article", { name: "Seguro 2099" });
    expect(within(card).getByText("R$ 300,00")).toBeInTheDocument();
    expect(within(card).getByText("17%")).toBeInTheDocument();
    expect(within(card).getByText("No ritmo")).toBeInTheDocument();
  });

  it("guarda dinheiro e atualiza o progresso", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Novo provisionamento" }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.change(within(sheet).getByLabelText("Valor total"), { target: { value: "100000" } });
    fireEvent.change(within(sheet).getByLabelText("Data prevista"), {
      target: { value: "2099-01-15" },
    });
    await act(async () =>
      fireEvent.click(within(sheet).getByRole("button", { name: "Criar provisionamento" })),
    );

    const card = await screen.findByRole("article", { name: "IPVA 2099" });
    fireEvent.click(within(card).getByRole("button", { name: "Guardar" }));
    const contribution = await screen.findByRole("dialog");
    fireEvent.change(within(contribution).getByLabelText("Quanto guardar"), {
      target: { value: "100000" },
    });
    await act(async () =>
      fireEvent.click(within(contribution).getByRole("button", { name: "Guardar" })),
    );
    expect(await screen.findByText("Valor guardado.")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "IPVA 2099" })).getByText("Concluído"),
      ).toBeInTheDocument(),
    );
  });
});
