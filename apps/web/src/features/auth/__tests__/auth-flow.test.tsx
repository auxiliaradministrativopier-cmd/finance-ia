import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "../auth-provider";
import { LoginForm } from "../components/login-form";
import { SignUpForm } from "../components/sign-up-form";
import { createDemoGateway } from "../gateway/demo-gateway";

function SessionProbe() {
  const { status, user } = useAuth();
  return (
    <p data-testid="session">
      {status}:{user?.displayName ?? "-"}
    </p>
  );
}

function renderWithAuth(ui: React.ReactNode) {
  return render(
    <AuthProvider gateway={createDemoGateway(null)}>
      <ToastProvider>
        {ui}
        <SessionProbe />
      </ToastProvider>
    </AuthProvider>,
  );
}

async function fillSignUp() {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Juliana Souza" } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "juliana@exemplo.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "financas2026" } });
}

describe("fluxo de login", () => {
  it("começa sem sessão", async () => {
    renderWithAuth(<LoginForm />);
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("unauthenticated"));
  });

  it("mostra os erros de validação sem chamar o provedor", async () => {
    renderWithAuth(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
  });

  it("entra com e-mail e senha válidos", async () => {
    renderWithAuth(<LoginForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "juliana@exemplo.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "financas2026" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    });
    await waitFor(() =>
      expect(screen.getByTestId("session")).toHaveTextContent("authenticated:juliana"),
    );
  });
});

describe("fluxo de cadastro", () => {
  it("exige o aceite dos termos", async () => {
    renderWithAuth(<SignUpForm />);
    await fillSignUp();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(
      await screen.findByText(
        "Para continuar, aceite os Termos de Uso e a Política de Privacidade.",
      ),
    ).toBeInTheDocument();
  });

  it("cria a conta com nome e consentimento", async () => {
    renderWithAuth(<SignUpForm />);
    await fillSignUp();
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    });
    await waitFor(() =>
      expect(screen.getByTestId("session")).toHaveTextContent("authenticated:Juliana Souza"),
    );
  });
});
