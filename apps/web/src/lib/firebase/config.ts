import type { FirebaseOptions } from "firebase/app";
import { isProduction, publicEnv, type PublicEnv } from "@/lib/env";

/**
 * Como o app se conecta ao backend:
 * - "firebase": projeto real (variáveis preenchidas);
 * - "emulator": emuladores locais (NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true);
 * - "demo": sem Firebase, só em desenvolvimento, para navegar pela interface;
 * - "unconfigured": produção sem configuração (o app mostra um aviso em vez de quebrar).
 */
export type BackendMode = "firebase" | "emulator" | "demo" | "unconfigured";

export const EMULATOR_PROJECT_ID = "demo-finance-ia";

export const emulatorHosts = {
  auth: "http://127.0.0.1:9099",
  firestore: { host: "127.0.0.1", port: 8080 },
  storage: { host: "127.0.0.1", port: 9199 },
} as const;

export function resolveFirebaseOptions(env: PublicEnv): FirebaseOptions | null {
  if (env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS) {
    // Projetos com prefixo "demo-" funcionam nos emuladores sem credenciais reais.
    return {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key",
      authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? EMULATOR_PROJECT_ID,
      storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com`,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:000000000000:web:demo",
    };
  }

  const options = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const complete = Object.values(options).every((value) => typeof value === "string");
  return complete ? (options as FirebaseOptions) : null;
}

export function resolveBackendMode(env: PublicEnv, production: boolean): BackendMode {
  if (env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS) return "emulator";
  if (resolveFirebaseOptions(env)) return "firebase";
  return production ? "unconfigured" : "demo";
}

export const backendMode: BackendMode = resolveBackendMode(publicEnv, isProduction);
