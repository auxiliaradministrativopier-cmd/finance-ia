import "server-only";
import { backendMode } from "@/lib/firebase/config";
import { publicEnv } from "@/lib/env";
import { adminApp, adminAppCheck, adminAuth } from "../firebase-admin";

export interface VerifiedUser {
  uid: string;
  /** Quando o usuário fez login (segundos desde 1970). Serve para exigir login recente. */
  authTime: number | null;
}

/**
 * Confere o token do Firebase enviado em `Authorization: Bearer <token>`.
 * Assinatura, validade, projeto, revogação (sair de todos os aparelhos, conta bloqueada)
 * e e-mail confirmado (contas com senha) são verificados.
 */
export async function verifyUser(authorization: string | null): Promise<VerifiedUser | null> {
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;

  if (backendMode === "demo") {
    // Modo demonstração existe só no desenvolvimento, sem Firebase: não há conta real a proteger.
    return token === "demo" && process.env.NODE_ENV !== "production"
      ? { uid: "demo", authTime: Math.floor(Date.now() / 1000) }
      : null;
  }
  const admin = adminApp();
  if (!admin) return null;
  try {
    const decoded = await adminAuth(admin).verifyIdToken(token, true);
    const provider = decoded.firebase?.sign_in_provider;
    if (provider === "password" && !decoded.email_verified) return null;
    return { uid: decoded.uid, authTime: decoded.auth_time ?? null };
  } catch {
    return null;
  }
}

/**
 * App Check: quando o app está configurado com reCAPTCHA Enterprise, só aceita pedidos vindos
 * do app de verdade (cabeçalho X-Firebase-AppCheck). Sem App Check configurado, deixa passar.
 */
export async function verifyAppCheck(header: string | null): Promise<boolean> {
  if (backendMode !== "firebase" || !publicEnv.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY) return true;
  const admin = adminApp();
  if (!admin || !header) return false;
  try {
    await adminAppCheck(admin).verifyToken(header);
    return true;
  } catch {
    return false;
  }
}

/** Login nos últimos 5 minutos (exigido para ações sensíveis, como excluir a conta). */
export function signedInRecently(user: VerifiedUser, maxAgeSeconds = 300): boolean {
  return user.authTime !== null && Date.now() / 1000 - user.authTime <= maxAgeSeconds;
}
