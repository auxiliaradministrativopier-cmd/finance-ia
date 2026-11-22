import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { backendMode, EMULATOR_PROJECT_ID } from "@/lib/firebase/config";
import { publicEnv } from "@/lib/env";

export interface VerifiedUser {
  uid: string;
}

let app: App | null = null;

function adminApp(): App | null {
  if (app) return app;
  if (backendMode === "emulator") {
    // O Admin SDK fala com o emulador de Auth quando esta variável existe.
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  }
  const projectId =
    backendMode === "emulator" ? EMULATOR_PROJECT_ID : publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  // Para verificar tokens basta o id do projeto: não há credencial de serviço aqui.
  app =
    getApps().find((item) => item.name === "finance-ia-auth") ??
    initializeApp({ projectId }, "finance-ia-auth");
  return app;
}

/**
 * Confere o token do Firebase enviado em `Authorization: Bearer <token>`.
 * Assinatura, validade, projeto e e-mail confirmado (contas com senha) são verificados.
 */
export async function verifyUser(authorization: string | null): Promise<VerifiedUser | null> {
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;

  if (backendMode === "demo") {
    // Modo demonstração existe só no desenvolvimento, sem Firebase: não há conta real a proteger.
    return token === "demo" && process.env.NODE_ENV !== "production" ? { uid: "demo" } : null;
  }
  const admin = adminApp();
  if (!admin) return null;
  try {
    const decoded = await getAuth(admin).verifyIdToken(token);
    const provider = decoded.firebase?.sign_in_provider;
    if (provider === "password" && !decoded.email_verified) return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
