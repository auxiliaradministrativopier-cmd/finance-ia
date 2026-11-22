import { act, render, screen } from "@testing-library/react";
import { PrivacyProvider, usePrivacy } from "@/providers/privacy-provider";
import { Amount } from "../amount";

function Toggle() {
  const { toggleHideValues } = usePrivacy();
  return <button onClick={toggleHideValues}>alternar</button>;
}

describe("Amount", () => {
  it("formata receitas e despesas com sinal", () => {
    render(
      <PrivacyProvider>
        <Amount cents={720000} kind="income" />
        <Amount cents={8990} kind="expense" />
      </PrivacyProvider>,
    );
    expect(screen.getByText("+ R$ 7.200,00")).toBeInTheDocument();
    expect(screen.getByText("− R$ 89,90")).toBeInTheDocument();
  });

  it("oculta os valores no modo privacidade", () => {
    render(
      <PrivacyProvider>
        <Amount cents={123456} />
        <Toggle />
      </PrivacyProvider>,
    );
    act(() => screen.getByText("alternar").click());
    expect(screen.getByText("R$ ••••")).toBeInTheDocument();
  });
});
