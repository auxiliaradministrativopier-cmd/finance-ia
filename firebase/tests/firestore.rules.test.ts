import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const UID = "juliana";
const EMAIL = "juliana@exemplo.com";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-finance-ia",
    firestore: { rules: readFileSync(resolve(__dirname, "../firestore.rules"), "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

function asOwner() {
  return env.authenticatedContext(UID, { email: EMAIL }).firestore();
}

function newProfile(overrides: Record<string, unknown> = {}) {
  return {
    displayName: "Juliana Souza",
    email: EMAIL,
    onboarding: { completed: false, step: 0 },
    consents: { termsVersion: "1.0", privacyVersion: "1.0", acceptedAt: serverTimestamp() },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
    ...overrides,
  };
}

async function seedProfile() {
  await assertSucceeds(setDoc(doc(asOwner(), "users", UID), newProfile()));
}

describe("users/{uid}", () => {
  it("o dono cria o próprio perfil com consentimento", async () => {
    await seedProfile();
  });

  it("ninguém cria o perfil de outra pessoa", async () => {
    const other = env
      .authenticatedContext("outra-pessoa", { email: "outra@exemplo.com" })
      .firestore();
    await assertFails(setDoc(doc(other, "users", UID), newProfile()));
  });

  it("visitantes não leem perfis", async () => {
    await seedProfile();
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users", UID)));
  });

  it("exige o aceite dos termos na criação", async () => {
    const { consents: _consents, ...withoutConsents } = newProfile();
    await assertFails(setDoc(doc(asOwner(), "users", UID), withoutConsents));
  });

  it("o e-mail precisa ser o da conta autenticada", async () => {
    await assertFails(
      setDoc(doc(asOwner(), "users", UID), newProfile({ email: "falso@exemplo.com" })),
    );
  });

  it("recusa campos desconhecidos e nome inválido", async () => {
    await assertFails(setDoc(doc(asOwner(), "users", UID), newProfile({ isAdmin: true })));
    await assertFails(setDoc(doc(asOwner(), "users", UID), newProfile({ displayName: "J" })));
  });

  it("outro usuário não lê nem altera o perfil", async () => {
    await seedProfile();
    const intruder = env
      .authenticatedContext("intruso", { email: "intruso@exemplo.com" })
      .firestore();
    await assertFails(getDoc(doc(intruder, "users", UID)));
    await assertFails(
      updateDoc(doc(intruder, "users", UID), {
        displayName: "Hackeado",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(getDoc(doc(intruder, "users", UID, "settings", "preferences")));
  });

  it("o dono troca e remove a foto", async () => {
    await seedProfile();
    const ref = doc(asOwner(), "users", UID);
    await assertSucceeds(
      updateDoc(ref, { photoUrl: "https://exemplo.com/foto.jpg", updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(ref, { photoUrl: null, updatedAt: serverTimestamp() }));
  });

  it("o dono atualiza o nome, mas não o plano nem o e-mail", async () => {
    await seedProfile();
    const ref = doc(asOwner(), "users", UID);
    await assertSucceeds(
      updateDoc(ref, { displayName: "Juliana S.", updatedAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(ref, { plan: { id: "premium" }, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { email: "nova@exemplo.com", updatedAt: serverTimestamp() }));
  });

  it("não permite alterar a data de criação", async () => {
    await seedProfile();
    const ref = doc(asOwner(), "users", UID);
    await assertFails(
      updateDoc(ref, { createdAt: new Date(2020, 0, 1), updatedAt: serverTimestamp() }),
    );
  });
});

describe("users/{uid}/settings/preferences", () => {
  const preferences = () => ({
    theme: "system",
    locale: "pt-BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    hideValues: false,
    monthStartDay: 1,
    notifications: { push: true, email: true, inApp: true },
    ai: { enabled: true },
    security: { appLock: false },
    privacy: { analyticsConsent: false },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  });

  it("o dono cria as preferências", async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), "users", UID, "settings", "preferences"), preferences()),
    );
  });

  it("valida o dia de início do mês e o nome do documento", async () => {
    await assertFails(
      setDoc(doc(asOwner(), "users", UID, "settings", "preferences"), {
        ...preferences(),
        monthStartDay: 31,
      }),
    );
    await assertFails(setDoc(doc(asOwner(), "users", UID, "settings", "outro"), preferences()));
  });
});

describe("coleções sem regra", () => {
  it("são negadas por padrão", async () => {
    await assertFails(setDoc(doc(asOwner(), "users", UID, "transactions", "t1"), { amount: 100 }));
    await assertFails(getDoc(doc(asOwner(), "users", UID, "auditLog", "a1")));
  });

  it("dados derivados são só leitura para o dono", async () => {
    await assertSucceeds(getDoc(doc(asOwner(), "users", UID, "aggregates", "current")));
    await assertFails(
      setDoc(doc(asOwner(), "users", UID, "aggregates", "current"), { netWorth: 1 }),
    );
  });
});
