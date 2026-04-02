import type { MetricsFile, PeriodBlock } from "@/lib/types";
import { normalizeFacturaciones } from "@/lib/facturaciones";
import { normalizePmEvaluaciones } from "@/lib/pmEvaluacion";
import { recalcPeriodSemaforos } from "@/lib/semaforoDerived";
import { normalizeTransversalRows } from "@/lib/transversales";

/** Rellena campos añadidos en versiones recientes (Blob/Excel antiguos). */
export function normalizePeriod(p: PeriodBlock): PeriodBlock {
  const charts = {
    util: (p.charts?.util ?? [0, 100]) as [number, number],
    entregas: (p.charts?.entregas ?? [50, 50]) as [number, number],
    retraso: (p.charts?.retraso ?? [50, 50]) as [number, number],
    horasEstReal: (p.charts?.horasEstReal ?? [50, 50]) as [number, number],
  };
  const chartSubtitles = {
    entregas: p.chartSubtitles?.entregas ?? "",
    retraso: p.chartSubtitles?.retraso ?? "",
    horasEstReal: p.chartSubtitles?.horasEstReal ?? "",
  };
  const merged: PeriodBlock = {
    ...p,
    charts,
    chartSubtitles,
    transversales: normalizeTransversalRows(p.transversales),
    facturaciones: normalizeFacturaciones(p.facturaciones),
    pmEvaluaciones: normalizePmEvaluaciones(p.pmEvaluaciones),
  };
  return recalcPeriodSemaforos(merged);
}

export function normalizeMetricsFile(data: MetricsFile): MetricsFile {
  if (!data || typeof data !== "object") {
    throw new Error("métricas: payload inválido");
  }
  if (!data.periods || typeof data.periods !== "object") {
    throw new Error('métricas: falta "periods"');
  }
  const periods: Record<string, PeriodBlock> = {};
  for (const id of Object.keys(data.periods)) {
    periods[id] = normalizePeriod(data.periods[id]);
  }
  return { ...data, periods };
}
