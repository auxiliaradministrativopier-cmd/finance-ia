import { DataError } from "../errors";
import type { DataStore, DocumentData, QueryOptions, StoredDocument } from "./types";

type Listener = () => void;

const isIncrement = (value: unknown): value is { __increment: number } =>
  typeof value === "object" && value !== null && "__increment" in value;

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

function idOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function compare(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "pt-BR");
}

/** Aplica filtros, ordenação e limite como o Firestore (só os operadores que o app usa). */
export function applyQuery(docs: StoredDocument[], options: QueryOptions = {}): StoredDocument[] {
  let result = docs.filter((item) =>
    (options.where ?? []).every(([field, op, value]) => {
      const current = item.data[field] ?? null;
      return op === "==" ? current === value : Array.isArray(value) && value.includes(current);
    }),
  );
  if (options.orderBy) {
    const { field, direction = "asc" } = options.orderBy;
    result = [...result].sort(
      (a, b) => compare(a.data[field], b.data[field]) * (direction === "desc" ? -1 : 1),
    );
  }
  return options.limit ? result.slice(0, options.limit) : result;
}

/**
 * Armazenamento em memória, com a mesma interface do Firestore.
 * Usado no modo demonstração (opcionalmente salvo no navegador) e nos testes.
 */
export function createMemoryStore(persistence?: {
  load: () => Record<string, DocumentData> | null;
  save: (docs: Record<string, DocumentData>) => void;
}): DataStore {
  const docs = new Map<string, DocumentData>(Object.entries(persistence?.load() ?? {}));
  const listeners = new Set<Listener>();
  let counter = 0;
  let lastStamp = 0;

  const clone = <T>(value: T): T => structuredClone(value);
  const notify = () => {
    persistence?.save(Object.fromEntries(docs));
    listeners.forEach((listener) => listener());
  };
  const childrenOf = (collectionPath: string) =>
    [...docs.entries()]
      .filter(([path]) => parentOf(path) === collectionPath)
      .map(([path, data]) => ({ id: idOf(path), data: clone(data) }));

  /** Aplica uma atualização; chaves com ponto ("notifications.push") alteram só o campo aninhado, como no Firestore. */
  function applyUpdate(path: string, data: DocumentData) {
    const current = docs.get(path);
    if (!current) throw new DataError("not-found");
    const next = clone(current);
    for (const [key, value] of Object.entries(clone(data))) {
      const parts = key.split(".");
      let target: Record<string, unknown> = next;
      for (const part of parts.slice(0, -1)) {
        const child = target[part];
        target[part] = child && typeof child === "object" && !Array.isArray(child) ? child : {};
        target = target[part] as Record<string, unknown>;
      }
      const field = parts[parts.length - 1]!;
      target[field] = isIncrement(value) ? Number(target[field] ?? 0) + value.__increment : value;
    }
    docs.set(path, next);
  }

  return {
    kind: "memory",

    async get(path) {
      const data = docs.get(path);
      return data ? { id: idOf(path), data: clone(data) } : null;
    },

    async query(collectionPath, options) {
      return applyQuery(childrenOf(collectionPath), options);
    },

    watchDocument(path, onNext) {
      const emit = () => {
        const data = docs.get(path);
        onNext(data ? { id: idOf(path), data: clone(data) } : null);
      };
      listeners.add(emit);
      queueMicrotask(emit);
      return () => listeners.delete(emit);
    },

    watchQuery(collectionPath, options, onNext) {
      const emit = () => onNext(applyQuery(childrenOf(collectionPath), options));
      listeners.add(emit);
      queueMicrotask(emit);
      return () => listeners.delete(emit);
    },

    newId() {
      counter += 1;
      return `mem${Date.now().toString(36)}${counter.toString(36)}`;
    },

    async set(path, data) {
      docs.set(path, clone(data));
      notify();
    },

    async update(path, data) {
      applyUpdate(path, data);
      notify();
    },

    async batch(operations) {
      // Tudo ou nada, como no Firestore.
      const snapshot = new Map(docs);
      try {
        for (const operation of operations) {
          if (operation.type === "set") docs.set(operation.path, clone(operation.data));
          else applyUpdate(operation.path, operation.data);
        }
      } catch (error) {
        docs.clear();
        snapshot.forEach((value, key) => docs.set(key, value));
        throw error;
      }
      notify();
    },

    // Sempre crescente, como o carimbo do servidor: duas gravações nunca têm a mesma data.
    now: () => {
      lastStamp = Math.max(Date.now(), lastStamp + 1);
      return new Date(lastStamp);
    },
    increment: (delta) => ({ __increment: delta }),
  };
}
