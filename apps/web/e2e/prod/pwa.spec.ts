import { expect, test } from "@playwright/test";
import { createAccount, signUp, watchPageErrors } from "../helpers";

test("manifesto instalável e ícones disponíveis", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({
    name: "Finance IA",
    start_url: "/inicio",
    display: "standalone",
  });
  expect(manifest.icons.some((icon) => icon.sizes === "192x192")).toBe(true);
  expect(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any")).toBe(
    true,
  );
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
});

test("cabeçalhos de segurança do build de produção", async ({ request }) => {
  const response = await request.get("/entrar");
  const headers = response.headers();
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain("unsafe-eval");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
  const sw = await request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});

test("cadastro e uso no build de produção, sem violar a CSP; offline abre as telas visitadas", async ({
  page,
  context,
}) => {
  const errors = watchPageErrors(page);
  await signUp(page);
  const today = new Date().toISOString().slice(0, 10);
  await createAccount(page, "Itaú", "500000", `${today.slice(0, 7)}-01`);
  await expect(page.getByText("Itaú").first()).toBeVisible();

  // O service worker assume o controle da página.
  await expect
    .poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)))
    .toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.goto("/inicio");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Sem internet: tela já visitada abre do cache (com os dados do cache do Firestore)…
  await context.setOffline(true);
  await page.goto("/contas");
  await expect(page.getByRole("heading", { name: "Contas" })).toBeVisible();
  await expect(page.getByText("Itaú").first()).toBeVisible();
  // …e uma tela nunca visitada mostra a página offline.
  await page.goto("/fluxo/categorias");
  await expect(page.getByRole("heading", { name: /sem conexão|offline/i })).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("superfície pública do build de produção", async ({ request }) => {
  // Vitrine de componentes e páginas inexistentes não existem em produção.
  expect((await request.get("/dev/componentes")).status()).toBe(404);
  expect((await request.get("/pagina-que-nao-existe")).status()).toBe(404);
  // Rotas /api só aceitam POST.
  expect((await request.get("/api/ia/chat")).status()).toBe(405);
  expect((await request.get("/api/conta/excluir")).status()).toBe(405);
  // Indexação: só as páginas públicas.
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /");
  expect(robots).toContain("Allow: /boas-vindas");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/termos");
  expect(sitemap).not.toContain("/inicio");
});

