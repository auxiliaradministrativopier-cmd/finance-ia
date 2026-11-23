import { expect, test } from "@playwright/test";
import { createAccount, field, listDocs, sheet, signUp, watchPageErrors } from "./helpers";

test("dívida: pagamento, simulação de antecipação e desfazer devolvendo o vencimento", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  const { uid } = await signUp(page);
  const today = new Date().toISOString().slice(0, 10);
  await createAccount(page, "Itaú", "800000", `${today.slice(0, 7)}-01`);

  await page.goto("/patrimonio/dividas");
  await page.getByRole("button", { name: "Financiamento" }).click();
  await sheet(page).getByLabel("Modalidade").selectOption("vehicle_financing");
  await sheet(page).getByLabel("Nome").fill("Financiamento do carro");
  await sheet(page).getByLabel("Credor").fill("Banco Azul");
  await sheet(page).getByLabel("Valor inicial").fill("4800000");
  await sheet(page).getByLabel("Saldo atual").fill("3240000");
  await sheet(page).getByLabel("Como são as parcelas").selectOption("price");
  await sheet(page).getByLabel("Taxa de juros (% ao mês)").fill("1,49");
  await sheet(page).getByLabel("Número de parcelas").fill("48");
  await sheet(page)
    .getByRole("button", { name: /^Usar R\$/ })
    .click();
  await sheet(page).getByLabel("Data de início").fill("2025-06-10");
  await sheet(page).getByLabel("Próximo vencimento").fill("2099-12-10");
  await sheet(page).getByRole("button", { name: "Cadastrar dívida" }).click();
  await expect(page.getByText("Dívida cadastrada.")).toBeVisible();

  const card = page.getByRole("article", { name: "Financiamento do carro" });
  await card.getByRole("button", { name: "Registrar pagamento" }).click();
  await sheet(page).getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();

  await card.getByRole("link", { name: "Ver evolução e simular" }).click();
  await expect(page.getByRole("heading", { name: "Evolução da dívida" })).toBeVisible();
  const simulator = page.getByRole("region", { name: "Simulação de antecipação" });
  await simulator.getByLabel("Valor para antecipar hoje").fill("500000");
  await expect(simulator.getByText(/^Você economiza/)).toContainText("de juros e termina");

  const [debt] = await listDocs(`users/${uid}/debts`);
  const debtId = debt!.name.split("/").at(-1)!;
  expect(field(debt!, "nextDueDate")).toBe("2100-01-10");

  // Desfaz o pagamento mais recente: o vencimento volta e o saldo é recomposto.
  await page
    .getByRole("button", { name: /^Excluir pagamento de/ })
    .first()
    .click();
  await expect(page.getByText("Pagamento excluído. O saldo foi recalculado.")).toBeVisible();
  await expect
    .poll(async () => {
      const [current] = await listDocs(`users/${uid}/debts`);
      return [field(current!, "nextDueDate"), field(current!, "currentBalance")];
    })
    .toEqual(["2099-12-10", 3240000]);
  const payments = await listDocs(`users/${uid}/debts/${debtId}/payments`);
  expect(payments.every((doc) => field(doc, "deletedAt") !== null)).toBe(true);
  expect(errors).toEqual([]);
});
