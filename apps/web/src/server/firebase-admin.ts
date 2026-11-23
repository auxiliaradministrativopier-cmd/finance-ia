import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { publicEnv } from "@/lib/env";
import { backendMode, EMULATOR_PROJECT_ID } from "@/lib/firebase/config";

const APP_NAME = "finance-ia-server";
let app: App | null = null;

/**
 * Firebase Admin do servidor. Em produção usa as credenciais padrão do ambiente (App Hosting);
 * com os emuladores, fala com eles. Sem Firebase (modo demonstração), não existe.
 */
export function adminApp(): App | null {
  if (app) return app;
  if (backendMode === "emulator") {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
  }
  const projectId =
    backendMode === "emulator" ? EMULATOR_PROJECT_ID : publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || (backendMode !== "firebase" && backendMode !== "emulator")) return null;
  const storageBucket =
    backendMode === "emulator"
      ? `${EMULATOR_PROJECT_ID}.appspot.com`
      : publicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  app =
    getApps().find((item) => item.name === APP_NAME) ??
    initializeApp({ projectId, ...(storageBucket ? { storageBucket } : {}) }, APP_NAME);
  return app;
}

export const adminAuth = (instance: App) => getAuth(instance);
export const adminDb = (instance: App) => getFirestore(instance);
export const adminStorage = (instance: App) => getStorage(instance);
export const adminAppCheck = (instance: App) => getAppCheck(instance);
