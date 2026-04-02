/**
 * Excel: una hoja por mes (periodId) con todos los campos del sistema en filas etiquetadas.
 * Hoja `_Control`: currentPeriodId del libro completo.
 */
import * as XLSX from "xlsx";
import { gananciaIngresoRow } from "@/lib/ingresoProyecto";
import { normalizeTransversalRows } from "@/lib/transversales";
import type { MetricsFile, PeriodBlock, ProjectRow, StatusTone } from "@/lib/types";

const MARKER = "COO_METRICS_SHEET_V1";

export function sanitizeSheetName(periodId: string): string {
  const s = periodId.replace(/[/\\?*[\]:]/g, "-").trim();
  return (s || "Mes").slice(0, 31);
}

export function periodToAoA(p: PeriodBlock, periodId: string): (string | number)[][] {
  const rows: (string | number)[][] = [];
  rows.push([MARKER]);
  rows.push([]);
  rows.push(["METADATOS"]);
  rows.push(["periodId", periodId]);
  rows.push(["label", p.label]);
  rows.push(["footerTitle", p.footerTitle]);
  rows.push(["chartSubEntregas", p.chartSubtitles?.entregas ?? ""]);
  rows.push(["chartSubRetraso", p.chartSubtitles?.retraso ?? ""]);
  rows.push(["chartSubHoras", p.chartSubtitles?.horasEstReal ?? ""]);
  rows.push(["chart_util_0", p.charts?.util?.[0] ?? 0]);
  rows.push(["chart_util_1", p.charts?.util?.[1] ?? 0]);
  rows.push(["chart_ent_0", p.charts?.entregas?.[0] ?? 0]);
  rows.push(["chart_ent_1", p.charts?.entregas?.[1] ?? 0]);
  rows.push(["chart_ret_0", p.charts?.retraso?.[0] ?? 0]);
  rows.push(["chart_ret_1", p.charts?.retraso?.[1] ?? 0]);
  rows.push(["chart_horas_0", p.charts?.horasEstReal?.[0] ?? 0]);
  rows.push(["chart_horas_1", p.charts?.horasEstReal?.[1] ?? 0]);
  const c = p.projectFilterCounts ?? { all: 0, verde: 0, amarillo: 0, rojo: 0 };
  rows.push(["projAll", c.all]);
  rows.push(["projVerde", c.verde]);
  rows.push(["projAmarillo", c.amarillo]);
  rows.push(["projRojo", c.rojo]);
  rows.push([]);
  rows.push(["KPIs"]);
  rows.push(["label", "value", "meta", "progressPct", "variant"]);
  for (const k of p.kpis ?? []) {
    rows.push([k.label, k.value, k.meta, k.progressPct, k.variant]);
  }
  rows.push([]);
  rows.push(["SEMAFOROS"]);
  for (const s of p.semaforos ?? []) {
    rows.push(["SEMAFORO_START", s.id]);
    rows.push(["id", s.id]);
    rows.push(["title", s.title]);
    rows.push(["cadence", s.cadence]);
    rows.push(["headline", s.headline]);
    rows.push(["status", s.status]);
    rows.push(["statusLabel", s.statusLabel]);
    rows.push(["note", s.note ?? ""]);
    rows.push(["noteTone", s.noteTone ?? ""]);
    if (s.progressBar) {
      rows.push(["progress_fillPct", s.progressBar.fillPct]);
      rows.push(["progress_labelRight", s.progressBar.labelRight]);
      rows.push(["progress_minLabel", s.progressBar.minLabel ?? ""]);
      rows.push(["progress_midLabel", s.progressBar.midLabel ?? ""]);
      rows.push(["progress_maxLabel", s.progressBar.maxLabel ?? ""]);
    } else {
      rows.push(["progress_fillPct", ""]);
      rows.push(["progress_labelRight", ""]);
      rows.push(["progress_minLabel", ""]);
      rows.push(["progress_midLabel", ""]);
      rows.push(["progress_maxLabel", ""]);
    }
    rows.push(["DETAILS_HEADER", "key", "value"]);
    for (const d of s.details ?? []) {
      rows.push(["DETAIL", d.key, d.value]);
    }
    rows.push(["SEMAFORO_END"]);
  }
  rows.push([]);
  rows.push(["PROYECTOS"]);
  rows.push(["name", "client", "status"]);
  for (const pr of p.projects ?? []) {
    rows.push([pr.name, pr.client, pr.status]);
  }
  rows.push([]);
  rows.push(["INGRESOS"]);
  rows.push(["name", "amount", "gasto", "ganancia"]);
  for (const r of p.ingresos ?? []) {
    const gasto = r.gasto ?? 0;
    rows.push([r.name, r.amount, gasto, gananciaIngresoRow(r)]);
  }
  rows.push([]);
  rows.push(["TRANSVERSALES"]);
  rows.push(["label", "gasto"]);
  for (const r of normalizeTransversalRows(p.transversales)) {
    rows.push([r.label, r.gasto]);
  }
  rows.push([]);
  rows.push(["GASTOS"]);
  rows.push(["name", "amount"]);
  for (const r of p.gastos ?? []) {
    rows.push([r.name, r.amount]);
  }
  rows.push([]);
  rows.push(["RESULTADO"]);
  const res = p.resultado ?? {
    ingresos: 0,
    gastos: 0,
    resultado: 0,
    note: "",
    positive: true,
  };
  rows.push(["ingresos", res.ingresos]);
  rows.push(["gastos", res.gastos]);
  rows.push(["resultado", res.resultado]);
  rows.push(["note", res.note]);
  rows.push(["positive", res.positive ? 1 : 0]);
  return rows;
}

export function buildMetricsWorkbookBuffer(data: MetricsFile): Buffer {
  const wb = XLSX.utils.book_new();
  const control = [
    ["currentPeriodId"],
    [data.currentPeriodId],
    [],
    ["Notas"],
    [
      "Cada hoja (excepto _Control) es un mes. El nombre de hoja debe coincidir con la clave en metrics.json (ej. 2026-03).",
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(control), "_Control");

  const ids = Object.keys(data.periods).sort();
  for (const pid of ids) {
    const name = sanitizeSheetName(pid);
    const aoa = periodToAoA(data.periods[pid], pid);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function cellStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function cellNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Lee una hoja de mes exportada con periodToAoA. Devuelve null si no es válida. */
export function parseMonthSheetToPeriod(
  sheet: XLSX.WorkSheet,
  sheetNamePeriodId: string
): { periodId: string; period: PeriodBlock } | null {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: "",
  }) as (string | number)[][];
  if (!rows.length || cellStr(rows[0]?.[0]) !== MARKER) return null;

  const meta = new Map<string, string | number>();
  let i = 0;

  while (i < rows.length) {
    const row = rows[i];
    const a0 = cellStr(row?.[0]);
    if (a0 === "KPIs") break;
    if (a0 === "METADATOS") {
      i++;
      continue;
    }
    if (row && row.length >= 2 && a0) {
      meta.set(a0, row[1] as string | number);
    }
    i++;
  }

  const canonicalId = cellStr(meta.get("periodId")) || sheetNamePeriodId;
  const label = cellStr(meta.get("label")) || canonicalId;
  const footerTitle = cellStr(meta.get("footerTitle")) || `Reporte · ${canonicalId}`;

  const period: PeriodBlock = {
    label,
    footerTitle,
    kpis: [],
    semaforos: [],
    charts: {
      util: [cellNum(meta.get("chart_util_0")), cellNum(meta.get("chart_util_1"))],
      entregas: [cellNum(meta.get("chart_ent_0")), cellNum(meta.get("chart_ent_1"))],
      retraso: [cellNum(meta.get("chart_ret_0")), cellNum(meta.get("chart_ret_1"))],
      horasEstReal: [cellNum(meta.get("chart_horas_0")), cellNum(meta.get("chart_horas_1"))],
    },
    chartSubtitles: {
      entregas: cellStr(meta.get("chartSubEntregas")),
      retraso: cellStr(meta.get("chartSubRetraso")),
      horasEstReal: cellStr(meta.get("chartSubHoras")),
    },
    projects: [],
    projectFilterCounts: {
      all: cellNum(meta.get("projAll")),
      verde: cellNum(meta.get("projVerde")),
      amarillo: cellNum(meta.get("projAmarillo")),
      rojo: cellNum(meta.get("projRojo")),
    },
    ingresos: [],
    transversales: [],
    gastos: [],
    resultado: {
      ingresos: 0,
      gastos: 0,
      resultado: 0,
      note: "",
      positive: true,
    },
  };

  if (cellStr(rows[i]?.[0]) === "KPIs") {
    i += 2;
    while (i < rows.length) {
      const r = rows[i];
      const k0 = cellStr(r?.[0]);
      if (k0 === "SEMAFOROS") break;
      if (k0 === "" && cellStr(rows[i + 1]?.[0]) === "SEMAFOROS") break;
      if (r && r.length >= 5 && k0 !== "") {
        period.kpis.push({
          label: cellStr(r[0]),
          value: cellStr(r[1]),
          meta: cellStr(r[2]),
          progressPct: cellNum(r[3]),
          variant: cellStr(r[4]) as StatusTone,
        });
      }
      i++;
    }
  }

  while (i < rows.length && cellStr(rows[i]?.[0]) !== "SEMAFOROS") i++;
  if (cellStr(rows[i]?.[0]) === "SEMAFOROS") i++;

  while (i < rows.length) {
    const r = rows[i];
    const k0 = cellStr(r?.[0]);
    if (k0 === "PROYECTOS") break;
    if (k0 !== "SEMAFORO_START") {
      i++;
      continue;
    }
    const semId = cellStr(r?.[1]);
    i++;
    const fields = new Map<string, string>();
    const details: { key: string; value: string }[] = [];
    let fillPct = "";
    let labelRight = "";
    let minL = "";
    let midL = "";
    let maxL = "";

    while (i < rows.length) {
      const row = rows[i];
      const key = cellStr(row?.[0]);
      if (key === "SEMAFORO_END") {
        i++;
        break;
      }
      if (key === "DETAILS_HEADER") {
        i++;
        while (i < rows.length) {
          const dr = rows[i];
          const d0 = cellStr(dr?.[0]);
          if (d0 === "SEMAFORO_END") break;
          if (d0 === "DETAIL" && dr && dr.length >= 3) {
            details.push({ key: cellStr(dr[1]), value: cellStr(dr[2]) });
          }
          i++;
        }
        continue;
      }
      if (key === "progress_fillPct") fillPct = cellStr(row?.[1]);
      else if (key === "progress_labelRight") labelRight = cellStr(row?.[1]);
      else if (key === "progress_minLabel") minL = cellStr(row?.[1]);
      else if (key === "progress_midLabel") midL = cellStr(row?.[1]);
      else if (key === "progress_maxLabel") maxL = cellStr(row?.[1]);
      else if (key && row && row.length >= 2) fields.set(key, cellStr(row[1]));
      i++;
    }

    const pb =
      fillPct !== "" && !Number.isNaN(Number(fillPct))
        ? {
            fillPct: cellNum(fillPct),
            labelRight,
            minLabel: minL || undefined,
            midLabel: midL || undefined,
            maxLabel: maxL || undefined,
          }
        : undefined;

    period.semaforos.push({
      id: fields.get("id") || semId,
      title: fields.get("title") || "",
      cadence: fields.get("cadence") || "",
      headline: fields.get("headline") || "",
      status: (fields.get("status") || "amber") as StatusTone,
      statusLabel: fields.get("statusLabel") || "",
      details,
      note: fields.get("note") || undefined,
      noteTone: (fields.get("noteTone") || undefined) as StatusTone | undefined,
      ...(pb ? { progressBar: pb } : {}),
    });
  }

  while (i < rows.length && cellStr(rows[i]?.[0]) !== "PROYECTOS") i++;
  if (cellStr(rows[i]?.[0]) === "PROYECTOS") i += 2;

  while (i < rows.length) {
    const r = rows[i];
    const k0 = cellStr(r?.[0]);
    if (k0 === "INGRESOS") break;
    if (r && r.length >= 3) {
      period.projects.push({
        name: cellStr(r[0]),
        client: cellStr(r[1]),
        status: cellStr(r[2]) as ProjectRow["status"],
      });
    }
    i++;
  }

  if (cellStr(rows[i]?.[0]) === "INGRESOS") i += 2;
  while (i < rows.length) {
    const r = rows[i];
    const sec = cellStr(r?.[0]);
    if (sec === "GASTOS" || sec === "TRANSVERSALES") break;
    if (r && r.length >= 2) {
      const gasto = r.length >= 3 ? cellNum(r[2]) : 0;
      period.ingresos.push({ name: cellStr(r[0]), amount: cellNum(r[1]), gasto });
    }
    i++;
  }

  if (cellStr(rows[i]?.[0]) === "TRANSVERSALES") {
    i += 2;
    while (i < rows.length) {
      const r = rows[i];
      const sec = cellStr(r?.[0]);
      if (sec === "GASTOS") break;
      if (r && r.length >= 2) {
        period.transversales.push({ label: cellStr(r[0]), gasto: cellNum(r[1]) });
      }
      i++;
    }
  }

  if (cellStr(rows[i]?.[0]) === "GASTOS") i += 2;
  while (i < rows.length) {
    const r = rows[i];
    if (cellStr(r?.[0]) === "RESULTADO") break;
    if (r && r.length >= 2) {
      period.gastos.push({ name: cellStr(r[0]), amount: cellNum(r[1]) });
    }
    i++;
  }

  if (cellStr(rows[i]?.[0]) === "RESULTADO") i += 1;
  const resMap = new Map<string, string | number>();
  while (i < rows.length) {
    const r = rows[i];
    const key = cellStr(r?.[0]);
    if (!key) break;
    if (r && r.length >= 2) resMap.set(key, r[1]);
    i++;
  }
  period.resultado = {
    ingresos: cellNum(resMap.get("ingresos")),
    gastos: cellNum(resMap.get("gastos")),
    resultado: cellNum(resMap.get("resultado")),
    note: cellStr(resMap.get("note")),
    positive: cellNum(resMap.get("positive")) === 1 || cellStr(resMap.get("positive")) === "true",
  };

  period.transversales = normalizeTransversalRows(period.transversales);

  if (period.projects.length) {
    let v = 0,
      a = 0,
      ro = 0;
    for (const p of period.projects) {
      if (p.status === "verde") v++;
      else if (p.status === "amarillo") a++;
      else ro++;
    }
    period.projectFilterCounts = {
      all: period.projects.length,
      verde: v,
      amarillo: a,
      rojo: ro,
    };
  }

  return { periodId: canonicalId, period };
}

/** Importa libro con hoja `_Control` + una hoja por mes. */
export function parseMetricsWorkbook(buf: Buffer): MetricsFile | null {
  const wb = XLSX.read(buf, { type: "buffer" });
  const controlSheet = wb.Sheets["_Control"];
  if (!controlSheet) return null;
  const controlRows = XLSX.utils.sheet_to_json(controlSheet, { header: 1 }) as unknown[][];
  const currentPeriodId = cellStr((controlRows[1] as unknown[])?.[0]);
  if (!currentPeriodId) return null;

  const periods: Record<string, PeriodBlock> = {};
  for (const name of wb.SheetNames) {
    if (name === "_Control") continue;
    const fallbackId = name.replace(/[/\\?*[\]:]/g, "-");
    const parsed = parseMonthSheetToPeriod(wb.Sheets[name], fallbackId);
    if (parsed) periods[parsed.periodId] = parsed.period;
  }

  if (!Object.keys(periods).length) return null;
  return { currentPeriodId, periods };
}
