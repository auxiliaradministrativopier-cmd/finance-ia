/**
 * Remove identificadores pessoais de textos livres (descrições, nomes, perguntas) antes que
 * saiam do app. Roda no navegador e de novo no servidor (defesa em profundidade).
 * A ordem importa: padrões mais específicos primeiro.
 */
const RULES: [RegExp, string][] = [
  // E-mails
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[e-mail]"],
  // Chave Pix aleatória (UUID)
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[chave Pix]"],
  // CNPJ (00.000.000/0000-00)
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ]"],
  // CPF (000.000.000-00)
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]"],
  // Telefone brasileiro: (11) 91234-5678, +55 11 912345678, 11 1234-5678
  [/(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, "[telefone]"],
  // Endereços web
  [/\bhttps?:\/\/\S+/gi, "[link]"],
];

const DATE = /^(?:\d{4}-\d{2}(?:-\d{2})?|\d{2}[./-]\d{2}[./-]\d{2,4}|\d{2}\/\d{4})$/;

/** Agência, conta, protocolo e outros números longos (6+ dígitos). Datas e valores em reais ficam. */
function redactLongNumbers(text: string): string {
  return text.replace(/\d[\d.\-/]*\d(?:,\d{1,2})?/g, (match) => {
    if (match.includes(",") || DATE.test(match)) return match;
    if (/^\d{1,3}(?:\.\d{3})+$/.test(match)) return match; // 1.500, 12.000.000 (valor)
    return match.replace(/\D/g, "").length >= 6 ? "[número]" : match;
  });
}

/** Número de cartão: 13 a 19 dígitos que passam no dígito verificador (Luhn). */
function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
    sum += digit;
  }
  return sum % 10 === 0;
}

function redactCards(text: string): string {
  return text.replace(/\b(?:\d[ -]?){12,18}\d\b/g, (match) =>
    luhn(match.replace(/\D/g, "")) ? "[cartão]" : match,
  );
}

export function redactSensitive(text: string): string {
  const masked = RULES.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    redactCards(text),
  );
  return redactLongNumbers(masked);
}

/** Aplica `redactSensitive` em todas as strings de um objeto (cópia). */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactSensitive(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactDeep(item)]),
    ) as T;
  }
  return value;
}
