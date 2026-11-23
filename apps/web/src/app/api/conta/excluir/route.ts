import { deleteAccount } from "@/server/account/delete-account";
import { signedInRecently, verifyAppCheck, verifyUser } from "@/server/auth/verify-user";
import { adminApp } from "@/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (status: number, message: string) =>
  Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

/** POST /api/conta/excluir: apaga a conta e todos os dados. Exige login nos últimos 5 minutos. */
export async function POST(request: Request): Promise<Response> {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return json(401, "Sua sessão expirou. Entre de novo.");
  if (!(await verifyAppCheck(request.headers.get("x-firebase-appcheck")))) {
    return json(401, "Não conseguimos confirmar que o pedido veio do app. Atualize a página.");
  }
  if (!signedInRecently(user)) {
    return json(403, "Por segurança, confirme sua senha de novo para excluir a conta.");
  }
  const app = adminApp();
  // Modo demonstração: não há dados no servidor; o app apaga o que está no aparelho.
  if (!app) return json(200, "Conta excluída.");
  try {
    await deleteAccount(app, user.uid);
    return json(200, "Conta excluída.");
  } catch (error) {
    console.error("Exclusão de conta falhou.", error instanceof Error ? error.name : "erro");
    return json(500, "Não foi possível excluir a conta agora. Tente de novo em instantes.");
  }
}
