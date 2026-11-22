import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebaseApp } from "./app";
import { backendMode, emulatorHosts } from "./config";

let storage: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage {
  if (storage) return storage;

  storage = getStorage(getFirebaseApp());
  if (backendMode === "emulator") {
    connectStorageEmulator(storage, emulatorHosts.storage.host, emulatorHosts.storage.port);
  }
  return storage;
}
