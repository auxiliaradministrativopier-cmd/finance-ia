import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  browserPopupRedirectResolver,
  type Auth,
} from "firebase/auth";
import { getFirebaseApp } from "./app";
import { backendMode, emulatorHosts } from "./config";

let auth: Auth | null = null;

/** Firebase Authentication com sessão persistente e mensagens em português. */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;

  auth = initializeAuth(getFirebaseApp(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  auth.languageCode = "pt-BR";

  if (backendMode === "emulator") {
    connectAuthEmulator(auth, emulatorHosts.auth, { disableWarnings: true });
  }
  return auth;
}
