import { expect, test } from "@playwright/test";
import { createAccount, field, listDocs, sheet, signUp, watchPageErrors } from "./helpers";

test("pagar a fatura tira o dinheiro da conta sem contar a despesa duas vezes", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  const { uid } = await signUp(page);
  const today = new Date().toISOString().slice(0, 10);
  await createAccount(page, "Itaú", "500000", `${today.slice(0, 7)}-01`);

  await page.goto("/cartoes");
  await page.getByRole("button", { name: "Novo cartão" }).first().click();
  await sheet(page).getByLabel("Nome").fill("Visa");
  await sheet(page).getByLabel("Limite").fill("500000");
  await sheet(page).getByLabel("Fechamento da fatura").selectOption("3");
  await sheet(page).getByLabel("Vencimento").selectOption("10");
  await sheet(page).getByRole("button", { name: "Criar cartão" }).click();
  await expect(page.getByText("Cartão criado.")).toBeVisible();

  await page.goto("/fluxo/despesas");
  await page.getByRole("button", { name: "Nova despesa" }).first().click();
  await sheet(page).getByLabel("Valor").fill("120000");
  await sheet(page).getByLabel("Descrição").fill("Mercado do mês");
  await sheet(page).getByRole("radio", { name: "Mercado" }).click();
  await sheet(page).getByLabel("Pagar com").selectOption({ label: "Cartão Visa" });
  await sheet(page).getByRole("button", { name: "Salvar despesa" }).click();
  await expect(sheet(page)).toBeHidden();

  await page.goto("/cartoes");
  const card = page.getByRole("article").filter({ hasText: "Visa" });
  await card.getByRole("button", { name: "Pagar fatura" }).click();
  await expect(sheet(page).getByLabel("Valor pago")).toHaveValue("1.200,00");
  await expect(sheet(page).getByLabel("Pago com")).toHaveValue(/.+/);
  await sheet(page).getByRole("button", { name: "Pagar fatura" }).click();
  await expect(page.getByText("Fatura paga. O valor saiu da conta escolhida.")).toBeVisible();
  await expect(card).toContainText("pago R$ 1.200,00");
  await expect(card.getByRole("button", { name: "Pagar fatura" })).toHaveCount(0);

  // Saldo da conta: 5.000,00 − 1.200,00. A despesa do mês continua 1.200,00 (sem duplicar).
  await page.goto("/contas");
  await expect(page.getByRole("main")).toContainText("R$ 3.800,00");
  await page.goto("/fluxo/despesas");
  await expect(page.getByText("Pagamento da fatura Visa")).toHaveCount(0);

  const payments = (await listDocs(`users/${uid}/transactions`)).filter(
    (doc) => field(doc, "type") === "transfer",
  );
  expect(payments).toHaveLength(1);
  expect(field(payments[0]!, "amount")).toBe(120000);
  expect(field(payments[0]!, "toAccountId")).toBeNull();
  expect(errors).toEqual([]);
});
