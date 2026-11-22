import { DEFAULT_CATEGORIES } from "@finance-ia/shared";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/features/users/consents";
import { defaultPreferences } from "./models/user";
import { SCHEMA_VERSION } from "./repositories/entity-repository";
import type { DataStore, WriteOperation } from "./store/types";

export interface SetupUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface SetupResult {
  createdProfile: boolean;
  createdPreferences: boolean;
  createdCategories: number;
}

/**
 * Configuração inicial do usuário: perfil (com consentimento), preferências e categorias padrão.
 * Idempotente: cria só o que falta, em um único lote (tudo ou nada). Roda no cadastro e
 * a cada login, o que também completa contas antigas.
 */
export async function ensureUserSetup(
  store: DataStore,
  user: SetupUser,
  displayName?: string,
): Promise<SetupResult> {
  const result: SetupResult = {
    createdProfile: false,
    createdPreferences: false,
    createdCategories: 0,
  };
  if (!user.email) return result;

  const base = `users/${user.uid}`;
  const [profile, preferences, anyCategory] = await Promise.all([
    store.get(base),
    store.get(`${base}/settings/preferences`),
    store.query(`${base}/categories`, { limit: 1 }),
  ]);

  const operations: WriteOperation[] = [];
  const stamps = () => ({
    createdAt: store.now(),
    updatedAt: store.now(),
    schemaVersion: SCHEMA_VERSION,
  });

  if (!profile) {
    const name = (displayName ?? user.displayName ?? user.email.split("@")[0] ?? "").trim();
    operations.push({
      type: "set",
      path: base,
      data: {
        displayName: name.length >= 2 ? name.slice(0, 80) : "Usuário",
        email: user.email,
        onboarding: { completed: false, step: 0 },
        consents: {
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          acceptedAt: store.now(),
        },
        ...stamps(),
      },
    });
    result.createdProfile = true;
  }

  if (!preferences) {
    operations.push({
      type: "set",
      path: `${base}/settings/preferences`,
      data: { ...defaultPreferences(), ...stamps() },
    });
    result.createdPreferences = true;
  }

  if (anyCategory.length === 0) {
    DEFAULT_CATEGORIES.forEach((category, index) => {
      operations.push({
        type: "set",
        path: `${base}/categories/${category.id}`,
        data: {
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parentId: null,
          catalogId: category.id,
          essential: category.essential,
          archived: false,
          order: index,
          deletedAt: null,
          ...stamps(),
        },
      });
    });
    result.createdCategories = DEFAULT_CATEGORIES.length;
  }

  if (operations.length > 0) await store.batch(operations);
  return result;
}
