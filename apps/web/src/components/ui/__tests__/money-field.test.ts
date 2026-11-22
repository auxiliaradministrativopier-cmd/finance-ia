import { formatCentsInput, parseCentsInput } from "../money-field";

describe("campo de valor", () => {
  it("forma o valor da direita para a esquerda", () => {
    expect(parseCentsInput("1")).toBe(1);
    expect(parseCentsInput("0,01")).toBe(1);
    expect(parseCentsInput("1.234,56")).toBe(123456);
    expect(parseCentsInput("1.234,567")).toBe(1234567);
  });

  it("ignora letras e limita ao máximo", () => {
    expect(parseCentsInput("R$ abc")).toBe(0);
    expect(parseCentsInput("9".repeat(20))).toBe(100_000_000_000);
  });

  it("formata em reais sem o símbolo", () => {
    expect(formatCentsInput(123456)).toBe("1.234,56");
    expect(formatCentsInput(null)).toBe("0,00");
  });
});
