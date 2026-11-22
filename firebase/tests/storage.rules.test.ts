import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;
const UID = "juliana";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-finance-ia",
    storage: { rules: readFileSync(resolve(__dirname, "../storage.rules"), "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
});

const image = (bytes: number) => new Uint8Array(bytes);
const storageOf = (uid: string) => env.authenticatedContext(uid).storage();

describe("foto de perfil", () => {
  it("o dono envia e lê a própria foto", async () => {
    const avatar = ref(storageOf(UID), `users/${UID}/avatar/avatar.png`);
    await assertSucceeds(uploadBytes(avatar, image(1024), { contentType: "image/png" }));
    await assertSucceeds(getBytes(avatar));
  });

  it("outro usuário não lê nem substitui a foto", async () => {
    await uploadBytes(ref(storageOf(UID), `users/${UID}/avatar/avatar.png`), image(1024), {
      contentType: "image/png",
    });
    const intruderRef = ref(storageOf("intruso"), `users/${UID}/avatar/avatar.png`);
    await assertFails(getBytes(intruderRef));
    await assertFails(uploadBytes(intruderRef, image(1024), { contentType: "image/png" }));
  });

  it("recusa arquivos que não são imagem ou passam de 5 MB", async () => {
    const avatar = ref(storageOf(UID), `users/${UID}/avatar/avatar.png`);
    await assertFails(uploadBytes(avatar, image(1024), { contentType: "application/pdf" }));
    await assertFails(
      uploadBytes(avatar, image(5 * 1024 * 1024 + 1), { contentType: "image/png" }),
    );
  });

  it("nega qualquer outro caminho", async () => {
    await assertFails(
      uploadBytes(ref(storageOf(UID), `users/${UID}/outros/a.png`), image(10), {
        contentType: "image/png",
      }),
    );
    await assertFails(
      uploadBytes(
        ref(env.unauthenticatedContext().storage(), `users/${UID}/avatar/a.png`),
        image(10),
        { contentType: "image/png" },
      ),
    );
  });
});
