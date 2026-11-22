import { DataError } from "../errors";
import { backendMode } from "@/lib/firebase/config";
import { createMemoryStore } from "./memory-store";
import type { DataStore, DocumentData } from "./types";

export type { DataStore } from "./types";

const DEMO_STORAGE_KEY = "finance-ia:demo-data";
let store: DataStore | null = null;

/** Datas viram texto no JSON; na leitura voltam a ser Date. */
function reviveDates(_key: string, value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ? new Date(value)
    : value;
}

function browserPersistence() {
  return {
    load: () => {
      try {
        const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
        return raw ? (JSON.parse(raw, reviveDates) as Record<string, DocumentData>) : null;
      } catch {
        return null;
      }
    },
    save: (docs: Record<string, DocumentData>) => {
      try {
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(docs));
      } catch {
        // Sem armazenamento: os dados de demonstração valem só nesta aba.
      }
    },
  };
}

/** Armazenamento do app, conforme o modo de backend. Use apenas no navegador. */
export async function getDataStore(): Promise<DataStore> {
  if (store) return store;
  switch (backendMode) {
    case "firebase":
    case "emulator": {
      const [{ getDb }, { createFirestoreStore }] = await Promise.all([
        import("@/lib/firebase/firestore"),
        import("./firestore-store"),
      ]);
      store = createFirestoreStore(getDb());
      return store;
    }
    case "demo":
      store = createMemoryStore(typeof window === "undefined" ? undefined : browserPersistence());
      return store;
    case "unconfigured":
      throw new DataError("unavailable", {
        message: "O app ainda não está conectado ao banco de dados.",
      });
  }
}

/** Somente para testes: injeta um armazenamento. */
export function setDataStoreForTests(next: DataStore | null) {
  store = next;
}
