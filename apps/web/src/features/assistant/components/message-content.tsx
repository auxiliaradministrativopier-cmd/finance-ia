import { Fragment } from "react";

/** "**negrito**" vira <strong>. Sem HTML: o texto do modelo nunca é interpretado como marcação. */
function inline(text: string, hideValues: boolean) {
  const masked = hideValues ? text.replace(/R\$\s?−?-?[\d.]+(?:,\d{2})?/g, "R$ ••••") : text;
  return masked.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** Formatação mínima das respostas: parágrafos, listas com "- " ou "1." e negrito. */
export function MessageContent({
  text,
  hideValues = false,
}: {
  text: string;
  hideValues?: boolean;
}) {
  const blocks: { type: "p" | "ul" | "ol"; lines: string[] }[] = [];
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "p", lines: [] });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const type = bullet ? "ul" : numbered ? "ol" : "p";
    const content = bullet?.[1] ?? numbered?.[1] ?? line.replace(/^#+\s*/, "");
    const last = blocks.at(-1);
    if (last && last.type === type && (type !== "p" || last.lines.length > 0))
      last.lines.push(content);
    else blocks.push({ type, lines: [content] });
  }

  return (
    <div className="flex flex-col gap-2 text-body text-ink">
      {blocks
        .filter((block) => block.lines.length > 0)
        .map((block, index) =>
          block.type === "p" ? (
            <p key={index}>
              {block.lines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 ? <br /> : null}
                  {inline(line, hideValues)}
                </Fragment>
              ))}
            </p>
          ) : (
            (() => {
              const List = block.type;
              return (
                <List
                  key={index}
                  className={
                    block.type === "ul"
                      ? "flex list-disc flex-col gap-1 pl-5"
                      : "flex list-decimal flex-col gap-1 pl-5"
                  }
                >
                  {block.lines.map((line, i) => (
                    <li key={i}>{inline(line, hideValues)}</li>
                  ))}
                </List>
              );
            })()
          ),
        )}
    </div>
  );
}
