import { horasSlicesFromNumbers, parseHorasFromSemaforo } from "@/lib/horasChart";
import type { PeriodBlock } from "@/lib/types";

/** Extrae un porcentaje típico de textos como "74%" o "62,5%". */
export function parsePctHeadline(s: string): number | null {
  const x = s.replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : null;
}

function detailByKey(
  details: { key: string; value: string }[] | undefined,
  key: string
): string {
  return details?.find((d) => d.key === key)?.value ?? "";
}

function fmtIntEs(n: number): string {
  return Math.round(n).toLocaleString("es-ES");
}

/** Subtítulos bajo las tortas y la tendencia, a partir de detalle de semáforos. */
function syncChartSubtitlesFromSemaforos(period: PeriodBlock): PeriodBlock["chartSubtitles"] {
  const prev = period.chartSubtitles ?? {
    entregas: "",
    retraso: "",
    horasEstReal: "",
  };
  const entS = period.semaforos?.find((x) => x.id === "entregas");
  let entregas = prev.entregas;
  let retraso = prev.retraso;
  if (entS?.details?.length) {
    const at = detailByKey(entS.details, "Entregadas a tiempo");
    const ret = detailByKey(entS.details, "Con retraso");
    const tot = detailByKey(entS.details, "Entregas totales");
    entregas = `${at} a tiempo · ${ret} con retraso`;
    retraso = `${ret} con retraso de ${tot} totales`;
  }
  let horasEstReal = prev.horasEstReal;
  const hrs = parseHorasFromSemaforo(period);
  if (hrs) {
    horasEstReal = `${fmtIntEs(hrs.real)} h reales · ${fmtIntEs(hrs.est)} h estimadas`;
  }
  return { entregas, retraso, horasEstReal };
}

/** Ajusta tortas entregas / retraso / horas y subtítulos desde semáforos. */
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
  const chartSubtitles = syncChartSubtitlesFromSemaforos({ ...period, charts });
  return { ...period, charts, chartSubtitles };
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
