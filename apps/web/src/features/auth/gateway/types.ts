import type { BackendMode } from "@/lib/firebase/config";
import type { AuthUser, SignUpInput } from "../types";

/**
 * Contrato de autenticação. A interface isola o app do provedor:
 * trocar ou simular o backend não muda nenhuma tela.
 */
export interface AuthGateway {
  readonly mode: BackendMode;
  /** Avisa a cada mudança de sessão. Retorna a função para cancelar. */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<AuthUser>;
  signUpWithEmail(input: SignUpInput): Promise<AuthUser>;
  signInWithGoogle(): Promise<AuthUser>;
  sendPasswordReset(email: string): Promise<void>;
  sendVerificationEmail(): Promise<void>;
  /** Recarrega o usuário (por exemplo, para saber se o e-mail foi confirmado). */
  refreshUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  /** Atualiza o nome exibido na conta de autenticação. */
  updateDisplayName(name: string): Promise<AuthUser>;
  /** Atualiza a foto da conta de autenticação (URL já enviada ao Storage). */
  updatePhotoUrl(url: string | null): Promise<AuthUser>;
  /** Troca a senha, confirmando a senha atual (reautenticação). */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /**
   * Token de curta duração que prova a identidade para o servidor do app (rotas /api).
   * Nunca é enviado a serviços de terceiros.
   */
  getIdToken(): Promise<string | null>;
}
