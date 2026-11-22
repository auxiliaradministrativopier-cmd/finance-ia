"use client";

import { ChartTooltip } from "./chart-tooltip";
import { linearScale, niceTicks } from "./scale";
import { useChartCursor } from "./use-chart-cursor";
import { useElementWidth } from "./use-element-width";

export interface LinePoint {
  label: string;
  title: string;
  value: number;
  /** Pontos projetados são desenhados tracejados, na mesma cor da série. */
  projected?: boolean;
}

export interface LineChartProps {
  data: LinePoint[];
  seriesLabel: string;
  color: string;
  summary: string;
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  /** Rótulo direto no último valor real. */
  formatEndLabel?: (value: number) => string;
  height?: number;
}

const MARGIN = { top: 28, right: 12, bottom: 28, left: 44 };

/** Linha com projeção tracejada e cursor vertical (crosshair) que encontra o mês. */
export function LineChart({
  data,
  seriesLabel,
  color,
  summary,
  formatValue,
  formatTick,
  formatEndLabel,
  height = 232,
}: LineChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { active, setActive, containerProps } = useChartCursor(data.length);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const values = data.map((point) => point.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const y = linearScale([ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1], [innerHeight, 0]);
  const x = linearScale([0, Math.max(data.length - 1, 1)], [0, innerWidth]);

  const lastActual = data.reduce((last, point, index) => (point.projected ? last : index), 0);
  const toPath = (points: { index: number; value: number }[]) =>
    points.map((point, i) => `${i === 0 ? "M" : "L"}${x(point.index)},${y(point.value)}`).join(" ");
  const actualPath = toPath(
    data.slice(0, lastActual + 1).map((point, index) => ({ index, value: point.value })),
  );
  const projectedPath = toPath(
    data
      .slice(lastActual)
      .map((point, offset) => ({ index: lastActual + offset, value: point.value })),
  );
  const labelEvery = width < 520 ? 3 : 2;
  const end = data[lastActual];
  const activePoint = active !== null ? data[active] : undefined;

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`${summary} Use as setas para ver cada mês.`}
      className="relative w-full rounded-md outline-offset-4"
      {...containerProps}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = event.clientX - bounds.left - MARGIN.left;
        const index = Math.round((position / innerWidth) * (data.length - 1));
        setActive(Math.min(Math.max(index, 0), data.length - 1));
      }}
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
          {data.map((point, index) =>
            index % labelEvery === (data.length - 1) % labelEvery || index === active ? (
              <text
                key={point.label + index}
                x={x(index)}
                y={innerHeight + 18}
                textAnchor="middle"
                className={
                  index === active
                    ? "fill-ink text-[11px] font-semibold"
                    : "fill-ink-muted text-[11px]"
                }
              >
                {point.label}
              </text>
            ) : null,
          )}
          {active !== null ? (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={0}
              y2={innerHeight}
              stroke="var(--line-control)"
              strokeWidth={1}
            />
          ) : null}
          <path
            d={projectedPath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
          <path
            d={actualPath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {end ? (
            <g>
              <circle cx={x(lastActual)} cy={y(end.value)} r={6} fill="var(--surface)" />
              <circle cx={x(lastActual)} cy={y(end.value)} r={4} fill={color} />
              {formatEndLabel ? (
                // Rótulo à esquerda e acima do ponto, longe da projeção que sai para a direita;
                // sem espaço à esquerda (ponto na borda), vai para a direita.
                <text
                  x={x(lastActual) > 72 ? x(lastActual) - 8 : x(lastActual) + 8}
                  y={y(end.value) - 12}
                  textAnchor={x(lastActual) > 72 ? "end" : "start"}
                  className="fill-ink text-[12px] font-semibold tabular"
                >
                  {formatEndLabel(end.value)}
                </text>
              ) : null}
            </g>
          ) : null}
          {activePoint && active !== null && active !== lastActual ? (
            <g>
              <circle cx={x(active)} cy={y(activePoint.value)} r={6} fill="var(--surface)" />
              <circle cx={x(active)} cy={y(activePoint.value)} r={4} fill={color} />
            </g>
          ) : null}
        </g>
      </svg>
      {activePoint && active !== null ? (
        <ChartTooltip
          title={activePoint.title}
          rows={[
            {
              label: activePoint.projected ? `${seriesLabel} (projeção)` : seriesLabel,
              value: formatValue(activePoint.value),
              color,
              dashed: activePoint.projected,
            },
          ]}
          x={MARGIN.left + x(active)}
          containerWidth={width}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {activePoint
          ? `${activePoint.title}: ${formatValue(activePoint.value)}${activePoint.projected ? ", projeção" : ""}`
          : ""}
      </p>
    </div>
  );
}
