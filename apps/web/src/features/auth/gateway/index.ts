import { ensureUserSetup } from "@/data/user-setup";
import { getDataStore } from "@/data/store";
import type { BackendMode } from "@/lib/firebase/config";
import type { AuthUser } from "../types";
import { createDemoGateway, createUnavailableGateway } from "./demo-gateway";
import { createFirebaseGateway } from "./firebase-gateway";
import type { AuthGateway } from "./types";

export type { AuthGateway } from "./types";

/**
 * Após cadastro ou login, garante perfil, preferências e categorias padrão.
 * Uma falha aqui não impede o acesso: a configuração é refeita no próximo login.
 */
export function withUserSetup(gateway: AuthGateway, setup = runUserSetup): AuthGateway {
  return {
    ...gateway,
    async signInWithEmail(email, password) {
      const user = await gateway.signInWithEmail(email, password);
      await setup(user);
      return user;
    },
    async signUpWithEmail(input) {
      const user = await gateway.signUpWithEmail(input);
      await setup(user, input.name);
      return user;
    },
    async signInWithGoogle() {
      const user = await gateway.signInWithGoogle();
      await setup(user);
      return user;
    },
  };
}

const setupRuns = new Map<string, Promise<void>>();

/**
 * Configuração inicial (perfil, preferências, categorias). Não faz nada se já existir.
 * Uma execução por vez por usuário: o cadastro e a abertura da sessão não gravam em paralelo.
 */
export function runUserSetup(user: AuthUser, displayName?: string): Promise<void> {
  const running = setupRuns.get(user.uid);
  if (running) return running;
  const run = (async () => {
    try {
      await ensureUserSetup(await getDataStore(), user, displayName);
    } catch (error) {
      // Saiu da conta no meio da configuração (o Firestore foi encerrado): ela roda na próxima sessão.
      const cause = (error as { cause?: { code?: string } }).cause;
      if (cause?.code === "aborted") return;
      console.error("Não foi possível concluir a configuração inicial do usuário.", error);
    } finally {
      // Só evita execuções simultâneas; depois de terminar, pode rodar de novo (não faz nada se já existe).
      setupRuns.delete(user.uid);
    }
  })();
  setupRuns.set(user.uid, run);
  return run;
}

export function createAuthGateway(mode: BackendMode): AuthGateway {
  switch (mode) {
    case "firebase":
    case "emulator":
      return withUserSetup(createFirebaseGateway(mode));
    case "demo":
      return withUserSetup(
        createDemoGateway(typeof window === "undefined" ? null : window.localStorage),
      );
    case "unconfigured":
      return createUnavailableGateway();
  }
}
