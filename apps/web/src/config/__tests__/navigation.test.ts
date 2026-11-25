import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { allSidebarHrefs, findActiveHref, isTabActive, tabNavigation } from "../navigation";
import { isScreenAvailable, screens } from "../screens";

const appDir = join(__dirname, "..", "..", "app");

/** Lista recursivamente as pastas de grupos de rotas, como "(auth)/(guest)". */
function routeGroupDirs(dir: string): string[] {
  const groups = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\(.+\)$/.test(entry.name))
    .map((entry) => join(dir, entry.name));
  return [dir, ...groups.flatMap(routeGroupDirs)];
}

const searchRoots = routeGroupDirs(appDir);

/** Procura a página da rota em qualquer grupo de rotas do App Router. */
function pageExists(route: string): boolean {
  return searchRoots.some((root) => existsSync(join(root, route, "page.tsx")));
}

describe("rotas", () => {
  it("toda tela registrada tem uma página", () => {
    for (const screen of Object.values(screens)) {
      expect(pageExists(screen.route), screen.route).toBe(true);
    }
  });

  it("tela marcada como pronta (fase 1) não pode ser um esboço, e vice-versa", () => {
    for (const screen of Object.values(screens)) {
      const root = searchRoots.find((dir) => existsSync(join(dir, screen.route, "page.tsx")))!;
      const isPlaceholder = readFileSync(join(root, screen.route, "page.tsx"), "utf8").includes(
        "ScreenPlaceholder",
      );
      expect(isPlaceholder, `${screen.route} (fase ${screen.phase})`).toBe(screen.phase !== 1);
    }
  });

  it("todo item de navegação aponta para uma página existente", () => {
    for (const href of [...allSidebarHrefs, ...tabNavigation.map((tab) => tab.href)]) {
      expect(pageExists(href), href).toBe(true);
    }
  });
});

describe("item ativo", () => {
  it("escolhe o prefixo mais específico", () => {
    const hrefs = ["/inicio", "/planejar", "/planejar/metas"];
    expect(findActiveHref("/planejar/metas/abc", hrefs)).toBe("/planejar/metas");
    expect(findActiveHref("/planejar/orcamento", hrefs)).toBe("/planejar");
    expect(findActiveHref("/inicio", allSidebarHrefs)).toBe("/inicio");
  });

  it("não confunde rotas com o mesmo começo", () => {
    expect(findActiveHref("/contas-falsas", ["/contas"])).toBeNull();
  });

  it("ativa a aba certa no celular", () => {
    const [inicio, fluxo, planejar, ia] = tabNavigation;
    expect(isTabActive("/cartoes/123", fluxo)).toBe(true);
    expect(isTabActive("/patrimonio/dividas", planejar)).toBe(true);
    expect(isTabActive("/saude-financeira", ia)).toBe(true);
    expect(isTabActive("/configuracoes", inicio)).toBe(true);
    expect(isTabActive("/fluxo", inicio)).toBe(false);
  });
});

describe("telas disponíveis", () => {
  it("o menu lateral e as abas só levam a telas já lançadas", () => {
    for (const href of allSidebarHrefs) expect(isScreenAvailable(href), href).toBe(true);
    for (const tab of tabNavigation) expect(isScreenAvailable(tab.href), tab.href).toBe(true);
  });

  it("só as telas da fase 1 contam como prontas para receber links", () => {
    expect(isScreenAvailable("/patrimonio/dividas")).toBe(true);
    expect(isScreenAvailable("/configuracoes/privacidade")).toBe(true);
    expect(isScreenAvailable("/patrimonio/investimentos")).toBe(false);
    expect(isScreenAvailable("/nao-existe")).toBe(false);
  });
});
