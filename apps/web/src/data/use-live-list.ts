"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import type { DataError } from "./errors";
import type { ListOptions } from "./repositories/entity-repository";

interface Watchable<T> {
  watch(
    uid: string,
    options: ListOptions,
    onNext: (items: T[]) => void,
    onError: (error: DataError) => void,
  ): () => void;
}

export type LiveListState<T> =
  | { status: "loading"; items: T[]; error: null }
  | { status: "ready"; items: T[]; error: null }
  | { status: "error"; items: T[]; error: DataError };

/** Lista de uma entidade do usuário logado, atualizada em tempo real. */
export function useLiveList<T>(
  repository: Watchable<T>,
  options: ListOptions = {},
): LiveListState<T> {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const includeArchived = options.includeArchived ?? false;
  const [state, setState] = useState<LiveListState<T>>({
    status: "loading",
    items: [],
    error: null,
  });

  useEffect(() => {
    if (!uid) return;
    return repository.watch(
      uid,
      { includeArchived },
      (items) => setState({ status: "ready", items, error: null }),
      (error) => setState((current) => ({ status: "error", items: current.items, error })),
    );
  }, [uid, repository, includeArchived]);

  return state;
}
