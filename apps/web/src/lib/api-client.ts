import { backendMode } from "@/lib/firebase/config";

/**
 * Cabeçalhos para chamar as rotas /api do próprio app: o token de login (quem é o usuário)
 * e, quando ativo, o token do App Check (o pedido vem do app de verdade).
 */
export async function apiHeaders(idToken: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${idToken}` };
  if (backendMode === "firebase") {
    const { getAppCheckToken } = await import("@/lib/firebase/app");
    const appCheckToken = await getAppCheckToken();
    if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;
  }
  return headers;
}
