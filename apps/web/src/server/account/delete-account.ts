import "server-only";
import type { App } from "firebase-admin/app";
import { adminAuth, adminDb, adminStorage } from "../firebase-admin";

/**
 * Exclusão da conta (LGPD, art. 18): apaga de verdade tudo do usuário.
 * Ordem: dados (users/{uid} e subcoleções), arquivos (Storage) e, por último, o login.
 * Se algo falhar no meio, o login continua e o usuário pode tentar de novo.
 */
export async function deleteAccount(app: App, uid: string): Promise<void> {
  const db = adminDb(app);
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.collection("rateLimits").doc(uid).delete();
  try {
    await adminStorage(app)
      .bucket()
      .deleteFiles({ prefix: `users/${uid}/` });
  } catch (error) {
    // Bucket ainda não criado ou sem arquivos: nada a apagar.
    if ((error as { code?: number }).code !== 404) throw error;
  }
  await adminAuth(app).deleteUser(uid);
}
