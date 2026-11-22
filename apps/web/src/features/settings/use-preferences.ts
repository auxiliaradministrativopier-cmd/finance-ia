"use client";

import { useCallback, useEffect, useState } from "react";
import { DataError } from "@/data/errors";
import { createUserRepository } from "@/data/repositories/user-repository";
import type { Preferences, PreferencesPatch } from "@/data/models/user";
import { useAuth } from "@/features/auth/auth-provider";

export const preferencesRepository = createUserRepository();

export type PreferencesState =
  | { status: "loading"; preferences: null; error: null }
  | { status: "ready"; preferences: Preferences; error: null }
  | { status: "error"; preferences: null; error: DataError };

/** Configurações (users/{uid}/settings/preferences) em tempo real, com atualização parcial. */
export function usePreferences() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<PreferencesState>({
    status: "loading",
    preferences: null,
    error: null,
  });

  useEffect(() => {
    if (!uid) return;
    return preferencesRepository.watchPreferences(
      uid,
      (preferences) => setState({ status: "ready", preferences, error: null }),
      (error) => setState({ status: "error", preferences: null, error }),
    );
  }, [uid]);

  const update = useCallback(
    async (patch: PreferencesPatch) => {
      if (!uid) throw new DataError("unauthenticated");
      await preferencesRepository.updatePreferences(uid, patch);
    },
    [uid],
  );

  return { ...state, update };
}
