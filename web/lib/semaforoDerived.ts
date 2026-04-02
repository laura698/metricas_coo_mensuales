import { syncChartsFromSemaforos } from "@/lib/chartSync";
import { parseHoursValue } from "@/lib/horasChart";
import type { KpiCard, PeriodBlock, SemaforoBlock, SemaforoDetail, StatusTone } from "@/lib/types";

/** Metas de referencia para KPIs financieros (coherentes con el dashboard). */
const META_INGRESOS = 45000;
const META_MARGEN_OBJ = 15000;
const META_COBROS_MAX = 5000;

/** IDs con detalle manual y cabecera / barra / estado calculados. */
export const DERIVED_SEMAFORO_IDS = new Set([
  "entregas",
  "riesgo",
  "horas_est_real",
  "satisfaccion",
  "cobros_pend",
  "margen_sem",
]);

export function parseMoneyEs(s: string): number {
  const t = String(s ?? "")
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .trim();
  if (!t) return 0;
  if (/,/.test(t) && /\./.test(t)) {
    return Number.parseFloat(t.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (/,/.test(t)) return Number.parseFloat(t.replace(",", ".")) || 0;
  return Number.parseFloat(t.replace(/\./g, "")) || 0;
}

function fmtMoneyShort(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPctEs(n: number, maxFrac = 1): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  });
}

function detailByKey(details: SemaforoDetail[], key: string): string {
  const d = details.find((x) => x.key === key);
  return d?.value ?? "";
}

function setDetailsKeys(
  details: SemaforoDetail[],
  updates: Record<string, string>
): SemaforoDetail[] {
  const map = new Map(details.map((d) => [d.key, d.value]));
  for (const [k, v] of Object.entries(updates)) {
    map.set(k, v);
  }
  return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
}

function toneFromEntregasPct(pct: number): { status: StatusTone; statusLabel: string } {
  if (pct >= 90) return { status: "green", statusLabel: "En meta" };
  if (pct >= 70) return { status: "amber", statusLabel: "Atención" };
  return { status: "red", statusLabel: "Crítico" };
}

function toneFromRiesgoHeadline(n: number): { status: StatusTone; statusLabel: string } {
  if (n <= 0) return { status: "green", statusLabel: "En meta" };
  if (n <= 2) return { status: "amber", statusLabel: "Atención" };
  return { status: "red", statusLabel: "Crítico" };
}

function toneFromHoras(dev: number, est: number): { status: StatusTone; statusLabel: string } {
  const maxDev = est * 0.05;
  if (maxDev <= 0) return { status: "amber", statusLabel: "Atención" };
  const ratio = Math.abs(dev) / maxDev;
  if (ratio <= 1) return { status: "green", statusLabel: "En meta" };
  if (ratio <= 1.5) return { status: "amber", statusLabel: "Atención" };
  return { status: "red", statusLabel: "Crítico" };
}

function toneFromNota(nota: number): { status: StatusTone; statusLabel: string } {
  if (nota >= 4) return { status: "green", statusLabel: "En meta" };
  if (nota >= 3) return { status: "amber", statusLabel: "Atención" };
  return { status: "red", statusLabel: "Crítico" };
}

function toneFromCobros(total: number): { status: StatusTone; statusLabel: string } {
  if (total <= 3000) return { status: "green", statusLabel: "En meta" };
  if (total <= 5000) return { status: "amber", statusLabel: "Atención" };
  return { status: "red", statusLabel: "Crítico" };
}

function toneFromMargen(margin: number, ing: number): { status: StatusTone; statusLabel: string } {
  const pct = ing > 0 ? (margin / ing) * 100 : 0;
  if (pct >= 10) return { status: "green", statusLabel: "En meta" };
  if (pct >= 5) return { status: "amber", statusLabel: "Atención" };
  return { status: "red", statusLabel: "Crítico" };
}

/** Recalcula cabecera, barra y estado a partir de los detalles editables. */
export function recalcSemaforoDerived(s: SemaforoBlock): SemaforoBlock {
  const details = [...(s.details ?? [])];

  switch (s.id) {
    case "entregas": {
      const tot = Math.max(0, Math.floor(Number(detailByKey(details, "Entregas totales")) || 0));
      const at = Math.max(0, Math.floor(Number(detailByKey(details, "Entregadas a tiempo")) || 0));
      const ret = Math.max(0, Math.floor(Number(detailByKey(details, "Con retraso")) || 0));
      const pct = tot > 0 ? (100 * at) / tot : 0;
      const pctR = Math.round(pct * 10) / 10;
      const headline = `${fmtPctEs(pctR)}%`;
      const { status, statusLabel } = toneFromEntregasPct(pct);
      return {
        ...s,
        headline,
        status,
        statusLabel,
        progressBar: {
          fillPct: Math.min(100, Math.max(0, pct)),
          labelRight: `${fmtPctEs(pctR)} / 90%`,
          minLabel: "0%",
          midLabel: "Meta 90%",
          maxLabel: "100%",
        },
        details: setDetailsKeys(details, {
          "Entregas totales": String(tot),
          "Entregadas a tiempo": String(at),
          "Con retraso": String(ret),
        }),
      };
    }
    case "riesgo": {
      const activos = Math.max(0, Math.floor(Number(detailByKey(details, "Proyectos activos")) || 0));
      const ret = Math.max(0, Math.floor(Number(detailByKey(details, "En riesgo de retraso")) || 0));
      const sobre = Math.max(0, Math.floor(Number(detailByKey(details, "En riesgo de sobrecosto")) || 0));
      const cal = Math.max(0, Math.floor(Number(detailByKey(details, "En riesgo de calidad")) || 0));
      const headline = String(ret);
      const { status, statusLabel } = toneFromRiesgoHeadline(ret);
      return {
        ...s,
        headline,
        status,
        statusLabel,
        details: setDetailsKeys(details, {
          "Proyectos activos": String(activos),
          "En riesgo de retraso": String(ret),
          "En riesgo de sobrecosto": String(sobre),
          "En riesgo de calidad": String(cal),
        }),
      };
    }
    case "horas_est_real": {
      const est = parseHoursValue(detailByKey(details, "Horas estimadas (mes)"));
      const real = parseHoursValue(detailByKey(details, "Horas reales (mes)"));
      if (!Number.isFinite(est) || est <= 0 || !Number.isFinite(real) || real < 0) {
        return {
          ...s,
          headline: "—",
          details: setDetailsKeys(details, {
            Desviación: "—",
          }),
        };
      }
      const dev = Math.round(real - est);
      const sign = dev >= 0 ? "+" : "";
      const headline = `${sign}${dev} h`;
      const desvStr = `${sign}${Math.abs(dev)} h`;
      const maxDev = est * 0.05;
      const fillPct =
        maxDev > 0 ? Math.min(100, (Math.abs(dev) / maxDev) * 100) : 0;
      const { status, statusLabel } = toneFromHoras(dev, est);
      return {
        ...s,
        headline,
        status,
        statusLabel,
        progressBar: {
          fillPct: Math.min(100, Math.max(0, fillPct)),
          labelRight: `${Math.abs(dev)} / 5% max`,
          minLabel: "0%",
          midLabel: "Meta ≤5%",
          maxLabel: "20%",
        },
        details: setDetailsKeys(details, {
          "Horas estimadas (mes)": `${fmtMoneyShort(est)} h`,
          "Horas reales (mes)": `${fmtMoneyShort(real)} h`,
          Desviación: desvStr,
        }),
      };
    }
    case "satisfaccion": {
      const notaStr = detailByKey(details, "Nota media (1-5)").replace(",", ".");
      let nota = Number.parseFloat(notaStr);
      if (!Number.isFinite(nota)) nota = 4;
      nota = Math.min(5, Math.max(1, nota));
      const headline = `${nota.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5`;
      const fillPct = (nota / 5) * 100;
      const { status, statusLabel } = toneFromNota(nota);
      const clientes = detailByKey(details, "Clientes evaluados");
      const tendencia = detailByKey(details, "Tendencia");
      const notaFmt = nota.toLocaleString("es-ES", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      return {
        ...s,
        headline,
        status,
        statusLabel,
        progressBar: {
          fillPct: Math.min(100, Math.max(0, fillPct)),
          labelRight: `${notaFmt} / 4.0`,
          minLabel: "1",
          midLabel: "Meta 4.0",
          maxLabel: "5",
        },
        details: [
          { key: "Clientes evaluados", value: clientes },
          { key: "Tendencia", value: tendencia },
          { key: "Nota media (1-5)", value: notaFmt },
        ],
      };
    }
    case "cobros_pend": {
      const lines = details.filter((d) => d.key && d.key !== "Facturas pendientes");
      let sum = 0;
      for (const ln of lines) {
        sum += parseMoneyEs(ln.value);
      }
      const count = lines.length;
      const headline = `${fmtMoneyShort(sum)}$`;
      const { status, statusLabel } = toneFromCobros(sum);
      const nextDetails: SemaforoDetail[] = [
        { key: "Facturas pendientes", value: String(count) },
        ...lines.map((ln) => ({ ...ln })),
      ];
      return {
        ...s,
        headline,
        status,
        statusLabel,
        details: nextDetails,
      };
    }
    case "margen_sem": {
      const ing = parseMoneyEs(detailByKey(details, "Ingresos"));
      const cost = parseMoneyEs(detailByKey(details, "Costos operativos"));
      const margin = ing - cost;
      const headline = `${fmtMoneyShort(margin)}$`;
      const pctMargen = ing > 0 ? (100 * margin) / ing : 0;
      const pctStr = fmtPctEs(Math.round(pctMargen * 10) / 10) + "%";
      const meta = 15000;
      const fillPct = Math.min(100, Math.max(0, (margin / meta) * 100));
      const { status, statusLabel } = toneFromMargen(margin, ing);
      return {
        ...s,
        headline,
        status,
        statusLabel,
        progressBar: {
          fillPct,
          labelRight: `${fmtMoneyShort(Math.max(0, margin))} / 15k`,
          minLabel: "0",
          midLabel: "Meta 15.000$",
          maxLabel: "20.000$",
        },
        details: setDetailsKeys(details, {
          Ingresos: `${fmtMoneyShort(ing)} $`,
          "Costos operativos": `${fmtMoneyShort(cost)} $`,
          "Margen %": pctStr,
        }),
      };
    }
    default:
      return s;
  }
}

function detailVal(details: SemaforoDetail[] | undefined, key: string): string {
  return details?.find((d) => d.key === key)?.value ?? "";
}

function sumCobrosPendLines(s: SemaforoBlock): number {
  let sum = 0;
  for (const d of s.details ?? []) {
    if (d.key === "Facturas pendientes") continue;
    sum += parseMoneyEs(d.value);
  }
  return sum;
}

function toneKpiIngresos(ing: number): StatusTone {
  const r = META_INGRESOS > 0 ? ing / META_INGRESOS : 0;
  if (r >= 0.9) return "green";
  if (r >= 0.7) return "amber";
  return "red";
}

function toneKpiCostos(cost: number, ing: number): StatusTone {
  if (ing <= 0) return "amber";
  const ratio = cost / ing;
  if (ratio <= 0.85) return "green";
  if (ratio <= 0.93) return "amber";
  return "red";
}

function toneKpiCobros(total: number): StatusTone {
  if (total <= 3000) return "green";
  if (total <= 5000) return "amber";
  return "red";
}

/**
 * KPIs de la franja financiera: derivados de los semáforos `margen_sem` (ingresos/costos)
 * y `cobros_pend` (suma de importes por proyecto). No editar a mano en JSON salvo excepciones.
 */
export function recalcFinancialKpis(period: PeriodBlock): PeriodBlock {
  const margenS = period.semaforos?.find((x) => x.id === "margen_sem");
  const cobrosS = period.semaforos?.find((x) => x.id === "cobros_pend");

  const ing = margenS ? parseMoneyEs(detailVal(margenS.details, "Ingresos")) : 0;
  const cost = margenS ? parseMoneyEs(detailVal(margenS.details, "Costos operativos")) : 0;
  const margin = ing - cost;

  let cobrosTotal = cobrosS ? sumCobrosPendLines(cobrosS) : 0;
  if (cobrosS && cobrosTotal === 0) {
    cobrosTotal = parseMoneyEs(cobrosS.headline);
  }

  const pctAvanceIngresos =
    META_INGRESOS > 0 ? Math.min(100, (ing / META_INGRESOS) * 100) : 0;
  const pctCostoSobreIng = ing > 0 ? (cost / ing) * 100 : 0;
  const pctMargenObj =
    META_MARGEN_OBJ > 0 ? Math.min(100, (Math.max(0, margin) / META_MARGEN_OBJ) * 100) : 0;
  const cobrosExposure = META_COBROS_MAX > 0 ? Math.min(100, (cobrosTotal / META_COBROS_MAX) * 100) : 0;

  const vCobros = toneKpiCobros(cobrosTotal);
  const metaCobrosNote =
    vCobros === "green" ? "En línea" : vCobros === "amber" ? "Atención" : "Alta exposición";

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const kpis: KpiCard[] = [
    {
      label: "Ingresos mensuales",
      value: `${fmtMoneyShort(ing)}$`,
      meta: `Meta: 45.000 $ · ${fmtPctEs(round1(pctAvanceIngresos))}%`,
      progressPct: round1(pctAvanceIngresos),
      variant: toneKpiIngresos(ing),
    },
    {
      label: "Costos operativos",
      value: `${fmtMoneyShort(cost)}$`,
      meta: `Presupuesto: 30.000 $ · ${fmtPctEs(round1(pctCostoSobreIng))}%`,
      progressPct: round1(pctCostoSobreIng),
      variant: toneKpiCostos(cost, ing),
    },
    {
      label: "Margen operativo",
      value: `${fmtMoneyShort(margin)}$`,
      meta: `Meta: 15.000 $ · ${fmtPctEs(round1(pctMargenObj))}%`,
      progressPct: round1(pctMargenObj),
      variant: toneFromMargen(margin, ing).status,
    },
    {
      label: "Cobros pendientes",
      value: `${fmtMoneyShort(cobrosTotal)}$`,
      meta: `Meta: < 5.000 $ · ${metaCobrosNote}`,
      progressPct: round1(cobrosExposure),
      variant: vCobros,
    },
  ];

  return { ...period, kpis };
}

/** Recalcula todos los semáforos derivados, sincroniza tortas y KPIs financieros. */
export function recalcPeriodSemaforos(period: PeriodBlock): PeriodBlock {
  const semaforos = (period.semaforos ?? []).map((s) =>
    DERIVED_SEMAFORO_IDS.has(s.id) ? recalcSemaforoDerived(s) : s
  );
  const p1 = syncChartsFromSemaforos({ ...period, semaforos });
  return recalcFinancialKpis(p1);
}
