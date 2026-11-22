import { resolveProgressTone } from "../progress-bar";

describe("resolveProgressTone", () => {
  it("segue as faixas do Design System no modo automático", () => {
    expect(resolveProgressTone(0.5, "auto")).toBe("brand");
    expect(resolveProgressTone(0.8, "auto")).toBe("warning");
    expect(resolveProgressTone(1, "auto")).toBe("warning");
    expect(resolveProgressTone(1.01, "auto")).toBe("danger");
  });

  it("respeita o tom fixo", () => {
    expect(resolveProgressTone(2, "brand")).toBe("brand");
  });
});
