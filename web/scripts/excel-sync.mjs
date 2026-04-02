/**
 * Sincroniza data/metrics.json ↔ Excel (varios meses en un libro).
 * Uso:
 *   npm run excel:export   → escribe métricas_coo.xlsx en la carpeta web/
 *   npm run excel:import   → lee métricas_coo.xlsx y actualiza data/metrics.json
 */
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_JSON = path.join(ROOT, "data", "metrics.json");
const XLSX_PATH = path.join(ROOT, "métricas_coo.xlsx");

const TRANSVERSAL_LABELS = [
  "Diseño",
  "Desarrollo",
  "Prueba",
  "PM",
  "DevOps",
  "COO",
  "CTO",
  "Ventas",
];

function normalizeTransversalRows(rows) {
  const m = new Map();
  for (const r of rows || []) {
    if (r && r.label != null && String(r.label).trim() !== "") {
      m.set(String(r.label).trim(), Number(r.gasto) || 0);
    }
  }
  return TRANSVERSAL_LABELS.map((label) => ({ label, gasto: m.get(label) || 0 }));
}

function readJson() {
  return JSON.parse(fs.readFileSync(DATA_JSON, "utf-8"));
}

function exportWorkbook(data) {
  const wb = XLSX.utils.book_new();

  const control = [["currentPeriodId"], [data.currentPeriodId]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(control), "Control");

  const periodMetaRows = [
    [
      "periodId",
      "label",
      "footerTitle",
      "chartSubEntregas",
      "chartSubRetraso",
      "chartSubHoras",
      "util0",
      "util1",
      "ent0",
      "ent1",
      "ret0",
      "ret1",
      "horas0",
      "horas1",
      "projAll",
      "projVerde",
      "projAmarillo",
      "projRojo",
    ],
  ];
  for (const pid of Object.keys(data.periods).sort()) {
    const p = data.periods[pid];
    const c = p.projectFilterCounts || { all: 0, verde: 0, amarillo: 0, rojo: 0 };
    periodMetaRows.push([
      pid,
      p.label,
      p.footerTitle,
      p.chartSubtitles?.entregas ?? "",
      p.chartSubtitles?.retraso ?? "",
      p.chartSubtitles?.horasEstReal ?? "",
      p.charts?.util?.[0] ?? "",
      p.charts?.util?.[1] ?? "",
      p.charts?.entregas?.[0] ?? "",
      p.charts?.entregas?.[1] ?? "",
      p.charts?.retraso?.[0] ?? "",
      p.charts?.retraso?.[1] ?? "",
      p.charts?.horasEstReal?.[0] ?? "",
      p.charts?.horasEstReal?.[1] ?? "",
      c.all,
      c.verde,
      c.amarillo,
      c.rojo,
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(periodMetaRows), "PeriodMeta");

  const kpiRows = [["periodId", "label", "value", "meta", "progressPct", "variant"]];
  for (const pid of Object.keys(data.periods).sort()) {
    for (const k of data.periods[pid].kpis || []) {
      kpiRows.push([pid, k.label, k.value, k.meta, k.progressPct, k.variant]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), "KPIs");

  const semRows = [
    [
      "periodId",
      "id",
      "title",
      "cadence",
      "headline",
      "status",
      "statusLabel",
      "note",
      "noteTone",
      "detailsJson",
      "progressJson",
    ],
  ];
  for (const pid of Object.keys(data.periods).sort()) {
    for (const s of data.periods[pid].semaforos || []) {
      semRows.push([
        pid,
        s.id,
        s.title,
        s.cadence,
        s.headline,
        s.status,
        s.statusLabel,
        s.note ?? "",
        s.noteTone ?? "",
        JSON.stringify(s.details ?? []),
        s.progressBar ? JSON.stringify(s.progressBar) : "",
      ]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(semRows), "Semaforos");

  const projRows = [["periodId", "name", "client", "status"]];
  for (const pid of Object.keys(data.periods).sort()) {
    for (const p of data.periods[pid].projects || []) {
      projRows.push([pid, p.name, p.client, p.status]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projRows), "Proyectos");

  const ingRows = [["periodId", "name", "amount", "gasto"]];
  for (const pid of Object.keys(data.periods).sort()) {
    for (const r of data.periods[pid].ingresos || []) {
      ingRows.push([pid, r.name, r.amount, r.gasto ?? 0]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ingRows), "Ingresos");

  const transvRows = [["periodId", "label", "gasto"]];
  for (const pid of Object.keys(data.periods).sort()) {
    for (const r of normalizeTransversalRows(data.periods[pid].transversales)) {
      transvRows.push([pid, r.label, r.gasto]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transvRows), "Transversales");

  const gasRows = [["periodId", "name", "amount"]];
  for (const pid of Object.keys(data.periods).sort()) {
    for (const r of data.periods[pid].gastos || []) {
      gasRows.push([pid, r.name, r.amount]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gasRows), "Gastos");

  const resRows = [["periodId", "ingresos", "gastos", "resultado", "note", "positive"]];
  for (const pid of Object.keys(data.periods).sort()) {
    const r = data.periods[pid].resultado;
    if (r) {
      resRows.push([
        pid,
        r.ingresos,
        r.gastos,
        r.resultado,
        r.note,
        r.positive ? 1 : 0,
      ]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resRows), "Resultado");

  XLSX.writeFile(wb, XLSX_PATH);
  console.log("Escrito:", XLSX_PATH);
}

function parseSheetJson(ws) {
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function importWorkbook() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error("No existe el archivo:", XLSX_PATH);
    process.exit(1);
  }
  const wb = XLSX.readFile(XLSX_PATH);
  const control = wb.Sheets["Control"];
  if (!control) throw new Error("Falta hoja Control");
  const controlRows = XLSX.utils.sheet_to_json(control, { header: 1 });
  const currentPeriodId = controlRows[1]?.[0];
  if (!currentPeriodId) throw new Error("currentPeriodId vacío en Control fila 2 columna A");

  const periodMeta = parseSheetJson(wb.Sheets["PeriodMeta"]);
  const kpis = parseSheetJson(wb.Sheets["KPIs"]);
  const semaforos = parseSheetJson(wb.Sheets["Semaforos"]);
  const projects = parseSheetJson(wb.Sheets["Proyectos"]);
  const ingresos = parseSheetJson(wb.Sheets["Ingresos"]);
  const transversalesSheet = wb.Sheets["Transversales"]
    ? parseSheetJson(wb.Sheets["Transversales"])
    : [];
  const gastos = parseSheetJson(wb.Sheets["Gastos"]);
  const resultado = parseSheetJson(wb.Sheets["Resultado"]);

  const periodIds = new Set();
  for (const r of periodMeta) if (r.periodId) periodIds.add(String(r.periodId));
  for (const r of kpis) if (r.periodId) periodIds.add(String(r.periodId));
  for (const r of semaforos) if (r.periodId) periodIds.add(String(r.periodId));
  for (const r of projects) if (r.periodId) periodIds.add(String(r.periodId));
  for (const r of ingresos) if (r.periodId) periodIds.add(String(r.periodId));
  for (const r of transversalesSheet) if (r.periodId) periodIds.add(String(r.periodId));
  for (const r of gastos) if (r.periodId) periodIds.add(String(r.periodId));
  for (const r of resultado) if (r.periodId) periodIds.add(String(r.periodId));

  const periods = {};

  for (const pid of periodIds) {
    const meta = periodMeta.find((x) => String(x.periodId) === pid) || {};
    const period = {
      label: meta.label || pid,
      footerTitle: meta.footerTitle || `Reporte · ${pid}`,
      kpis: [],
      semaforos: [],
      charts: {
        util: [Number(meta.util0) || 0, Number(meta.util1) || 0],
        entregas: [Number(meta.ent0) || 0, Number(meta.ent1) || 0],
        retraso: [Number(meta.ret0) || 0, Number(meta.ret1) || 0],
        horasEstReal: [Number(meta.horas0) || 0, Number(meta.horas1) || 0],
      },
      chartSubtitles: {
        entregas: meta.chartSubEntregas || "",
        retraso: meta.chartSubRetraso || "",
        horasEstReal: meta.chartSubHoras || "",
      },
      projects: [],
      projectFilterCounts: {
        all: Number(meta.projAll) || 0,
        verde: Number(meta.projVerde) || 0,
        amarillo: Number(meta.projAmarillo) || 0,
        rojo: Number(meta.projRojo) || 0,
      },
      ingresos: [],
      transversales: [],
      gastos: [],
      resultado: null,
    };

    for (const k of kpis.filter((x) => String(x.periodId) === pid)) {
      period.kpis.push({
        label: k.label,
        value: String(k.value ?? ""),
        meta: String(k.meta ?? ""),
        progressPct: Number(k.progressPct) || 0,
        variant: k.variant || "amber",
      });
    }

    for (const s of semaforos.filter((x) => String(x.periodId) === pid)) {
      let details = [];
      try {
        details = JSON.parse(s.detailsJson || "[]");
      } catch {
        details = [];
      }
      let progressBar = undefined;
      if (s.progressJson) {
        try {
          progressBar = JSON.parse(s.progressJson);
        } catch {
          progressBar = undefined;
        }
      }
      const block = {
        id: s.id,
        title: s.title,
        cadence: s.cadence,
        headline: String(s.headline ?? ""),
        status: s.status || "amber",
        statusLabel: s.statusLabel || "",
        details,
        note: s.note || undefined,
        noteTone: s.noteTone || undefined,
      };
      if (progressBar) block.progressBar = progressBar;
      period.semaforos.push(block);
    }

    for (const p of projects.filter((x) => String(x.periodId) === pid)) {
      period.projects.push({
        name: p.name,
        client: p.client,
        status: p.status || "amarillo",
      });
    }

    for (const r of ingresos.filter((x) => String(x.periodId) === pid)) {
      period.ingresos.push({
        name: r.name,
        amount: Number(r.amount) || 0,
        gasto: r.gasto !== undefined && r.gasto !== "" ? Number(r.gasto) || 0 : 0,
      });
    }

    for (const r of transversalesSheet.filter((x) => String(x.periodId) === pid)) {
      period.transversales.push({
        label: String(r.label ?? ""),
        gasto: Number(r.gasto) || 0,
      });
    }
    period.transversales = normalizeTransversalRows(period.transversales);

    for (const r of gastos.filter((x) => String(x.periodId) === pid)) {
      period.gastos.push({ name: r.name, amount: Number(r.amount) || 0 });
    }

    const res = resultado.find((x) => String(x.periodId) === pid);
    if (res) {
      period.resultado = {
        ingresos: Number(res.ingresos) || 0,
        gastos: Number(res.gastos) || 0,
        resultado: Number(res.resultado) || 0,
        note: String(res.note ?? ""),
        positive: res.positive === 1 || res.positive === true || res.positive === "1",
      };
    } else {
      period.resultado = {
        ingresos: 0,
        gastos: 0,
        resultado: 0,
        note: "",
        positive: true,
      };
    }

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

    periods[pid] = period;
  }

  const out = { currentPeriodId: String(currentPeriodId), periods };
  fs.writeFileSync(DATA_JSON, JSON.stringify(out, null, 2), "utf-8");
  console.log("Actualizado:", DATA_JSON);
}

const cmd = process.argv[2];
if (cmd === "export") {
  exportWorkbook(readJson());
} else if (cmd === "import") {
  importWorkbook();
} else {
  console.log("Uso: node excel-sync.mjs export|import");
  process.exit(1);
}
