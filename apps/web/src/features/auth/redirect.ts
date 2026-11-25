import type { AuthUser } from "./types";

export const ROUTES = {
  welcome: "/boas-vindas",
  signIn: "/entrar",
  signUp: "/cadastro",
  verifyEmail: "/verificar-email",
  home: "/inicio",
} as const;

/**
 * Aceita apenas caminhos internos para o parâmetro "next" (evita redirecionamento aberto).
 * Bloqueia "//site.com", "/\\site.com" e esquemas como "javascript:".
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Caracteres de controle e espaços: o navegador remove tabulação e quebra de linha da URL,
  // e "/<TAB>/site.com" viraria "//site.com" (redirecionamento para fora do app).
  if (/[\u0000-\u001F\u007F\s]/.test(raw)) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw.startsWith(ROUTES.signIn) || raw.startsWith(ROUTES.signUp)) return null;
  return raw;
}

/** Para onde o usuário deve ir depois de entrar ou ao abrir o app. */
export function destinationFor(user: AuthUser | null, next?: string | null): string {
  if (!user) return ROUTES.welcome;
  if (!user.emailVerified) return ROUTES.verifyEmail;
  // O onboarding (telas 09–12) entra aqui quando for implementado.
  return safeNextPath(next) ?? ROUTES.home;
}

export function signInPathWithNext(pathname: string): string {
  const next = safeNextPath(pathname);
  return next && next !== ROUTES.home
    ? `${ROUTES.signIn}?next=${encodeURIComponent(next)}`
    : ROUTES.signIn;
}
