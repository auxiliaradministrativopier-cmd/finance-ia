import { parsePublicEnv } from "../env";
import { resolveBackendMode, resolveFirebaseOptions } from "../firebase/config";

const complete = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "finance-ia-dev.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "finance-ia-dev",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "finance-ia-dev.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
};

describe("modo de backend", () => {
  it("usa o Firebase quando todas as variáveis estão preenchidas", () => {
    expect(resolveBackendMode(parsePublicEnv(complete), true)).toBe("firebase");
  });

  it("trata variáveis vazias como ausentes", () => {
    const env = parsePublicEnv({ ...complete, NEXT_PUBLIC_FIREBASE_APP_ID: "  " });
    expect(resolveFirebaseOptions(env)).toBeNull();
  });

  it("sem configuração: demonstração no desenvolvimento, aviso em produção", () => {
    expect(resolveBackendMode(parsePublicEnv({}), false)).toBe("demo");
    expect(resolveBackendMode(parsePublicEnv({}), true)).toBe("unconfigured");
  });

  it("os emuladores funcionam sem credenciais reais", () => {
    const env = parsePublicEnv({ NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true" });
    expect(resolveBackendMode(env, false)).toBe("emulator");
    expect(resolveFirebaseOptions(env)?.projectId).toBe("demo-finance-ia");
  });

  it("recusa uma URL do app inválida", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "não é url" })).toThrow();
  });
});
