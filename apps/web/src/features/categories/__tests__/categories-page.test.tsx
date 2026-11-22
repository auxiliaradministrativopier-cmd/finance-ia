import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { setDataStoreForTests } from "@/data/store";
import { createMemoryStore } from "@/data/store/memory-store";
import { AuthProvider } from "@/features/auth/auth-provider";
import { withUserSetup } from "@/features/auth/gateway";
import { createDemoGateway } from "@/features/auth/gateway/demo-gateway";
import { CategoriesPage } from "../components/categories-page";

// O <dialog> nativo não existe no jsdom.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

let uid = "";

async function renderPage() {
  window.localStorage.clear();
  setDataStoreForTests(createMemoryStore());
  const gateway = withUserSetup(createDemoGateway(window.localStorage));
  uid = (
    await gateway.signUpWithEmail({
      name: "Juliana Souza",
      email: "juliana@exemplo.com",
      password: "financas2026",
    })
  ).uid;
  render(
    <AuthProvider gateway={gateway}>
      <ToastProvider>
        <CategoriesPage />
      </ToastProvider>
    </AuthProvider>,
  );
  await screen.findByText("Moradia");
}

const list = () => screen.getByRole("region", { name: /Categorias de/ });

describe("Categorias", () => {
  it("mostra as 16 categorias padrão de despesa e as 8 de receita", async () => {
    await renderPage();
    expect(within(list()).getAllByRole("listitem")).toHaveLength(16);
    fireEvent.click(screen.getByRole("button", { name: /Receitas/ }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(8);
    expect(within(list()).getByText("Salário")).toBeInTheDocument();
  });

  it("cria uma categoria e impede nome repetido", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "moradia" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Criar categoria" })));
    expect(await screen.findByText("Já existe uma categoria com este nome.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Academia" } });
    fireEvent.click(screen.getByRole("radio", { name: "Coral" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Criar categoria" })));
    expect(await screen.findByText("Categoria criada.")).toBeInTheDocument();
    expect(within(list()).getByText("Academia")).toBeInTheDocument();

    const saved = (await getRepositories().categories.list(uid)).find((c) => c.name === "Academia");
    expect(saved).toMatchObject({ type: "expense", color: "chart-5", order: 16 });
  });

  it("valida o nome obrigatório", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Criar categoria" })));
    expect(await screen.findByText("O nome é obrigatório.")).toBeInTheDocument();
  });

  it("edita uma categoria", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Editar Pets" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Pet e veterinário" } });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })),
    );
    await waitFor(() => expect(within(list()).getByText("Pet e veterinário")).toBeInTheDocument());
  });

  it("arquiva, desfaz e restaura", async () => {
    await renderPage();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Arquivar Doações" })),
    );
    await waitFor(() => expect(within(list()).queryByText("Doações")).not.toBeInTheDocument());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Desfazer" })));
    await waitFor(() => expect(within(list()).getByText("Doações")).toBeInTheDocument());

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Arquivar Doações" })),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Arquivadas (1)" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Restaurar" })));
    await waitFor(() => expect(within(list()).getByText("Doações")).toBeInTheDocument());
  });
});
