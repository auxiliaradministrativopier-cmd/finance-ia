import { AuthError } from "../errors";
import type { AuthUser } from "../types";
import type { AuthGateway } from "./types";

const STORAGE_KEY = "finance-ia:demo-session";

/**
 * Autenticação de demonstração, usada apenas em desenvolvimento quando o Firebase não está configurado.
 * Aceita qualquer e-mail e senha válidos e guarda a sessão no navegador. Nenhum dado vai para servidor.
 */
export function createDemoGateway(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
): AuthGateway {
  const listeners = new Set<(user: AuthUser | null) => void>();

  function read(): AuthUser | null {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  function write(user: AuthUser | null) {
    try {
      if (user) storage?.setItem(STORAGE_KEY, JSON.stringify(user));
      else storage?.removeItem(STORAGE_KEY);
    } catch {
      // Armazenamento indisponível: a sessão vale só enquanto a página estiver aberta.
    }
    listeners.forEach((listener) => listener(user));
  }

  function demoUser(email: string, name?: string): AuthUser {
    return {
      uid: `demo-${email.toLowerCase()}`,
      email,
      displayName: name ?? email.split("@")[0] ?? "Visitante",
      emailVerified: true,
      photoUrl: null,
      providerIds: ["password"],
    };
  }

  return {
    mode: "demo",

    subscribe(listener) {
      listeners.add(listener);
      // Entrega o estado atual de forma assíncrona, como o Firebase.
      queueMicrotask(() => listener(read()));
      return () => listeners.delete(listener);
    },

    async signInWithEmail(email) {
      const user = demoUser(email);
      write(user);
      return user;
    },

    async signUpWithEmail({ name, email }) {
      const user = demoUser(email, name);
      write(user);
      return user;
    },

    async signInWithGoogle() {
      const user = {
        ...demoUser("visitante@exemplo.com", "Visitante"),
        providerIds: ["google.com"],
      };
      write(user);
      return user;
    },

    async sendPasswordReset() {},

    async sendVerificationEmail() {},

    async refreshUser() {
      return read();
    },

    async signOut() {
      write(null);
    },

    async updateDisplayName(name) {
      const current = read();
      if (!current) throw new AuthError("requires-recent-login");
      const user = { ...current, displayName: name };
      write(user);
      return user;
    },

    async updatePhotoUrl(url) {
      const current = read();
      if (!current) throw new AuthError("requires-recent-login");
      const user = { ...current, photoUrl: url };
      write(user);
      return user;
    },

    async changePassword() {
      if (!read()) throw new AuthError("requires-recent-login");
    },

    // Modo demonstração (só no desenvolvimento): o servidor aceita este marcador apenas nesse modo.
    async getIdToken() {
      return read() ? "demo" : null;
    },

    async reauthenticate() {
      if (!read()) throw new AuthError("requires-recent-login");
    },
  };
}

/** Usado em produção sem configuração: nenhuma ação de login funciona e o app explica o motivo. */
export function createUnavailableGateway(): AuthGateway {
  const unavailable = async (): Promise<never> => {
    throw new AuthError("unavailable");
  };
  return {
    mode: "unconfigured",
    subscribe(listener) {
      queueMicrotask(() => listener(null));
      return () => {};
    },
    signInWithEmail: unavailable,
    signUpWithEmail: unavailable,
    signInWithGoogle: unavailable,
    sendPasswordReset: unavailable,
    sendVerificationEmail: unavailable,
    refreshUser: async () => null,
    signOut: async () => {},
    updateDisplayName: unavailable,
    updatePhotoUrl: unavailable,
    changePassword: unavailable,
    getIdToken: async () => null,
    reauthenticate: unavailable,
  };
}
