/** Escalas e marcas de eixo para os gráficos em SVG. */

function niceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/**
 * Marcas "redondas" que cobrem [min, max] com cerca de `count` intervalos.
 * Ex.: niceTicks(0, 1_240_000, 4) → [0, 500_000, 1_000_000, 1_500_000].
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  // Série plana (ou quase): sem isso, as marcas ficam a centavos de distância e os rótulos se repetem.
  const magnitude = Math.max(Math.abs(min), Math.abs(max));
  if (max - min <= magnitude * 0.01) {
    if (min >= 0) {
      min = 0;
      max = max > 0 ? max * 1.2 : 1;
    } else {
      const pad = magnitude * 0.1 || 1;
      min -= pad;
      max += pad;
    }
  }
  const step = niceStep((max - min) / count);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return ticks;
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

/** Caminho de uma coluna com o topo arredondado (4px) e a base reta, crescendo do eixo. */
export function columnPath(
  x: number,
  baseline: number,
  width: number,
  height: number,
  radius = 4,
): string {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  const top = baseline - height;
  return [
    `M${x},${baseline}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + width - r}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `V${baseline}`,
    "Z",
  ].join(" ");
}
