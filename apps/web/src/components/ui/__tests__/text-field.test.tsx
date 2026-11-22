import { render, screen } from "@testing-library/react";
import { TextField } from "../text-field";

describe("TextField", () => {
  it("liga o rótulo ao campo", () => {
    render(<TextField label="Descrição" />);
    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
  });

  it("anuncia o erro e o associa ao campo", () => {
    render(<TextField label="Data" error="Essa data não existe." hint="dd/mm/aaaa" />);
    const input = screen.getByLabelText("Data");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Essa data não existe.");
  });
});
