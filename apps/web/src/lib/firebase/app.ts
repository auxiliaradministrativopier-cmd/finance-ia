import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { publicEnv } from "@/lib/env";
import { backendMode, resolveFirebaseOptions } from "./config";

let appCheck: AppCheck | null = null;

/** App do Firebase (singleton). Use apenas no navegador. */
export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("O Firebase do cliente deve ser usado apenas no navegador.");
  }
  const options = resolveFirebaseOptions(publicEnv);
  if (!options) {
    throw new Error(
      "Firebase não configurado. Copie apps/web/.env.example para apps/web/.env.local e preencha as variáveis.",
    );
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(options);

  // App Check garante que só o app oficial acessa o backend (desligado nos emuladores).
  const siteKey = publicEnv.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
  if (!appCheck && siteKey && backendMode === "firebase") {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  return app;
}

/** Token do App Check para as rotas /api do app (null quando o App Check está desligado). */
export async function getAppCheckToken(): Promise<string | null> {
  getFirebaseApp();
  if (!appCheck) return null;
  try {
    return (await getToken(appCheck)).token;
  } catch {
    return null;
  }
}
