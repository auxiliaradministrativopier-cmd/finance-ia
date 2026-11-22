export type AuthErrorCode =
  | "invalid-credentials"
  | "email-in-use"
  | "weak-password"
  | "too-many-requests"
  | "network"
  | "popup-closed"
  | "popup-blocked"
  | "requires-recent-login"
  | "wrong-current-password"
  | "unavailable"
  | "unknown";

const messages: Record<AuthErrorCode, string> = {
  // Mensagem neutra: não revela se o e-mail existe.
  "invalid-credentials": "E-mail ou senha incorretos.",
  "email-in-use": "Já existe uma conta com este e-mail. Entre ou recupere a senha.",
  "weak-password": "Escolha uma senha mais forte: pelo menos 8 caracteres, com letras e números.",
  "too-many-requests": "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  network: "Sem conexão com a internet. Verifique sua rede e tente de novo.",
  "popup-closed": "A janela de login foi fechada antes de terminar.",
  "popup-blocked":
    "O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.",
  "requires-recent-login": "Por segurança, entre de novo para concluir esta ação.",
  "wrong-current-password": "A senha atual está incorreta.",
  unavailable: "O app ainda não está conectado ao servidor. Tente novamente mais tarde.",
  unknown: "Não foi possível concluir agora. Tente de novo em instantes.",
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, options?: { cause?: unknown }) {
    super(messages[code], options);
    this.name = "AuthError";
    this.code = code;
  }

  /** Erros que não precisam de aviso (o usuário desistiu de propósito). */
  get isSilent(): boolean {
    return this.code === "popup-closed";
  }
}

const firebaseCodeMap: Record<string, AuthErrorCode> = {
  "auth/invalid-credential": "invalid-credentials",
  "auth/invalid-login-credentials": "invalid-credentials",
  "auth/user-not-found": "invalid-credentials",
  "auth/wrong-password": "invalid-credentials",
  "auth/invalid-email": "invalid-credentials",
  "auth/user-disabled": "invalid-credentials",
  "auth/email-already-in-use": "email-in-use",
  "auth/weak-password": "weak-password",
  "auth/password-does-not-meet-requirements": "weak-password",
  "auth/too-many-requests": "too-many-requests",
  "auth/network-request-failed": "network",
  "auth/popup-closed-by-user": "popup-closed",
  "auth/cancelled-popup-request": "popup-closed",
  "auth/popup-blocked": "popup-blocked",
  "auth/requires-recent-login": "requires-recent-login",
};

/** Converte qualquer erro do Firebase Auth em um AuthError com mensagem em português. */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return new AuthError(firebaseCodeMap[code] ?? "unknown", { cause: error });
}
