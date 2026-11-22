import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";
import { createUserRepository } from "@/data/repositories/user-repository";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { AuthProvider } from "@/features/auth/auth-provider";
import { withUserSetup } from "@/features/auth/gateway";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { PrivacyProvider } from "@/providers/privacy-provider";
import { SettingsPage } from "../components/settings-page";

let uid = "";
const store = () => createMemoryStore();

async function renderPage() {
  window.localStorage.clear();
  const memory = store();
  setDataStoreForTests(memory);
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  uid = (
    await gateway.signUpWithEmail({
      name: "Juliana",
      email: "juliana@exemplo.com",
      password: "financas2026",
    })
  ).uid;
  render(
    <ThemeProvider attribute="data-theme">
      <AuthProvider gateway={gateway}>
        <PrivacyProvider>
          <ToastProvider>
            <SettingsPage />
          </ToastProvider>
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
  await screen.findByRole("switch", { name: "No celular (push)" });
  return createUserRepository(async () => memory);
}

describe("Configurações", () => {
  it("carrega os valores iniciais", async () => {
    await renderPage();
    expect(screen.getByRole("switch", { name: "No celular (push)" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByLabelText("O mês começa no")).toHaveValue("1");
    expect(screen.getByRole("radio", { name: "Sistema" })).toHaveAttribute("aria-checked", "true");
  });

  it("salva cada mudança no banco", async () => {
    const users = await renderPage();
    await act(async () =>
      fireEvent.click(screen.getByRole("switch", { name: "No celular (push)" })),
    );
    fireEvent.change(screen.getByLabelText("O mês começa no"), { target: { value: "5" } });
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Escuro" })));

    await waitFor(async () => {
      const saved = await users.getPreferences(uid);
      expect(saved.notifications).toMatchObject({ push: false, email: true, inApp: true });
      expect(saved.monthStartDay).toBe(5);
      expect(saved.theme).toBe("dark");
    });
    expect(screen.getByRole("switch", { name: "No celular (push)" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("desativar a IA desativa as opções dependentes", async () => {
    await renderPage();
    await act(async () =>
      fireEvent.click(screen.getByRole("switch", { name: "Ativar a IA Financeira" })),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Sugerir categorias automaticamente" }),
      ).toBeDisabled(),
    );
  });
});
