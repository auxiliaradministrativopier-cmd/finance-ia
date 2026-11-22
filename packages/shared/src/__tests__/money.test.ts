import { describe, expect, it } from "vitest";
import { formatMoney, isCents } from "../money";

describe("formatMoney", () => {
  it("formata centavos no padrão brasileiro", () => {
    expect(formatMoney(123456)).toBe("R$ 1.234,56");
    expect(formatMoney(0)).toBe("R$ 0,00");
    expect(formatMoney(5)).toBe("R$ 0,05");
  });

  it("usa o sinal de menos tipográfico em valores negativos", () => {
    expect(formatMoney(-8990)).toBe("− R$ 89,90");
  });

  it("mostra o sinal de mais apenas quando pedido", () => {
    expect(formatMoney(720000, { signed: true })).toBe("+ R$ 7.200,00");
    expect(formatMoney(0, { signed: true })).toBe("R$ 0,00");
  });

  it("oculta o valor no modo privacidade", () => {
    expect(formatMoney(123456, { hidden: true })).toBe("R$ ••••");
  });

  it("rejeita valores que não são centavos inteiros", () => {
    expect(() => formatMoney(10.5)).toThrow(TypeError);
    expect(isCents(Number.NaN)).toBe(false);
  });
});
