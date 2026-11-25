import { expect, test, type Page } from "@playwright/test";
import { createAccount, signUp } from "../helpers";

/**
 * Orçamento de performance no build de produção (rede local, sem cache do navegador):
 * LCP, CLS e o JavaScript baixado por tela. Imprime a tabela para acompanhar a evolução.
 */
const BUDGET = { lcpMs: 2500, cls: 0.1, jsKb: 650 };

async function measure(page: Page, route: string) {
  await page.goto(route, { waitUntil: "load" });
  await expect(page.locator("h1").first()).toBeVisible();
  await page.waitForTimeout(1500);
  // JavaScript transferido pela rede nesta navegação (comprimido, como o usuário baixa).
  const jsBytes = await page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((entry) => entry.initiatorType === "script" || entry.name.endsWith(".js"))
      .reduce((sum, entry) => sum + (entry.encodedBodySize || entry.transferSize), 0),
  );
  const vitals = await page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number }>((resolve) => {
        let lcp = 0;
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[])
            if (!entry.hadRecentInput) cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve({ lcp, cls }), 300);
      }),
  );
  return {
    route,
    lcpMs: Math.round(vitals.lcp),
    cls: Math.round(vitals.cls * 1000) / 1000,
    jsKb: Math.round(jsBytes / 1024),
  };
}

// Mede a primeira visita de cada tela: sem service worker e sem cache.
test.use({ serviceWorkers: "block" });

test("Core Web Vitals e JavaScript por tela dentro do orçamento", async ({ page, context }) => {
  test.setTimeout(240_000);
  const results = [];
  for (const route of ["/boas-vindas", "/entrar", "/cadastro"]) {
    await context.clearCookies();
    results.push(await measure(page, route));
  }
  await signUp(page);
  const month = new Date().toISOString().slice(0, 7);
  await createAccount(page, "Itaú", "500000", `${month}-01`);
  for (const route of [
    "/inicio",
    "/fluxo",
    "/contas",
    "/saude-financeira",
    "/patrimonio/dividas",
    "/ia",
  ]) {
    results.push(await measure(page, route));
  }
  console.table(results);
  for (const result of results) {
    expect(result.lcpMs, `${result.route} LCP`).toBeLessThan(BUDGET.lcpMs);
    expect(result.cls, `${result.route} CLS`).toBeLessThan(BUDGET.cls);
    expect(result.jsKb, `${result.route} JS`).toBeLessThan(BUDGET.jsKb);
  }
});
