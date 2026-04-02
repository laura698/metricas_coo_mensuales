import type { ProjectManagerEvalRow } from "@/lib/types";

const PM_SCORE_MIN = 5;
const PM_SCORE_MAX = 10;
const PM_SCORE_DEFAULT = 7;

export function clampPmRendimientoCarga(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return PM_SCORE_DEFAULT;
  return Math.min(PM_SCORE_MAX, Math.max(PM_SCORE_MIN, n));
}

/** Normaliza filas de evaluación PM desde JSON/Excel. */
export function normalizePmEvaluaciones(rows: unknown): ProjectManagerEvalRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    let proyectos: string[] = [];
    if (Array.isArray(r.proyectosAsignados)) {
      proyectos = r.proyectosAsignados.map((x) => String(x).trim()).filter(Boolean);
    } else if (typeof r.proyectosAsignados === "string") {
      proyectos = r.proyectosAsignados
        .split(/[,|]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const n = Number(r.cantidadProyectos);
    const cantidad = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : proyectos.length;
    return {
      nombre: String(r.nombre ?? "").trim(),
      cantidadProyectos: cantidad,
      proyectosAsignados: proyectos,
      rendimientoCarga: clampPmRendimientoCarga(r.rendimientoCarga),
      evaluacion: String(r.evaluacion ?? "").trim(),
    };
  });
}
