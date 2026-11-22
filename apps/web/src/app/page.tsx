import { SessionRedirect } from "@/features/auth/guards";

/**
 * Splash (tela 01): verifica a sessão e decide o destino.
 * Sessão válida → /inicio · e-mail não confirmado → /verificar-email · sem sessão → /boas-vindas.
 */
export default function RootPage() {
  return <SessionRedirect />;
}
