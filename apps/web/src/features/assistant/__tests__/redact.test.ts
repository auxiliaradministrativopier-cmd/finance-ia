import { redactDeep, redactSensitive } from "../redact";

describe("mascaramento de dados sensíveis", () => {
  it.each([
    ["Pix para joao.silva@gmail.com", "Pix para [e-mail]"],
    ["CPF 123.456.789-09 do titular", "CPF [CPF] do titular"],
    ["cpf 12345678909", "cpf [CPF]"],
    ["Fornecedor 12.345.678/0001-95", "Fornecedor [CNPJ]"],
    ["Cartão 4111 1111 1111 1111", "Cartão [cartão]"],
    ["Ligar (11) 91234-5678", "Ligar [telefone]"],
    ["Ag 1234 conta 98765-4", "Ag 1234 conta [número]"],
    ["Protocolo 2026112200045", "Protocolo [número]"],
    ["Chave 123e4567-e89b-12d3-a456-426614174000", "Chave [chave Pix]"],
    ["Boleto em https://banco.com/x?id=1", "Boleto em [link]"],
  ])("%s", (input, expected) => {
    expect(redactSensitive(input)).toBe(expected);
  });

  it("mantém meses e datas em qualquer formato", () => {
    for (const text of ["2026-11", "2026-11-22", "22/11/2026", "11/2026", "22.11.26"])
      expect(redactSensitive(text)).toBe(text);
  });

  it("mantém valores, datas e textos comuns", () => {
    const text =
      "Posso gastar R$ 1.500,00 até 30/11/2026? Gastei 12.000 no mercado em 2026-11-05, 3 parcelas.";
    expect(redactSensitive(text)).toBe(text);
  });

  it("percorre objetos e listas sem alterar números", () => {
    expect(redactDeep({ name: "Conta 1234567", items: ["a@b.com"], amount: 1234567 })).toEqual({
      name: "Conta [número]",
      items: ["[e-mail]"],
      amount: 1234567,
    });
  });
});
