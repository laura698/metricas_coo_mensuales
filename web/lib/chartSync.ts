import { horasSlicesFromNumbers, parseHorasFromSemaforo } from "@/lib/horasChart";
import type { PeriodBlock } from "@/lib/types";

/** Extrae un porcentaje típico de textos como "74%" o "62,5%". */
export function parsePctHeadline(s: string): number | null {
  const x = s.replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : null;
}

/** Ajusta tortas entregas / retraso / horas desde semáforos. */
export function syncChartsFromSemaforos(period: PeriodBlock): PeriodBlock {
  const ent = period.semaforos.find((x) => x.id === "entregas");
  const e = ent ? parsePctHeadline(ent.headline) : null;

  const charts = { ...period.charts };
  if (e != null) {
    const late = Math.max(0, Math.min(100, 100 - e));
    charts.entregas = [e, late] as [number, number];
    charts.retraso = [late, e] as [number, number];
  }
  const hrs = parseHorasFromSemaforo(period);
  if (hrs) {
    const sl = horasSlicesFromNumbers(hrs.est, hrs.real);
    if (sl) charts.horasEstReal = sl;
  }
  return { ...period, charts };
}

/** Resultado neto coherente con la suma de filas de ingresos y gastos. */
export function syncResultadoFromTables(period: PeriodBlock): PeriodBlock {
  const ing = (period.ingresos ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const gas = (period.gastos ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const res = ing - gas;
  return {
    ...period,
    resultado: {
      ...period.resultado,
      ingresos: ing,
      gastos: gas,
      resultado: res,
      positive: res >= 0,
    },
  };
}

export function recalcProjectCounts(period: PeriodBlock): PeriodBlock {
  const projects = period.projects ?? [];
  if (!projects.length) {
    return {
      ...period,
      projectFilterCounts: { all: 0, verde: 0, amarillo: 0, rojo: 0 },
    };
  }
  let verde = 0,
    amarillo = 0,
    rojo = 0;
  for (const pr of projects) {
    if (pr.status === "verde") verde++;
    else if (pr.status === "amarillo") amarillo++;
    else rojo++;
  }
  return {
    ...period,
    projectFilterCounts: {
      all: projects.length,
      verde,
      amarillo,
      rojo,
    },
  };
}
