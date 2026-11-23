import "server-only";
import type { Firestore } from "firebase-admin/firestore";

/** Coleções do usuário com exclusão lógica (deletedAt). */
export const SOFT_DELETE_COLLECTIONS = [
  "categories",
  "accounts",
  "cards",
  "transactions",
  "goals",
  "provisions",
  "contributions",
  "debts",
  "payments",
  "investments",
  "assets",
  "installmentPlans",
  "recurrences",
] as const;

export const RETENTION_DAYS = 30;

/**
 * Apaga de vez o que foi excluído há mais de 30 dias (o "Desfazer" já não alcança).
 * Usa consultas de grupo de coleções; os índices estão em firebase/firestore.indexes.json.
 */
export async function purgeDeleted(db: Firestore, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let removed = 0;
  for (const collection of SOFT_DELETE_COLLECTIONS) {
    while (true) {
      const snapshot = await db
        .collectionGroup(collection)
        .where("deletedAt", "<", cutoff)
        .limit(400)
        .get();
      if (snapshot.empty) break;
      const batch = db.batch();
      // Só documentos de usuários (users/{uid}/...).
      const own = snapshot.docs.filter((doc) => doc.ref.path.startsWith("users/"));
      for (const doc of own) batch.delete(doc.ref);
      if (own.length === 0) break;
      await batch.commit();
      removed += own.length;
      if (snapshot.size < 400) break;
    }
  }
  return removed;
}
