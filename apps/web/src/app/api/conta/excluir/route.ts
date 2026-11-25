import { createDeleteAccountHandler } from "@/server/account/delete-handler";
import { deleteAccount } from "@/server/account/delete-account";
import { signedInRecently, verifyAppCheck, verifyUser } from "@/server/auth/verify-user";
import { adminApp } from "@/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/conta/excluir: apaga a conta e todos os dados. Exige login nos últimos 5 minutos. */
export async function POST(request: Request): Promise<Response> {
  const app = adminApp();
  return createDeleteAccountHandler({
    verify: verifyUser,
    appCheck: verifyAppCheck,
    signedInRecently,
    deleteAccount: app ? (uid) => deleteAccount(app, uid) : null,
  })(request);
}
