import { render, screen } from "@testing-library/react";
import { MessageContent } from "../components/message-content";
import { historyFor, type ChatMessage } from "../use-chat";

describe("texto das respostas", () => {
  it("monta parágrafos, listas e negrito sem interpretar HTML", () => {
    const { container } = render(
      <MessageContent
        text={
          "Você pode gastar **R$ 1.500,00**.\n\n- Saldo: R$ 3.000,00\n- Contas: R$ 1.200,00\n\n<img src=x onerror=alert(1)>"
        }
      />,
    );
    expect(screen.getByText("R$ 1.500,00").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  });

  it("oculta os valores no modo privado", () => {
    render(<MessageContent text="Sobram **R$ 1.500,00** e R$ 80 por dia." hideValues />);
    expect(screen.getByText(/e R\$ •••• por dia\./)).toBeInTheDocument();
    expect(screen.queryByText(/1\.500/)).toBeNull();
  });
});

describe("histórico enviado", () => {
  const message = (
    role: ChatMessage["role"],
    content: string,
    status: ChatMessage["status"] = "done",
  ): ChatMessage => ({
    id: Math.random().toString(),
    role,
    content,
    status,
  });

  it("descarta respostas com erro e começa sempre pelo usuário", () => {
    const history = historyFor(
      [
        message("user", "A"),
        message("assistant", "falhou", "error"),
        message("user", "B"),
        message("assistant", "resposta B"),
      ],
      "C",
    );
    expect(history).toEqual([
      { role: "user", content: "A" },
      { role: "user", content: "B" },
      { role: "assistant", content: "resposta B" },
      { role: "user", content: "C" },
    ]);
  });

  it("mascara dados pessoais das perguntas antes do envio", () => {
    expect(historyFor([], "Meu CPF é 123.456.789-09")).toEqual([
      { role: "user", content: "Meu CPF é [CPF]" },
    ]);
  });

  it("mantém só as 20 mensagens mais recentes", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      message(i % 2 === 0 ? "user" : "assistant", String(i)),
    );
    const history = historyFor(many, "nova");
    expect(history.length).toBeLessThanOrEqual(20);
    expect(history[0]!.role).toBe("user");
    expect(history.at(-1)).toEqual({ role: "user", content: "nova" });
  });
});
