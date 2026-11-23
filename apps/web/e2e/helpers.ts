import { expect, type Page } from "@playwright/test";

export const AUTH = "http://127.0.0.1:9099";
export const FIRESTORE =
  "http://127.0.0.1:8080/v1/projects/demo-finance-ia/databases/(default)/documents";
export const FAKE_AI = "http://127.0.0.1:4010";
const owner = { headers: { Authorization: "Bearer owner" } };

/** Documentos de uma coleção, lidos como administrador (ignora as Security Rules). */
export async function listDocs(path: string) {
  const response = await fetch(`${FIRESTORE}/${path}?pageSize=300`, owner);
  const body = (await response.json()) as {
    documents?: { name: string; fields: Record<string, Record<string, unknown>> }[];
  };
  return body.documents ?? [];
}

export function field(
  doc: { fields: Record<string, Record<string, unknown>> },
  key: string,
): unknown {
  const value = doc.fields[key];
  if (!value) return undefined;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("nullValue" in value) return null;
  return value.stringValue ?? value.booleanValue ?? value.doubleValue ?? value.timestampValue;
}

/** Cria uma conta nova, confirma o e-mail pelo emulador e chega ao Dashboard. Devolve o uid. */
export async function signUp(
  page: Page,
  name = "Juliana Souza",
): Promise<{ uid: string; email: string }> {
  const email = `juliana${Date.now()}${Math.floor(Math.random() * 1000)}@exemplo.com`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("financas2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/verificar-email", { timeout: 30_000 });
  let link: string | undefined;
  await expect
    .poll(async () => {
      const codes = (await (
        await fetch(`${AUTH}/emulator/v1/projects/demo-finance-ia/oobCodes`)
      ).json()) as {
        oobCodes: { email: string; requestType: string; oobLink: string }[];
      };
      link = codes.oobCodes.find(
        (code) => code.email === email && code.requestType === "VERIFY_EMAIL",
      )?.oobLink;
      return Boolean(link);
    })
    .toBe(true);
  // Confirma o e-mail pela API do emulador (como o clique no link do e-mail).
  const oobCode = new URL(link!).searchParams.get("oobCode");
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oobCode }),
  });
  await page.getByRole("button", { name: "Já confirmei" }).click();
  await page.waitForURL("**/inicio", { timeout: 30_000 });
  const accounts = (await (
    await fetch(
      `${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-finance-ia/accounts:query`,
      {
        method: "POST",
        headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
        body: "{}",
      },
    )
  ).json()) as { userInfo: { email: string; localId: string }[] };
  const uid = accounts.userInfo.find((item) => item.email === email)!.localId;
  // Espera a configuração inicial (perfil e categorias padrão) chegar ao banco.
  await expect
    .poll(async () => (await listDocs(`users/${uid}/categories`)).length, { timeout: 30_000 })
    .toBe(24);
  return { uid, email };
}

export const sheet = (page: Page) => page.getByRole("dialog");

export async function createAccount(
  page: Page,
  name: string,
  initialBalance: string,
  date: string,
) {
  await page.goto("/contas");
  await page.getByRole("button", { name: "Nova conta" }).first().click();
  await sheet(page).getByLabel("Nome").fill(name);
  await sheet(page).getByLabel("Saldo inicial").fill(initialBalance);
  await sheet(page).getByLabel("Data do saldo").fill(date);
  await sheet(page)
    .getByRole("button", { name: /Criar conta|Salvar/ })
    .click();
  await expect(sheet(page)).toBeHidden();
}

export async function addEntry(
  page: Page,
  kind: "income" | "expense",
  entry: { amount: string; description: string; category: string; date: string },
) {
  await page.goto(kind === "income" ? "/fluxo/receitas" : "/fluxo/despesas");
  await page
    .getByRole("button", { name: kind === "income" ? "Nova receita" : "Nova despesa" })
    .first()
    .click();
  await sheet(page).getByLabel("Valor").fill(entry.amount);
  await sheet(page).getByLabel("Descrição").fill(entry.description);
  await sheet(page).getByRole("radio", { name: entry.category }).click();
  await sheet(page).getByLabel("Data").fill(entry.date);
  await sheet(page)
    .getByRole("button", { name: kind === "income" ? "Salvar receita" : "Salvar despesa" })
    .click();
  await expect(sheet(page)).toBeHidden();
}

/** Falha o teste se a Content-Security-Policy bloquear algo ou a página lançar erro. */
export function watchPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy|Refused to/i.test(message.text()))
      errors.push(message.text());
  });
  return errors;
}
