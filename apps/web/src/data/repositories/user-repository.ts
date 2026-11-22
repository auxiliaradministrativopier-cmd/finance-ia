import { DataError, toDataError } from "../errors";
import {
  defaultPreferences,
  preferencesSchema,
  profileUpdate,
  type Preferences,
  type PreferencesPatch,
  type ProfileUpdate,
  type UserProfile,
} from "../models/user";
import { getDataStore } from "../store";
import type { DataStore, DocumentData } from "../store/types";
import { validationError } from "./entity-repository";

const userPath = (uid: string) => `users/${uid}`;
const preferencesPath = (uid: string) => `users/${uid}/settings/preferences`;

export function toUserProfile(data: DocumentData): UserProfile {
  const plan = data.plan as { id?: string; status?: string } | undefined;
  const onboarding = data.onboarding as { completed?: boolean; step?: number } | undefined;
  return {
    displayName: String(data.displayName ?? ""),
    email: String(data.email ?? ""),
    photoUrl: (data.photoUrl as string | null | undefined) ?? null,
    occupationType: (data.occupationType as string | undefined) ?? null,
    incomeRange: (data.incomeRange as string | undefined) ?? null,
    financialProfile: (data.financialProfile as string | undefined) ?? null,
    onboarding: { completed: onboarding?.completed === true, step: onboarding?.step ?? 0 },
    plan:
      plan?.id === "free" || plan?.id === "premium"
        ? { id: plan.id, status: plan.status ?? "active" }
        : null,
    createdAt: data.createdAt instanceof Date ? data.createdAt : null,
  };
}

/** Achata { notifications: { push: false } } em { "notifications.push": false } (atualização sem apagar o resto do mapa). */
export function flattenPatch(patch: Record<string, unknown>, prefix = ""): DocumentData {
  const result: DocumentData = {};
  for (const [key, value] of Object.entries(patch)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      key !== "types"
    ) {
      Object.assign(result, flattenPatch(value as Record<string, unknown>, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

export function createUserRepository(getStore: () => Promise<DataStore> = getDataStore) {
  return {
    watchProfile(
      uid: string,
      onNext: (profile: UserProfile | null) => void,
      onError: (error: DataError) => void,
    ) {
      let stop: (() => void) | null = null;
      let cancelled = false;
      getStore()
        .then((store) => {
          if (!cancelled) {
            stop = store.watchDocument(
              userPath(uid),
              (doc) => onNext(doc ? toUserProfile(doc.data) : null),
              (error) => onError(toDataError(error)),
            );
          }
        })
        .catch((error) => onError(toDataError(error)));
      return () => {
        cancelled = true;
        stop?.();
      };
    },

    async getProfile(uid: string): Promise<UserProfile | null> {
      const store = await getStore();
      const doc = await store.get(userPath(uid));
      return doc ? toUserProfile(doc.data) : null;
    },

    async updateProfile(uid: string, patch: ProfileUpdate): Promise<void> {
      const result = profileUpdate.safeParse(patch);
      if (!result.success) throw validationError(result.error);
      const store = await getStore();
      await store.update(userPath(uid), { ...result.data, updatedAt: store.now() });
    },

    watchPreferences(
      uid: string,
      onNext: (preferences: Preferences) => void,
      onError: (error: DataError) => void,
    ) {
      let stop: (() => void) | null = null;
      let cancelled = false;
      getStore()
        .then((store) => {
          if (!cancelled) {
            stop = store.watchDocument(
              preferencesPath(uid),
              // Sem documento ainda (usuário antigo): valores padrão até a configuração inicial rodar.
              (doc) =>
                onNext(
                  doc
                    ? { ...defaultPreferences(), ...(doc.data as Partial<Preferences>) }
                    : defaultPreferences(),
                ),
              (error) => onError(toDataError(error)),
            );
          }
        })
        .catch((error) => onError(toDataError(error)));
      return () => {
        cancelled = true;
        stop?.();
      };
    },

    async getPreferences(uid: string): Promise<Preferences> {
      const store = await getStore();
      const doc = await store.get(preferencesPath(uid));
      return doc
        ? { ...defaultPreferences(), ...(doc.data as Partial<Preferences>) }
        : defaultPreferences();
    },

    /** Atualiza só os campos informados, validando as preferências resultantes. */
    async updatePreferences(uid: string, patch: PreferencesPatch): Promise<void> {
      const store = await getStore();
      const current = await this.getPreferences(uid);
      const merged: Record<string, unknown> = { ...current };
      for (const [key, value] of Object.entries(patch)) {
        const base = merged[key];
        merged[key] =
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          base &&
          typeof base === "object"
            ? { ...(base as object), ...(value as object) }
            : value;
      }
      const result = preferencesSchema.safeParse(merged);
      if (!result.success) throw validationError(result.error);
      if (!(await store.get(preferencesPath(uid)))) {
        throw new DataError("not-found", {
          message: "Suas configurações ainda estão sendo criadas. Tente de novo em instantes.",
        });
      }
      await store.update(preferencesPath(uid), {
        ...flattenPatch(patch as Record<string, unknown>),
        updatedAt: store.now(),
      });
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
