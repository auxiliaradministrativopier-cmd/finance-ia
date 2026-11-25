import type { VerifiedUser } from "../auth/verify-user";

export interface DeleteAccountDeps {
  verify: (authorization: string | null) => Promise<VerifiedUser | null>;
  appCheck: (header: string | null) => Promise<boolean>;
  signedInRecently: (user: VerifiedUser) => boolean;
  /** Apaga dados, arquivos e login. `null` quando não há Firebase (modo demonstração). */
  deleteAccount: ((uid: string) => Promise<void>) | null;
}

const json = (status: number, message: string) =>
  Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/conta/excluir. Ordem: identidade → App Check → login recente (5 min) → exclusão.
 * Falhas internas não expõem detalhes ao cliente.
 */
export function createDeleteAccountHandler(deps: DeleteAccountDeps) {
  return async function POST(request: Request): Promise<Response> {
    const user = await deps.verify(request.headers.get("authorization"));
    if (!user) return json(401, "Sua sessão expirou. Entre de novo.");
    if (!(await deps.appCheck(request.headers.get("x-firebase-appcheck")))) {
      return json(401, "Não conseguimos confirmar que o pedido veio do app. Atualize a página.");
    }
    if (!deps.signedInRecently(user)) {
      return json(403, "Por segurança, confirme sua senha de novo para excluir a conta.");
    }
    if (!deps.deleteAccount) return json(200, "Conta excluída.");
    try {
      await deps.deleteAccount(user.uid);
      return json(200, "Conta excluída.");
    } catch (error) {
      console.error("Exclusão de conta falhou.", error instanceof Error ? error.name : "erro");
      return json(500, "Não foi possível excluir a conta agora. Tente de novo em instantes.");
    }
  };
}
