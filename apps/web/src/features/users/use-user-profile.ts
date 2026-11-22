"use client";

import { useEffect, useState } from "react";
import { createUserRepository } from "@/data/repositories/user-repository";
import type { DataError } from "@/data/errors";
import type { UserProfile } from "@/data/models/user";
import { useAuth } from "@/features/auth/auth-provider";

export const userRepository = createUserRepository();

export type ProfileState =
  | { status: "loading"; profile: null; error: null }
  | { status: "ready"; profile: UserProfile | null; error: null }
  | { status: "error"; profile: null; error: DataError };

/** Perfil do usuário logado (users/{uid}), atualizado em tempo real. */
export function useUserProfile(): ProfileState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<ProfileState>({
    status: "loading",
    profile: null,
    error: null,
  });

  useEffect(() => {
    if (!uid) return;
    return userRepository.watchProfile(
      uid,
      (profile) => setState({ status: "ready", profile, error: null }),
      (error) => setState({ status: "error", profile: null, error }),
    );
  }, [uid]);

  return state;
}
