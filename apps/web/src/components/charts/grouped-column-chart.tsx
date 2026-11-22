"use client";

import { ChartTooltip, type TooltipRow } from "./chart-tooltip";
import { columnPath, linearScale, niceTicks } from "./scale";
import { useChartCursor } from "./use-chart-cursor";
import { useElementWidth } from "./use-element-width";

export interface ColumnSeries {
  key: string;
  label: string;
  /** Cor da série como variável CSS, ex.: "var(--chart-1)". */
  color: string;
}

export interface ColumnDatum {
  label: string;
  /** Título completo para o tooltip, ex.: "novembro de 2026". */
  title: string;
  values: Record<string, number>;
}

export interface GroupedColumnChartProps {
  data: ColumnDatum[];
  series: ColumnSeries[];
  /** Texto para leitores de tela resumindo o gráfico. */
  summary: string;
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  height?: number;
}

const MARGIN = { top: 12, right: 4, bottom: 28, left: 44 };
const MAX_COLUMN = 24;
const GAP = 2;

/** Colunas agrupadas (comparação entre séries por período). */
export function GroupedColumnChart({
  data,
  series,
  summary,
  formatValue,
  formatTick,
  height = 232,
}: GroupedColumnChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { active, setActive, containerProps } = useChartCursor(data.length);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const max = Math.max(1, ...data.flatMap((datum) => series.map((s) => datum.values[s.key] ?? 0)));
  const ticks = niceTicks(0, max, 4);
  const y = linearScale([0, ticks[ticks.length - 1] ?? max], [innerHeight, 0]);
  const band = innerWidth / Math.max(data.length, 1);
  const columnWidth = Math.max(
    Math.min(MAX_COLUMN, (band * 0.72 - GAP * (series.length - 1)) / series.length),
    2,
  );
  const groupWidth = columnWidth * series.length + GAP * (series.length - 1);

  const activeDatum = active !== null ? data[active] : undefined;
  const tooltipRows: TooltipRow[] = activeDatum
    ? series.map((s) => ({
        label: s.label,
        value: formatValue(activeDatum.values[s.key] ?? 0),
        color: s.color,
      }))
    : [];

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`${summary} Use as setas para ver cada mês.`}
      className="relative w-full rounded-md outline-offset-4"
      {...containerProps}
    >
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={summary}
        className="block overflow-visible"
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {ticks.map((tick) => (
            <g key={tick} transform={`translate(0,${y(tick)})`}>
              <line x1={0} x2={innerWidth} stroke="var(--chart-grid)" strokeWidth={1} />
              <text
                x={-8}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink-muted text-[11px] tabular"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}
          {data.map((datum, index) => {
            const x0 = index * band + (band - groupWidth) / 2;
            const isActive = active === index;
            return (
              <g key={datum.label}>
                {isActive ? (
                  <rect
                    x={index * band + 2}
                    y={0}
                    width={band - 4}
                    height={innerHeight}
                    rx={6}
                    fill="var(--surface-sunken)"
                  />
                ) : null}
                {series.map((s, seriesIndex) => {
                  const value = datum.values[s.key] ?? 0;
                  return (
                    <path
                      key={s.key}
                      d={columnPath(
                        x0 + seriesIndex * (columnWidth + GAP),
                        innerHeight,
                        columnWidth,
                        innerHeight - y(value),
                      )}
                      fill={s.color}
                      opacity={active === null || isActive ? 1 : 0.45}
                    />
                  );
                })}
                <text
                  x={index * band + band / 2}
                  y={innerHeight + 18}
                  textAnchor="middle"
                  className={
                    isActive ? "fill-ink text-[11px] font-semibold" : "fill-ink-muted text-[11px]"
                  }
                >
                  {datum.label}
                </text>
                {/* Área de toque maior que a coluna: a faixa inteira do mês. */}
                <rect
                  x={index * band}
                  y={0}
                  width={band}
                  height={innerHeight + MARGIN.bottom}
                  fill="transparent"
                  onPointerEnter={() => setActive(index)}
                  onPointerDown={() => setActive(index)}
                />
              </g>
            );
          })}
        </g>
      </svg>
      {activeDatum && active !== null ? (
        <ChartTooltip
          title={activeDatum.title}
          rows={tooltipRows}
          x={MARGIN.left + active * band + band / 2}
          avoid={groupWidth / 2 + 4}
          containerWidth={width}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {activeDatum
          ? `${activeDatum.title}: ${tooltipRows.map((row) => `${row.label} ${row.value}`).join(", ")}`
          : ""}
      </p>
    </div>
  );
}
