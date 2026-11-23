import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseApp } from "./app";
import { backendMode, emulatorHosts } from "./config";

let db: Firestore | null = null;

/**
 * Firestore com cache local persistente: os dados abrem na hora e as escritas
 * feitas sem internet são sincronizadas quando a conexão volta.
 */
export function getDb(): Firestore {
  if (db) return db;

  db = initializeFirestore(getFirebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  if (backendMode === "emulator") {
    connectFirestoreEmulator(db, emulatorHosts.firestore.host, emulatorHosts.firestore.port);
  }
  return db;
}

/**
 * Apaga a cópia local dos dados (IndexedDB) ao sair da conta, para que nada fique no aparelho.
 * Com outra aba do app aberta, o navegador não deixa apagar agora; o cache é limpo na próxima saída.
 */
export async function clearLocalData(): Promise<void> {
  if (!db) return;
  const current = db;
  db = null;
  await terminate(current);
  try {
    await clearIndexedDbPersistence(current);
  } catch {
    // failed-precondition: outra aba ainda usa o banco local.
  }
}
