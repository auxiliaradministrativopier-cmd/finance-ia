import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  onSnapshot,
  orderBy as orderByField,
  query as buildQuery,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import { toDataError } from "../errors";
import type { DataStore, DocumentData, QueryOptions, StoredDocument } from "./types";

/** Converte Timestamps do Firestore em Date, recursivamente. */
export function reviveTimestamps(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(reviveTimestamps);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, reviveTimestamps(inner)]),
    );
  }
  return value;
}

function constraints(options: QueryOptions = {}): QueryConstraint[] {
  const list: QueryConstraint[] = [];
  for (const [field, op, value] of options.where ?? []) list.push(where(field, op, value));
  if (options.orderBy)
    list.push(orderByField(options.orderBy.field, options.orderBy.direction ?? "asc"));
  if (options.limit) list.push(limitTo(options.limit));
  return list;
}

/**
 * Sem internet, o Firestore grava no cache local na hora, mas a promessa só termina quando o
 * servidor confirma. Para a tela não ficar "salvando" para sempre, não esperamos a confirmação
 * quando estamos offline; a escrita é enviada assim que a conexão voltar.
 */
async function commit(write: Promise<void>): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    write.catch((error) => console.error("Falha ao sincronizar uma escrita feita offline.", error));
    return;
  }
  try {
    await write;
  } catch (error) {
    throw toDataError(error);
  }
}

/**
 * Uma lista vazia vinda só do cache local, com internet, ainda não é a resposta: o cache pode estar
 * frio (primeiro acesso no aparelho). Esperamos o servidor para não mostrar "sem dados" por engano.
 * Sem internet, o cache é a melhor resposta possível.
 */
export function isProvisionalEmpty(
  empty: boolean,
  fromCache: boolean,
  online = typeof navigator === "undefined" || navigator.onLine,
): boolean {
  return empty && fromCache && online;
}

export function createFirestoreStore(db: Firestore): DataStore {
  const toStored = (id: string, data: DocumentData): StoredDocument => ({
    id,
    data: reviveTimestamps(data) as DocumentData,
  });

  return {
    kind: "firestore",

    async get(path) {
      try {
        const snapshot = await getDoc(doc(db, path));
        return snapshot.exists() ? toStored(snapshot.id, snapshot.data()) : null;
      } catch (error) {
        throw toDataError(error);
      }
    },

    async query(collectionPath, options) {
      try {
        const snapshot = await getDocs(
          buildQuery(collection(db, collectionPath), ...constraints(options)),
        );
        return snapshot.docs.map((item) => toStored(item.id, item.data()));
      } catch (error) {
        throw toDataError(error);
      }
    },

    watchDocument(path, onNext, onError) {
      return onSnapshot(
        doc(db, path),
        (snapshot) => onNext(snapshot.exists() ? toStored(snapshot.id, snapshot.data()) : null),
        (error) => onError(toDataError(error)),
      );
    },

    watchQuery(collectionPath, options, onNext, onError) {
      return onSnapshot(
        buildQuery(collection(db, collectionPath), ...constraints(options)),
        // Acompanha também mudanças de metadados para saber quando o servidor confirmou o resultado.
        { includeMetadataChanges: true },
        (snapshot) => {
          if (isProvisionalEmpty(snapshot.empty, snapshot.metadata.fromCache)) return;
          onNext(snapshot.docs.map((item) => toStored(item.id, item.data())));
        },
        (error) => onError(toDataError(error)),
      );
    },

    newId(collectionPath) {
      return doc(collection(db, collectionPath)).id;
    },

    set: (path, data) => commit(setDoc(doc(db, path), data)),

    update: (path, data) => commit(updateDoc(doc(db, path), data)),

    batch(operations) {
      const batch = writeBatch(db);
      for (const operation of operations) {
        if (operation.type === "set") batch.set(doc(db, operation.path), operation.data);
        else batch.update(doc(db, operation.path), operation.data);
      }
      return commit(batch.commit());
    },

    now: () => serverTimestamp(),
  };
}
