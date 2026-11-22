import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS, DEFAULT_CATEGORIES } from "../categories";

describe("categorias padrão", () => {
  it("tem 16 de despesa e 8 de receita", () => {
    expect(DEFAULT_CATEGORIES.filter((c) => c.type === "expense")).toHaveLength(16);
    expect(DEFAULT_CATEGORIES.filter((c) => c.type === "income")).toHaveLength(8);
  });

  it("tem ids únicos com prefixo do tipo", () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.id.startsWith(category.type === "expense" ? "exp-" : "inc-")).toBe(true);
    }
  });

  it("tem nomes únicos por tipo e cores do Design System", () => {
    for (const type of ["income", "expense"] as const) {
      const names = DEFAULT_CATEGORIES.filter((c) => c.type === type).map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    }
    expect(DEFAULT_CATEGORIES.every((c) => CATEGORY_COLORS.includes(c.color))).toBe(true);
  });
});
