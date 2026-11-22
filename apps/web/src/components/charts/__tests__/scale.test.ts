import { columnPath, linearScale, niceTicks } from "../scale";

describe("niceTicks", () => {
  it("gera marcas redondas que cobrem o intervalo", () => {
    expect(niceTicks(0, 1_240_000, 4)).toEqual([0, 500_000, 1_000_000, 1_500_000]);
    expect(niceTicks(0, 980_000, 4)).toEqual([0, 250_000, 500_000, 750_000, 1_000_000]);
  });

  it("funciona com mínimo diferente de zero", () => {
    const ticks = niceTicks(3_118_000, 5_296_000, 4);
    expect(ticks[0]).toBeLessThanOrEqual(3_118_000);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(5_296_000);
  });

  it("não quebra com intervalo vazio", () => {
    expect(niceTicks(0, 0).length).toBeGreaterThan(1);
  });
});

describe("linearScale", () => {
  it("mapeia o domínio no intervalo de pixels", () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });
});

describe("columnPath", () => {
  it("arredonda o topo e mantém a base reta", () => {
    const path = columnPath(10, 100, 20, 50);
    expect(path.startsWith("M10,100")).toBe(true);
    expect(path).toContain("Q10,50 14,50");
    expect(path.endsWith("V100 Z")).toBe(true);
  });

  it("não desenha coluna de altura zero", () => {
    expect(columnPath(0, 100, 20, 0)).toBe("");
  });
});
