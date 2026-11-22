import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { allSidebarHrefs, findActiveHref, isTabActive, tabNavigation } from "../navigation";
import { screens } from "../screens";

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

  it("todo item de navegação aponta para uma página existente", () => {
    for (const href of [...allSidebarHrefs, ...tabNavigation.map((tab) => tab.href)]) {
      expect(pageExists(href), href).toBe(true);
    }
  });
});

describe("item ativo", () => {
  it("escolhe o prefixo mais específico", () => {
    expect(findActiveHref("/planejar/metas/abc", allSidebarHrefs)).toBe("/planejar/metas");
    expect(findActiveHref("/planejar/orcamento", allSidebarHrefs)).toBe("/planejar");
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
