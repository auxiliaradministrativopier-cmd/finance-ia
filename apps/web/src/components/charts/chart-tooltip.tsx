"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface TooltipRow {
  label: string;
  value: string;
  /** Cor da série (variável CSS), mostrada como um traço curto. */
  color: string;
  dashed?: boolean;
}

/**
 * Tooltip único com todas as séries do ponto: o valor vem primeiro, o rótulo depois.
 * Fica ao lado do ponto (à direita quando cabe, senão à esquerda), sem cobrir a marca ativa.
 */
export function ChartTooltip({
  title,
  rows,
  x,
  avoid = 12,
  containerWidth,
}: {
  title: string;
  rows: TooltipRow[];
  /** Centro horizontal do ponto ativo, em px dentro do contêiner. */
  x: number;
  /** Meia-largura da marca ativa: o tooltip não invade essa faixa. */
  avoid?: number;
  containerWidth: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const content = `${title}|${rows.map((row) => `${row.value}${row.label}`).join("|")}`;

  // Mede o próprio tamanho antes de pintar para decidir o lado (sem piscar).
  useLayoutEffect(() => {
    setWidth(ref.current?.offsetWidth ?? 0);
  }, [content]);

  const gap = 8;
  const right = x + avoid + gap;
  const left = right + width <= containerWidth ? right : Math.max(x - avoid - gap - width, 0);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 z-10 flex w-max max-w-[260px] flex-col gap-1.5 rounded-md border border-line bg-surface px-3 py-2 shadow-md"
      style={{ left, visibility: width ? "visible" : "hidden" }}
    >
      <span className="block text-caption font-semibold text-ink-muted first-letter:uppercase">
        {title}
      </span>
      {rows.map((row) => (
        <span key={row.label} className="flex items-center gap-2 text-caption whitespace-nowrap">
          <svg width="14" height="4" aria-hidden="true" className="shrink-0">
            <line
              x1="0"
              y1="2"
              x2="14"
              y2="2"
              stroke={row.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={row.dashed ? "3 3" : undefined}
            />
          </svg>
          <strong className={cn("text-body font-semibold text-ink tabular")}>{row.value}</strong>
          <span className="text-ink-muted">{row.label}</span>
        </span>
      ))}
    </div>
  );
}

export interface LegendItem {
  label: string;
  color: string;
  dashed?: boolean;
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legenda">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-caption text-ink-muted">
          <svg width="14" height="4" aria-hidden="true">
            <line
              x1="1"
              y1="2"
              x2="13"
              y2="2"
              stroke={item.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={item.dashed ? "3 3" : undefined}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
