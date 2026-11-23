import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  addEntry,
  AUTH,
  createAccount,
  FAKE_AI,
  FIRESTORE,
  listDocs,
  sheet,
  signUp,
  watchPageErrors,
} from "./helpers";

test("assistente recebe só o resumo mascarado; IFA aparece", async ({ page }) => {
  const errors = watchPageErrors(page);
  const { uid, email } = await signUp(page);
  const today = new Date().toISOString().slice(0, 10);
  await createAccount(page, "Itaú Ag 1234 CC 56789-0", "500000", `${today.slice(0, 7)}-01`);
  await addEntry(page, "income", {
    amount: "900000",
    description: "Salário",
    category: "Salário",
    date: `${today.slice(0, 7)}-05`,
  });
  await addEntry(page, "expense", {
    amount: "145000",
    description: "Pix para maria.souza@gmail.com CPF 123.456.789-09",
    category: "Mercado",
    date: `${today.slice(0, 7)}-06`,
  });

  await page.goto("/saude-financeira");
  await expect(page.getByRole("region", { name: "Seu IFA", exact: true })).toBeVisible();

  await fetch(`${FAKE_AI}/__log`, { method: "DELETE" });
  await page.goto("/ia");
  await page
    .getByLabel("Sua pergunta")
    .fill("Qual minha maior despesa? Meu telefone é (11) 91234-5678");
  await page.getByLabel("Sua pergunta").press("Enter");
  await expect(page.getByText("Dados pessoais removidos antes do envio.")).toBeVisible();
  await expect(page.getByRole("article", { name: "Resposta do Finance IA" })).toContainText(
    "Sua maior despesa foi",
  );

  const log = (await (await fetch(`${FAKE_AI}/__log`)).json()) as { body: unknown }[];
  const sent = JSON.stringify(log.map((item) => item.body));
  expect(sent).not.toMatch(/gmail|123\.456\.789|91234|56789|Itaú|Juliana/);
  expect(sent).not.toContain(uid);
  expect(sent).not.toContain(email);
  expect(errors).toEqual([]);
});

test("privacidade: baixar os dados e excluir a conta apaga tudo", async ({ page }) => {
  const errors = watchPageErrors(page);
  const { uid, email } = await signUp(page);
  const today = new Date().toISOString().slice(0, 10);
  await createAccount(page, "Nubank", "100000", `${today.slice(0, 7)}-01`);

  await page.goto("/configuracoes/privacidade");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar meus dados" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^finance-ia-dados-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(readFileSync((await file.path())!, "utf8")) as {
    accounts: { name: string }[];
    profile: { email: string };
  };
  expect(data.accounts.map((item) => item.name)).toEqual(["Nubank"]);
  expect(data.profile.email).toBe(email);

  await page.getByRole("button", { name: "Excluir minha conta" }).click();
  await sheet(page).getByLabel("Sua senha").fill("financas2026");
  await sheet(page).getByLabel("Entendo que a exclusão é definitiva.").check();
  await sheet(page).getByRole("button", { name: "Excluir minha conta" }).click();
  await page.waitForURL(/\/(boas-vindas|entrar)/, { timeout: 30_000 });

  expect(await listDocs(`users/${uid}/accounts`)).toEqual([]);
  const userDoc = await fetch(`${FIRESTORE}/users/${uid}`, {
    headers: { Authorization: "Bearer owner" },
  });
  expect(userDoc.status).toBe(404);
  const accounts = (await (
    await fetch(
      `${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-finance-ia/accounts:query`,
      {
        method: "POST",
        headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
        body: "{}",
      },
    )
  ).json()) as { userInfo?: { localId: string }[] };
  expect((accounts.userInfo ?? []).some((item) => item.localId === uid)).toBe(false);
  // Ao sair, o cache local do Firestore é apagado do navegador.
  const databases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((db) => db.name ?? ""),
  );
  expect(databases.some((name) => name.startsWith("firestore/"))).toBe(false);
  expect(errors).toEqual([]);
});

test("limpeza diária: só com o segredo; apaga o que foi excluído há mais de 30 dias", async ({
  page,
  request,
}) => {
  const { uid } = await signUp(page);
  const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
  const recent = new Date().toISOString();
  for (const [id, deletedAt] of [
    ["antiga", old],
    ["recente", recent],
  ] as const) {
    await fetch(`${FIRESTORE}/users/${uid}/categories/${id}`, {
      method: "PATCH",
      headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: { name: { stringValue: id }, deletedAt: { timestampValue: deletedAt } },
      }),
    });
  }
  expect((await request.post("/api/manutencao/limpeza")).status()).toBe(401);
  const response = await request.post("/api/manutencao/limpeza", {
    headers: { Authorization: "Bearer segredo-de-teste-e2e-123" },
  });
  expect(response.status()).toBe(200);
  const ids = (await listDocs(`users/${uid}/categories`)).map((doc) => doc.name.split("/").at(-1));
  expect(ids).not.toContain("antiga");
  expect(ids).toContain("recente");
});
