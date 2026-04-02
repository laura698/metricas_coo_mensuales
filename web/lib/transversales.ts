import type { PeriodBlock, TransversalRow } from "@/lib/types";

export const TRANSVERSAL_ROW_LABELS = [
  "Diseño",
  "Desarrollo",
  "Prueba",
  "PM",
  "DevOps",
  "COO",
  "CTO",
  "Ventas",
] as const;

/** Siempre 8 filas en este orden, con gastos del JSON o 0. */
export function normalizeTransversalRows(rows: TransversalRow[] | undefined): TransversalRow[] {
  const map = new Map((rows ?? []).map((r) => [r.label, r.gasto]));
  return TRANSVERSAL_ROW_LABELS.map((label) => ({
    label,
    gasto: Number(map.get(label)) || 0,
  }));
}

export function transversalGastoTotal(period: PeriodBlock): number {
  return normalizeTransversalRows(period.transversales).reduce((s, r) => s + r.gasto, 0);
}
