// Servidor falso da API de mensagens do Claude, só para os testes de ponta a ponta.
// Responde em streaming (SSE) com base no resumo recebido e guarda os pedidos para inspeção:
// GET /__log devolve os pedidos; DELETE /__log limpa.
import http from "node:http";

const port = Number(process.env.FAKE_ANTHROPIC_PORT ?? 4010);
let log = [];

const money = (value) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

http
  .createServer((req, res) => {
    if (req.url === "/__log") {
      if (req.method === "DELETE") log = [];
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(log));
    }
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      log.push({ url: req.url, headers: req.headers, body });
      const json = body.system[1].text
        .replace(/^<dados_financeiros>\n/, "")
        .replace(/\n<\/dados_financeiros>$/, "");
      const context = JSON.parse(json);
      const question = body.messages.at(-1).content;
      let text = `Você pode gastar **${money(context.spending.available)}** até o fim do mês.`;
      if (/maior despesa/i.test(question) && context.largestExpenses[0])
        text = `Sua maior despesa foi ${context.largestExpenses[0].description}: ${money(context.largestExpenses[0].amount)}.`;
      const refuse = /recuse/i.test(question);
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      send("message_start", {
        type: "message_start",
        message: {
          id: "msg_fake",
          type: "message",
          role: "assistant",
          model: body.model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 1 },
        },
      });
      send("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      });
      if (!refuse)
        send("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text },
        });
      send("content_block_stop", { type: "content_block_stop", index: 0 });
      send("message_delta", {
        type: "message_delta",
        delta: { stop_reason: refuse ? "refusal" : "end_turn", stop_sequence: null },
        usage: { output_tokens: 5 },
      });
      send("message_stop", { type: "message_stop" });
      res.end();
    });
  })
  .listen(port, "127.0.0.1", () => process.stdout.write(`fake anthropic em ${port}\n`));
