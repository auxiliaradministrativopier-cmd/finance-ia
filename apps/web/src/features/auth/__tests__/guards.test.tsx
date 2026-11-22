import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth-provider";
import { createDemoGateway } from "../gateway/demo-gateway";
import { RequireAuth } from "../guards";
import type { AuthGateway } from "../gateway";
import type { AuthUser } from "../types";

const replace = vi.fn();
let pathname = "/planejar/metas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

const verified: AuthUser = {
  uid: "u1",
  email: "juliana@exemplo.com",
  displayName: "Juliana",
  emailVerified: true,
  photoUrl: null,
  providerIds: ["password"],
};

/** Gateway controlável: o teste decide quando a sessão muda. */
function controllableGateway(initial: AuthUser | null) {
  const base = createDemoGateway(null);
  let emit: (user: AuthUser | null) => void = () => {};
  const gateway: AuthGateway = {
    ...base,
    subscribe(listener) {
      emit = listener;
      queueMicrotask(() => listener(initial));
      return () => {};
    },
    signOut: async () => {},
  };
  return { gateway, expire: () => act(() => emit(null)) };
}

function SignOutButton() {
  const { signOut } = useAuth();
  return <button onClick={() => void signOut()}>sair</button>;
}

beforeEach(() => {
  replace.mockClear();
  pathname = "/planejar/metas";
});

describe("RequireAuth", () => {
  it("sem sessão leva ao login guardando a página pedida", async () => {
    const { gateway } = controllableGateway(null);
    render(
      <AuthProvider gateway={gateway}>
        <RequireAuth>conteúdo protegido</RequireAuth>
      </AuthProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar?next=%2Fplanejar%2Fmetas"));
    expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
  });

  it("e-mail não confirmado vai para a verificação", async () => {
    const { gateway } = controllableGateway({ ...verified, emailVerified: false });
    render(
      <AuthProvider gateway={gateway}>
        <RequireAuth>conteúdo protegido</RequireAuth>
      </AuthProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/verificar-email"));
  });

  it("usuário verificado vê o conteúdo", async () => {
    const { gateway } = controllableGateway(verified);
    render(
      <AuthProvider gateway={gateway}>
        <RequireAuth>conteúdo protegido</RequireAuth>
      </AuthProvider>,
    );
    expect(await screen.findByText("conteúdo protegido")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("ao sair por vontade própria, vai para as boas-vindas (e não para o login)", async () => {
    const { gateway } = controllableGateway(verified);
    render(
      <AuthProvider gateway={gateway}>
        <RequireAuth>
          <SignOutButton />
        </RequireAuth>
      </AuthProvider>,
    );
    const button = await screen.findByText("sair");
    await act(async () => button.click());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/boas-vindas"));
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/entrar"));
  });

  it("quando a sessão expira, volta ao login na mesma página", async () => {
    const { gateway, expire } = controllableGateway(verified);
    render(
      <AuthProvider gateway={gateway}>
        <RequireAuth>conteúdo protegido</RequireAuth>
      </AuthProvider>,
    );
    await screen.findByText("conteúdo protegido");
    expire();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar?next=%2Fplanejar%2Fmetas"));
  });
});
