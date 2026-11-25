import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-provider";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { ProfilePage } from "../components/profile-page";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { withUserSetup } from "@/features/auth/gateway";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/perfil",
}));

beforeEach(() => {
  window.localStorage.clear();
  setDataStoreForTests(createMemoryStore());
});

async function renderSignedIn() {
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  await gateway.signUpWithEmail({
    name: "Juliana Souza",
    email: "juliana@exemplo.com",
    password: "financas2026",
  });
  render(
    <AuthProvider gateway={gateway}>
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    </AuthProvider>,
  );
  await screen.findByRole("heading", { name: "Juliana Souza" });
}

describe("Perfil", () => {
  it("mostra nome, e-mail, plano e forma de acesso", async () => {
    await renderSignedIn();
    expect(screen.getByText("Plano gratuito")).toBeInTheDocument();
    expect(screen.getByText(/Entra com e-mail e senha/)).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("juliana@exemplo.com");
  });

  it("valida e salva o novo nome", async () => {
    await renderSignedIn();
    const nameField = screen.getByLabelText("Nome");
    const save = screen.getByRole("button", { name: "Salvar nome" });
    expect(save).toBeDisabled();

    fireEvent.change(nameField, { target: { value: "J" } });
    fireEvent.click(save);
    expect(
      await screen.findByText("Informe seu nome, com pelo menos 2 letras."),
    ).toBeInTheDocument();

    fireEvent.change(nameField, { target: { value: "Juliana S." } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar nome" })));
    expect(await screen.findByText("Nome atualizado.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Juliana S." })).toBeInTheDocument(),
    );
  });

  it("abre a troca de senha e valida a confirmação", async () => {
    await renderSignedIn();
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "financas2026" } });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "novasenha2027" } });
    fireEvent.change(screen.getByLabelText("Repita a nova senha"), {
      target: { value: "outra2027" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByText("As senhas não são iguais.")).toBeInTheDocument();
  });
});
