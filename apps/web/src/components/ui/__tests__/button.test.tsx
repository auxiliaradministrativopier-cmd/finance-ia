import { render, screen } from "@testing-library/react";
import { Button } from "../button";

describe("Button", () => {
  it("é do tipo button por padrão, para não enviar formulários sem querer", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("type", "button");
  });

  it("fica desabilitado e sinaliza carregamento", () => {
    render(<Button loading>Salvando</Button>);
    const button = screen.getByRole("button", { name: "Salvando" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
