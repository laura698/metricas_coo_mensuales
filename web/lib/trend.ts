import type { MetricsFile } from "./types";

export function getTrendSeries(data: MetricsFile): {
  labels: string[];
  entregas: number[];
} {
  const ids = Object.keys(data.periods).sort();
  const labels: string[] = [];
  const entregas: number[] = [];

  for (const id of ids) {
    const p = data.periods[id];
    const entCard = p.semaforos.find((s) => s.id === "entregas");
    const eHead = entCard?.headline.replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
    const eChart = p.charts?.entregas?.[0];
    const e =
      eHead && eHead.length > 0
        ? parseFloat(eHead)
        : typeof eChart === "number"
          ? eChart
          : NaN;
    labels.push(p.label.replace(/\s+/g, " ").trim());
    entregas.push(Number.isFinite(e) ? e : NaN);
  }

  return { labels, entregas };
}
