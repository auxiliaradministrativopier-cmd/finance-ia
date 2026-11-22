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

async function runUserSetup(user: AuthUser, displayName?: string): Promise<void> {
  try {
    await ensureUserSetup(await getDataStore(), user, displayName);
  } catch (error) {
    console.error("Não foi possível concluir a configuração inicial do usuário.", error);
  }
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
