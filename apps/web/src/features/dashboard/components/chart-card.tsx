"use client";

import { Table2, ChartColumn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export interface ChartCardProps {
  id: string;
  title: string;
  description: string;
  legend?: React.ReactNode;
  chart: React.ReactNode;
  table: React.ReactNode;
}

/** Card de gráfico com alternância para tabela (os mesmos dados, acessíveis sem cor nem ponteiro). */
export function ChartCard({ id, title, description, legend, chart, table }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card aria-labelledby={id} className="gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle id={id}>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={showTable}
          onClick={() => setShowTable((value) => !value)}
          className="shrink-0"
        >
          {showTable ? <ChartColumn aria-hidden="true" /> : <Table2 aria-hidden="true" />}
          {showTable ? "Ver gráfico" : "Ver tabela"}
        </Button>
      </div>
      {legend}
      {showTable ? <div className="max-h-[232px] overflow-auto">{table}</div> : chart}
    </Card>
  );
}

export function DataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <table className="w-full text-body">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-line text-left text-caption text-ink-muted">
          {headers.map((header, index) => (
            <th
              key={header}
              scope="col"
              className={index === 0 ? "py-2 font-medium" : "py-2 text-right font-medium"}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]} className="border-b border-line last:border-0">
            {row.map((cell, index) =>
              index === 0 ? (
                <th
                  key={index}
                  scope="row"
                  className="py-2 text-left font-normal first-letter:uppercase"
                >
                  {cell}
                </th>
              ) : (
                <td key={index} className="py-2 text-right tabular">
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
