import type { IngresoProyectoRow } from "@/lib/types";

export function gananciaIngresoRow(row: IngresoProyectoRow): number {
  const g = row.gasto ?? 0;
  return (Number(row.amount) || 0) - g;
}
