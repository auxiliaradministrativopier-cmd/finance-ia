import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
