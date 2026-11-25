import { expect, test } from "@playwright/test";
import { createAccount, field, listDocs, sheet, signUp, watchPageErrors } from "./helpers";

const live = <T extends { fields: Record<string, Record<string, unknown>> }>(docs: T[]) =>
  docs.filter((doc) => field(doc, "deletedAt") === null);

test("autenticação: sair, senha errada, entrar, recuperar senha e guardas", async ({ page }) => {
  const errors = watchPageErrors(page);
  const { email } = await signUp(page);
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.waitForURL("**/boas-vindas");

  // Área logada sem sessão volta para fora.
  await page.goto("/inicio");
  await page.waitForURL(/\/(boas-vindas|entrar)/);

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senhaerrada9");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await page.getByLabel("Senha", { exact: true }).fill("financas2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/inicio");

  // Com sessão, as telas de entrada levam ao app.
  await page.goto("/entrar");
  await page.waitForURL("**/inicio");
  expect(errors).toEqual([]);
});

test("recuperar senha responde sem revelar se o e-mail existe", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill("ninguem@exemplo.com");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
});

test("fluxo de caixa: recorrência, parcelamento no cartão, busca e edição em série", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  const { uid } = await signUp(page);
  const today = new Date().toISOString().slice(0, 10);
  await createAccount(page, "Nubank", "150000", `${today.slice(0, 7)}-01`);

  await page.goto("/cartoes");
  await page.getByRole("button", { name: "Novo cartão" }).first().click();
  await sheet(page).getByLabel("Nome").fill("Visa");
  await sheet(page).getByLabel("Limite").fill("500000");
  await sheet(page).getByLabel("Fechamento da fatura").selectOption("3");
  await sheet(page).getByLabel("Vencimento").selectOption("10");
  await sheet(page).getByRole("button", { name: "Criar cartão" }).click();
  await expect(page.getByText("Cartão criado.")).toBeVisible();

  // Salário mensal recorrente.
  await page.goto("/fluxo/receitas");
  await page.getByRole("button", { name: "Nova receita" }).first().click();
  await sheet(page).getByLabel("Valor").fill("720000");
  await sheet(page).getByLabel("Descrição").fill("Salário");
  await sheet(page).getByRole("radio", { name: "Salário" }).click();
  await sheet(page)
    .getByLabel("Data")
    .fill(`${today.slice(0, 7)}-05`);
  await sheet(page).getByRole("radio", { name: "Repetir" }).click();
  await sheet(page).getByRole("button", { name: "Salvar receita" }).click();
  await expect(page.getByText("Receita recorrente salva.")).toBeVisible();

  // TV em 3x no cartão.
  await page.goto("/fluxo/despesas");
  await page.getByRole("button", { name: "Nova despesa" }).first().click();
  await sheet(page).getByLabel("Valor").fill("240000");
  await sheet(page).getByLabel("Descrição").fill("TV 55 polegadas");
  await sheet(page)
    .getByRole("button", { name: /^Mais \d+/ })
    .click();
  await sheet(page).getByRole("radio", { name: "Compras" }).click();
  await sheet(page).getByLabel("Pagar com").selectOption({ label: "Cartão Visa" });
  await sheet(page).getByRole("radio", { name: "Parcelar" }).click();
  await sheet(page).getByLabel("Número de parcelas").selectOption("3");
  await expect(sheet(page).getByText(/3x de R\$ 800,00/)).toBeVisible();
  await sheet(page).getByRole("button", { name: "Salvar despesa" }).click();
  await expect(page.getByText("Despesa parcelada em 3x salva.")).toBeVisible();

  const transactions = live(await listDocs(`users/${uid}/transactions`));
  const parcels = transactions.filter((doc) => field(doc, "installmentPlanId"));
  expect(parcels.map((doc) => field(doc, "amount"))).toEqual([80000, 80000, 80000]);
  expect(transactions.filter((doc) => field(doc, "recurrenceId")).length).toBeGreaterThanOrEqual(3);

  // Busca na lista do mês.
  await page.goto("/fluxo");
  await expect(page.getByText("TV 55 polegadas").first()).toBeVisible();
  await page.getByLabel("Buscar lançamentos").fill("polegadas");
  await expect(page.locator("li button", { hasText: "TV 55 polegadas" }).first()).toBeVisible();
  await expect(page.locator("li button", { hasText: "Salário" })).toHaveCount(0);
  await page.getByLabel("Buscar lançamentos").fill("");

  // Editar "este e os próximos" na 2ª parcela.
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.locator("li button", { hasText: "TV 55 polegadas" }).first().click();
  await sheet(page).getByLabel("Descrição").fill("TV Samsung");
  await sheet(page).getByRole("radio", { name: "Este e os próximos" }).click();
  await sheet(page).getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Lançamento atualizado.")).toBeVisible();
  await expect
    .poll(async () =>
      live(await listDocs(`users/${uid}/transactions`))
        .filter((doc) => field(doc, "installmentPlanId"))
        .map((doc) => [field(doc, "installmentNumber"), field(doc, "description")])
        .sort(),
    )
    .toEqual([
      [1, "TV 55 polegadas"],
      [2, "TV Samsung"],
      [3, "TV Samsung"],
    ]);
  expect(errors).toEqual([]);
});

test("categorias, provisionamento com aporte, perfil e ocultar valores", async ({ page }) => {
  const errors = watchPageErrors(page);
  const { uid } = await signUp(page);

  await page.goto("/fluxo/categorias");
  await page.getByRole("button", { name: "Nova categoria" }).first().click();
  await sheet(page).getByLabel("Nome").fill("Academia");
  await sheet(page)
    .getByRole("button", { name: /Criar categoria|Salvar/ })
    .click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByText("Academia")).toBeVisible();

  await page.goto("/planejar/provisionamentos");
  await page.getByRole("button", { name: "IPVA" }).click();
  await sheet(page).getByLabel("Valor total").fill("252000");
  await sheet(page).getByRole("button", { name: "Criar provisionamento" }).click();
  await expect(page.getByText("Provisionamento criado.")).toBeVisible();
  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: "Guardar" }).click();
  await sheet(page).getByLabel("Quanto guardar").fill("50000");
  await sheet(page).getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Valor guardado.")).toBeVisible();
  await expect(card).toContainText("R$ 500,00");

  await page.goto("/perfil");
  await page.getByLabel("Nome").fill("Juliana Oliveira");
  await page.getByRole("button", { name: "Salvar nome" }).click();
  await expect(page.getByText("Nome atualizado.")).toBeVisible();
  await expect
    .poll(async () => {
      const response = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-finance-ia/databases/(default)/documents/users/${uid}`,
        { headers: { Authorization: "Bearer owner" } },
      );
      return ((await response.json()) as { fields: { displayName: { stringValue: string } } })
        .fields.displayName.stringValue;
    })
    .toBe("Juliana Oliveira");

  // Ocultar valores troca os números por "R$ ••••" e a preferência fica salva.
  await page.goto("/planejar/provisionamentos");
  await page.getByRole("button", { name: "Ocultar valores" }).first().click();
  await expect(page.getByText("R$ ••••").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("R$ ••••").first()).toBeVisible();
  expect(errors).toEqual([]);
});
