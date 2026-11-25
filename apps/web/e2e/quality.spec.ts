import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addEntry, createAccount, sheet, signUp, watchPageErrors } from "./helpers";

/**
 * Varredura de qualidade de todas as telas prontas: acessibilidade (axe, WCAG 2.1 AA),
 * erros no console e rolagem horizontal no celular, nos temas claro e escuro.
 */
const PUBLIC_ROUTES = [
  "/boas-vindas",
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
  "/termos",
  "/privacidade",
  "/offline",
];
const APP_ROUTES = [
  "/inicio",
  "/fluxo",
  "/fluxo/receitas",
  "/fluxo/despesas",
  "/fluxo/categorias",
  "/contas",
  "/cartoes",
  "/planejar/provisionamentos",
  "/patrimonio/dividas",
  "/saude-financeira",
  "/ia",
  "/perfil",
  "/configuracoes",
  "/configuracoes/privacidade",
];

async function audit(page: Page, route: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  return results.violations.map(
    (violation) =>
      `${route} [${violation.impact}] ${violation.id}: ${violation.help} → ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ")}`,
  );
}

async function visit(page: Page, route: string) {
  await page.goto(route);
  // O Firestore mantém conexões abertas: espera o conteúdo, não a rede ociosa.
  await expect(page.locator("h1").first()).toBeVisible();
  await page.waitForTimeout(900);
}

test("telas públicas: acessibilidade e celular", async ({ page }) => {
  const errors = watchPageErrors(page);
  const problems: string[] = [];
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const route of PUBLIC_ROUTES) {
      await visit(page, route);
      problems.push(...(await audit(page, `${scheme} ${route}`)));
    }
  }
  await page.setViewportSize({ width: 360, height: 740 });
  for (const route of PUBLIC_ROUTES) {
    await visit(page, route);
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      problems.push(`celular ${route}: rolagem horizontal`);
  }
  expect(problems, problems.join("\n")).toEqual([]);
  expect(errors).toEqual([]);
});

test("telas do app com dados: acessibilidade, erros e celular", async ({ page }) => {
  test.setTimeout(540_000);
  const errors = watchPageErrors(page);
  await signUp(page);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  await createAccount(page, "Itaú", "500000", `${month}-01`);
  await addEntry(page, "income", {
    amount: "900000",
    description: "Salário",
    category: "Salário",
    date: `${month}-05`,
  });
  await addEntry(page, "expense", {
    amount: "250000",
    description: "Aluguel",
    category: "Moradia",
    date: `${month}-06`,
  });
  await page.goto("/planejar/provisionamentos");
  await page.getByRole("button", { name: "IPVA" }).click();
  await sheet(page).getByLabel("Valor total").fill("252000");
  await sheet(page).getByRole("button", { name: "Criar provisionamento" }).click();
  await expect(sheet(page)).toBeHidden();
  await page.goto("/patrimonio/dividas");
  await page.getByRole("button", { name: "Empréstimo" }).click();
  await sheet(page).getByLabel("Nome").fill("Empréstimo pessoal");
  await sheet(page).getByLabel("Credor").fill("Banco Azul");
  await sheet(page).getByLabel("Valor inicial").fill("1000000");
  await sheet(page).getByLabel("Taxa de juros (% ao mês)").fill("2");
  await sheet(page).getByLabel("Número de parcelas").fill("12");
  await sheet(page)
    .getByRole("button", { name: /^Usar R\$/ })
    .click();
  await sheet(page).getByRole("button", { name: "Cadastrar dívida" }).click();
  await expect(sheet(page)).toBeHidden();
  const routes = [...APP_ROUTES];
  await page.getByRole("link", { name: "Ver evolução e simular" }).click();
  await page.waitForURL(/\/patrimonio\/dividas\/.+/);
  routes.push(new URL(page.url()).pathname);

  const problems: string[] = [];
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const route of routes) {
      await visit(page, route);
      problems.push(...(await audit(page, `${scheme} ${route}`)));
    }
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ colorScheme: "light" });
  for (const route of routes) {
    await visit(page, route);
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      problems.push(`celular ${route}: rolagem horizontal`);
    problems.push(...(await audit(page, `celular ${route}`)));
  }
  expect(problems, problems.join("\n")).toEqual([]);
  expect(errors).toEqual([]);
});
