"use client";

import { useCallback } from "react";
import { getRepositories } from "@/data/repositories";
import { DataError } from "@/data/errors";
import type { CategoryInput } from "@/data/models/entities";
import { useLiveList } from "@/data/use-live-list";
import { useAuth } from "@/features/auth/auth-provider";

const repository = () => getRepositories().categories;
export type Category = Awaited<ReturnType<ReturnType<typeof repository>["get"]>>;

function normalize(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Categorias do usuário em tempo real, com as ações de CRUD. */
export function useCategories() {
  const { user } = useAuth();
  const state = useLiveList(repository(), { includeArchived: true });

  const uid = useCallback(() => {
    if (!user) throw new DataError("unauthenticated");
    return user.uid;
  }, [user]);

  /** Nomes únicos por tipo (sem diferenciar maiúsculas e acentos). */
  const assertUniqueName = useCallback(
    (name: string, type: string, exceptId?: string) => {
      const taken = state.items.some(
        (category) =>
          category.type === type &&
          category.id !== exceptId &&
          normalize(category.name) === normalize(name),
      );
      if (taken)
        throw new DataError("conflict", {
          fields: { name: "Já existe uma categoria com este nome." },
        });
    },
    [state.items],
  );

  const create = useCallback(
    async (input: CategoryInput) => {
      assertUniqueName(input.name, input.type);
      const order = state.items.filter((category) => category.type === input.type).length;
      return repository().create(uid(), { ...input, order });
    },
    [assertUniqueName, state.items, uid],
  );

  const update = useCallback(
    async (id: string, patch: Partial<CategoryInput>, type: string) => {
      if (patch.name !== undefined) assertUniqueName(patch.name, type, id);
      await repository().update(uid(), id, patch);
    },
    [assertUniqueName, uid],
  );

  const setArchived = useCallback(
    (id: string, archived: boolean) => repository().update(uid(), id, { archived }),
    [uid],
  );

  return { ...state, create, update, setArchived };
}
