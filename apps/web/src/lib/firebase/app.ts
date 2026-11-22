import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { publicEnv } from "@/lib/env";
import { backendMode, resolveFirebaseOptions } from "./config";

let appCheckStarted = false;

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
  if (!appCheckStarted && siteKey && backendMode === "firebase") {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckStarted = true;
  }

  return app;
}
