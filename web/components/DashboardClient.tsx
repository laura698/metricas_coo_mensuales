"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { ChevronDown } from "lucide-react";
import { Doughnut, Line } from "react-chartjs-2";
import FinSectionIcon from "@/components/FinSectionIcon";
import PeriodEditor from "@/components/PeriodEditor";
import SemaphoreLucideIcon from "@/components/SemaphoreLucideIcon";
import { parsePctHeadline } from "@/lib/chartSync";
import { parseHorasFromSemaforo } from "@/lib/horasChart";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { gananciaIngresoRow } from "@/lib/ingresoProyecto";
import { FACTURACION_ESTADO_LABELS } from "@/lib/facturaciones";
import { normalizeTransversalRows, transversalGastoTotal } from "@/lib/transversales";
import type { MetricsFile, PeriodBlock, StatusTone } from "@/lib/types";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
);

const SEM_ICON_IDS = new Set([
  "entregas",
  "riesgo",
  "horas_est_real",
  "satisfaccion",
  "cobros_pend",
  "margen_sem",
]);

/** Clases `sem-icon--*` en globals.css: color de trazo acorde al tinte (legible claro/oscuro). */
function semIconModifier(semId: string): string {
  const id = semId.replace(/[^a-z0-9_]/gi, "");
  if (SEM_ICON_IDS.has(id)) return `sem-icon--${id}`;
  return "sem-icon--default";
}

function progColor(t: StatusTone) {
  if (t === "green") return "var(--green-dot)";
  if (t === "red") return "var(--red-dot)";
  return "var(--amber-dot)";
}

function miniBarColor(v: StatusTone) {
  if (v === "green") return "var(--green-dot)";
  if (v === "red") return "var(--red-dot)";
  return "var(--amber-dot)";
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = {
  data: MetricsFile;
  trend: { labels: string[]; entregas: number[] };
  /** Controles bajo la barra sticky (origen, guardado, exportar Excel, etc.). */
  stickyBarAddon?: ReactNode;
  /** Panel colocado justo después del formulario (p. ej. JSON) y antes del reporte. */
  afterEditorSlot?: ReactNode;
  editMode?: boolean;
  onDataChange?: (next: MetricsFile) => void;
  /** Hay cambios locales respecto al último guardado/carga. */
  dirty?: boolean;
  /** Período mostrado en el selector (para guardar Excel del mes visible). */
  onSelectedPeriodChange?: (periodId: string) => void;
};

export default function DashboardClient({
  data,
  trend,
  stickyBarAddon,
  afterEditorSlot,
  editMode,
  onDataChange,
  dirty = false,
  onSelectedPeriodChange,
}: Props) {
  const reducedMotion = useReducedMotion();
  const periodIds = useMemo(() => Object.keys(data.periods).sort(), [data.periods]);
  const [selectedId, setSelectedId] = useState(data.currentPeriodId);
  const period: PeriodBlock | undefined = data.periods[selectedId];
  const [projFilter, setProjFilter] = useState<"all" | "verde" | "amarillo" | "rojo">("all");
  const [openSem, setOpenSem] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedId((prev) => (data.periods[prev] ? prev : data.currentPeriodId));
  }, [data]);

  useEffect(() => {
    onSelectedPeriodChange?.(selectedId);
  }, [selectedId, onSelectedPeriodChange]);

  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".mini-bar-fill").forEach((el) => {
        const tgt = el.dataset.target;
        if (tgt) el.style.width = `${tgt}%`;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [selectedId, period]);

  const ingresoTotal = useMemo(() => {
    if (!period?.ingresos?.length) return 0;
    return period.ingresos.reduce((s, r) => s + r.amount, 0);
  }, [period]);

  const ingresoGastoTotal = useMemo(() => {
    if (!period?.ingresos?.length) return 0;
    return period.ingresos.reduce((s, r) => s + (r.gasto ?? 0), 0);
  }, [period]);

  const ingresoGananciaTotal = useMemo(() => {
    if (!period?.ingresos?.length) return 0;
    return period.ingresos.reduce((s, r) => s + gananciaIngresoRow(r), 0);
  }, [period]);

  const gastoTotal = useMemo(() => {
    if (!period?.gastos?.length) return 0;
    return period.gastos.reduce((s, r) => s + r.amount, 0);
  }, [period]);

  const transversalRows = useMemo(
    () => (period ? normalizeTransversalRows(period.transversales) : []),
    [period]
  );
  const transversalTotal = useMemo(
    () => (period ? transversalGastoTotal(period) : 0),
    [period]
  );

  const counts = useMemo(() => {
    if (!period?.projects?.length) {
      return period?.projectFilterCounts ?? { all: 0, verde: 0, amarillo: 0, rojo: 0 };
    }
    let v = 0,
      a = 0,
      r = 0;
    for (const p of period.projects) {
      if (p.status === "verde") v++;
      else if (p.status === "amarillo") a++;
      else r++;
    }
    return { all: period.projects.length, verde: v, amarillo: a, rojo: r };
  }, [period]);

  if (!period) {
    return <div className="shell">No hay datos para el período seleccionado.</div>;
  }

  const trendLineValid = trend.labels.length > 0 && trend.entregas.every((x) => !Number.isNaN(x));

  const horasPair = useMemo(() => parseHorasFromSemaforo(period), [period]);
  const horasOverBudget = horasPair != null && horasPair.real > horasPair.est;
  const horasColors: [string, string] = horasOverBudget
    ? ["#4F8EF7", "#F59E0B"]
    : ["#4F8EF7", "#E5E7EB"];
  const rawHoras = period.charts.horasEstReal;
  const horasSlices: [number, number] =
    rawHoras && (rawHoras[0] > 0 || rawHoras[1] > 0) ? rawHoras : [50, 50];

  const entregaSemaforo = period.semaforos.find((x) => x.id === "entregas");
  const entregaPctParsed = entregaSemaforo ? parsePctHeadline(entregaSemaforo.headline) : null;
  const showEntregasRetrasoCharts = entregaPctParsed != null;
  const showHorasDonut = horasPair != null;
  const animDur = reducedMotion ? 0 : 900;

  function toggleSem(id: string) {
    setOpenSem((o) => ({ ...o, [id]: !o[id] }));
  }

  return (
    <div className="shell">
      {dirty && (
        <div className="unsaved-banner" role="status">
          Tienes cambios sin guardar: se autoguardarán en este navegador en unos instantes al dejar de editar.
        </div>
      )}

      <div className="report-sticky-bar fade-in">
        <div className="report-sticky-inner report-sticky-inner--toolbar">{stickyBarAddon}</div>
      </div>

      {onDataChange && period && editMode && (
        <div id="edicion-formulario" className="report-editor-panel fade-in" tabIndex={-1}>
          <PeriodEditor
            periodId={selectedId}
            period={period}
            onChange={(next) =>
              onDataChange({
                ...data,
                periods: { ...data.periods, [selectedId]: next },
              })
            }
          />
        </div>
      )}

      <nav className="report-nav-mobile" aria-label="Atajos de secciones">
        <a href="#sec-finanzas">Finanzas</a>
        <a href="#sec-semaforos">Semáforos</a>
        <a href="#sec-equipo">Equipo</a>
        <a href="#sec-pm">PM</a>
        {period.projects.length > 0 && <a href="#sec-proyectos">Proyectos</a>}
        <a href="#sec-facturaciones">Facturación</a>
        {(period.ingresos?.length ?? 0) > 0 && (period.gastos?.length ?? 0) > 0 && (
          <a href="#sec-ingresos">Ingresos</a>
        )}
      </nav>

      <div className="report-layout">
        <nav className="report-nav" aria-label="Secciones del informe">
          <div className="report-nav-label">Ir a</div>
          <a href="#sec-finanzas">Finanzas</a>
          <a href="#sec-semaforos">Semáforos</a>
          <a href="#sec-equipo">Equipo</a>
          <a href="#sec-pm">Project Managers</a>
          {period.projects.length > 0 && <a href="#sec-proyectos">Proyectos</a>}
          <a href="#sec-facturaciones">Facturación</a>
          {(period.ingresos?.length ?? 0) > 0 && (period.gastos?.length ?? 0) > 0 && (
            <a href="#sec-ingresos">Ingresos y gastos</a>
          )}
        </nav>
        <div className="report-main">
          <header className="report-hero fade-in">
            <h1>Reporte operativo</h1>
            <p>Panel de control COO · Revisión mensual y semanal</p>
            <div className="report-hero-meta">
              <label className="report-hero-period">
                <span className="report-hero-period-label">Período del informe</span>
                <select
                  className="report-hero-period-select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  aria-label="Elegir período del reporte"
                >
                  {periodIds.map((id) => (
                    <option key={id} value={id}>
                      {data.periods[id].label} ({id})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          <section id="sec-finanzas" className="report-section">
      <div className="section-label">Métricas financieras</div>
      <div className="kpi-grid">
        {period.kpis.map((k, i) => (
          <div key={i} className={`kpi-card ${k.variant} fade-in`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-meta">{k.meta}</div>
            <div className="mini-bar">
              <div
                className="mini-bar-fill"
                style={{ width: 0, background: miniBarColor(k.variant) }}
                data-target={String(Math.min(100, k.progressPct))}
              />
            </div>
          </div>
        ))}
      </div>
          </section>

      <section id="sec-semaforos" className="report-section">
      <div className="section-label">Dashboard de semáforos · haz clic para expandir</div>
      <div className="sem-grid">
        {period.semaforos.filter((s) => s.id !== "utilizacion").map((s) => (
          <div
            key={s.id}
            className={`sem-card fade-in${openSem[s.id] ? " open" : ""}`}
            onClick={() => toggleSem(s.id)}
            role="button"
            aria-expanded={Boolean(openSem[s.id])}
            aria-label={`${s.title}: ${s.headline}, ${s.statusLabel}. Pulsa para ver detalle.`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleSem(s.id);
              }
            }}
          >
            <div className="sem-header">
              <div className="sem-header-left">
                <div className={`sem-icon ${semIconModifier(s.id)}`}>
                  <SemaphoreLucideIcon semId={s.id} size={20} />
                </div>
                <div>
                  <div className="sem-title">{s.title}</div>
                  <div className="sem-cadence">{s.cadence}</div>
                </div>
              </div>
              <div className="sem-right">
                <span className="sem-value">{s.headline}</span>
                <span className={`status-pill ${s.status}`}>
                  <span className="dot" />
                  {s.statusLabel}
                </span>
                <ChevronDown className="sem-chevron-icon" size={18} strokeWidth={2} aria-hidden />
              </div>
            </div>
            <div className="sem-detail">
              {s.progressBar && (
                <>
                  <div className="sem-progress-row">
                    <div className="sem-progress-bar">
                      <div
                        className="sem-progress-fill"
                        style={{
                          width: `${s.progressBar.fillPct}%`,
                          background: progColor(s.status),
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--ink3)", flexShrink: 0 }}>
                      {s.progressBar.labelRight}
                    </span>
                  </div>
                  <div className="sem-progress-labels">
                    <span>{s.progressBar.minLabel ?? ""}</span>
                    <span>{s.progressBar.midLabel ?? ""}</span>
                    <span>{s.progressBar.maxLabel ?? ""}</span>
                  </div>
                  <div style={{ height: 12 }} />
                </>
              )}
              {s.details.map((d, j) => (
                <div key={j} className="detail-row">
                  <span className="detail-key">{d.key}</span>
                  <span className="detail-val">{d.value}</span>
                </div>
              ))}
              {s.note && (
                <div className={`detail-note ${s.noteTone ?? s.status}`}>{s.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      </section>

      <section id="sec-equipo" className="report-section">
      <div className="section-label">Métricas de equipo · visualización</div>
      <div className="charts-grid">
        <div className="chart-card" role="figure" aria-label="Porcentaje de entregas a tiempo frente a retrasos">
          <div className="chart-title">Entregas a tiempo</div>
          <div className="chart-sub">{period.chartSubtitles?.entregas ?? ""}</div>
          <div className="chart-wrap">
            {showEntregasRetrasoCharts ? (
              <>
                <Doughnut
                  key={`e-${period.charts.entregas.join("-")}`}
                  data={{
                    datasets: [
                      {
                        data: [...period.charts.entregas],
                        backgroundColor: ["#4CAF50", "#EF4444"],
                        borderWidth: 0,
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "72%",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: { label: (ctx) => ` ${ctx.raw as number}%` },
                      },
                    },
                    animation: { animateRotate: !reducedMotion, duration: animDur },
                  }}
                />
                <div className="chart-legend-row">
                  <span className="chart-legend-item">
                    <span className="chart-legend-swatch" style={{ background: "#4CAF50" }} /> A tiempo
                  </span>
                  <span className="chart-legend-item">
                    <span className="chart-legend-swatch" style={{ background: "#EF4444" }} /> Con retraso
                  </span>
                </div>
              </>
            ) : (
              <div className="chart-empty">
                Configura el semáforo «Entregas a tiempo» para generar esta vista.
              </div>
            )}
          </div>
        </div>
        <div className="chart-card" role="figure" aria-label="Porcentaje del mes correspondiente a retrasos">
          <div className="chart-title">Retraso del mes</div>
          <div className="chart-sub">{period.chartSubtitles?.retraso ?? ""}</div>
          <div className="chart-wrap">
            {showEntregasRetrasoCharts ? (
              <>
                <Doughnut
                  key={`r-${period.charts.retraso.join("-")}`}
                  data={{
                    datasets: [
                      {
                        data: [...period.charts.retraso],
                        backgroundColor: ["#F59E0B", "#E5E7EB"],
                        borderWidth: 0,
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "72%",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: { label: (ctx) => ` ${ctx.raw as number}%` },
                      },
                    },
                    animation: { animateRotate: !reducedMotion, duration: animDur },
                  }}
                />
                <div className="chart-legend-row">
                  <span className="chart-legend-item">
                    <span className="chart-legend-swatch" style={{ background: "#F59E0B" }} /> Retraso
                  </span>
                  <span className="chart-legend-item">
                    <span className="chart-legend-swatch" style={{ background: "#E5E7EB" }} /> Resto
                  </span>
                </div>
              </>
            ) : (
              <div className="chart-empty">
                Misma fuente que «Entregas»: completá el semáforo de entregas.
              </div>
            )}
          </div>
        </div>
        <div className="chart-card" role="figure" aria-label="Distribución porcentual de horas reales frente a estimadas">
          <div className="chart-title">Horas estimadas vs reales</div>
          <div className="chart-sub">{period.chartSubtitles?.horasEstReal ?? ""}</div>
          <div className="chart-wrap">
            {showHorasDonut ? (
              <>
                <Doughnut
                  key={`h-${horasSlices.join("-")}`}
                  data={{
                    datasets: [
                      {
                        data: [...horasSlices],
                        backgroundColor: [...horasColors],
                        borderWidth: 0,
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "72%",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: { label: (ctx) => ` ${ctx.raw as number}%` },
                      },
                    },
                    animation: { animateRotate: !reducedMotion, duration: animDur },
                  }}
                />
                <div className="chart-legend-row">
                  <span className="chart-legend-item">
                    <span className="chart-legend-swatch" style={{ background: horasColors[0] }} /> Principal
                  </span>
                  <span className="chart-legend-item">
                    <span className="chart-legend-swatch" style={{ background: horasColors[1] }} /> Complemento
                  </span>
                </div>
              </>
            ) : (
              <div className="chart-empty">
                Completa el semáforo «Horas estimadas vs reales» (horas del mes).
              </div>
            )}
          </div>
        </div>
        <div className="chart-card wide" role="figure" aria-label="Evolución del porcentaje de entregas a tiempo por mes">
          <div className="chart-title">Tendencia mensual</div>
          <div className="chart-sub">Entregas a tiempo (%)</div>
          <div className="chart-wrap" style={{ height: 200 }}>
            {trendLineValid ? (
              <Line
                key={trend.labels.join("|")}
                data={{
                  labels: [...trend.labels],
                  datasets: [
                    {
                      label: "Entregas a tiempo",
                      data: [...trend.entregas],
                      borderColor: "#4CAF50",
                      backgroundColor: "rgba(76,175,80,.06)",
                      borderWidth: 2,
                      pointRadius: 6,
                      pointBackgroundColor: "#4CAF50",
                      fill: true,
                      tension: 0.4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                      align: "end",
                      labels: {
                        boxWidth: 10,
                        boxHeight: 10,
                        borderRadius: 3,
                        padding: 16,
                        font: { family: "'DM Sans', sans-serif", size: 11 },
                        color: "#6B6960",
                      },
                    },
                    tooltip: {
                      backgroundColor: "#141412",
                      padding: 10,
                      cornerRadius: 8,
                      titleFont: { family: "'DM Sans', sans-serif", size: 11 },
                      bodyFont: { family: "'DM Mono', monospace", size: 12 },
                      callbacks: {
                        label: (ctx) => `  ${ctx.dataset.label}: ${ctx.raw as number}%`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: {
                        font: { family: "'DM Sans', sans-serif", size: 11 },
                        color: "#A8A49C",
                      },
                    },
                    y: {
                      min: 0,
                      max: 100,
                      grid: { color: "rgba(0,0,0,.05)" },
                      ticks: {
                        callback: (v) => `${v}%`,
                        font: { family: "'DM Mono', monospace", size: 10 },
                        color: "#A8A49C",
                      },
                    },
                  },
                  animation: { duration: reducedMotion ? 0 : 1000 },
                }}
              />
            ) : (
              <div className="chart-empty" style={{ minHeight: 180 }}>
                Añade al menos dos períodos con datos de entregas para ver la tendencia.
              </div>
            )}
          </div>
        </div>
      </div>
      </section>

      <section id="sec-pm" className="report-section">
      <div className="section-label">Evaluación de las Project Manager</div>
      <div className="fin-card pm-eval-section fade-in">
        <div className="fin-card-header">
          <div className="fin-card-title">
            <FinSectionIcon variant="pm" />
            <div>
              <div className="fin-title">Rendimiento y carga</div>
              <div className="fin-sub">
                Por persona · nota 5–10, proyectos asignados y evaluación del período
              </div>
            </div>
          </div>
        </div>
        <div className="fin-scroll">
          <table className="fin-table pm-eval-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="right">Cantidad de proyectos</th>
                <th>Proyectos asignados</th>
                <th className="right">Rend. y carga (5–10)</th>
                <th>Evaluación</th>
              </tr>
            </thead>
            <tbody>
              {(period.pmEvaluaciones ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--ink3)", fontStyle: "italic" }}>
                    No hay evaluaciones registradas para este período.
                  </td>
                </tr>
              ) : (
                period.pmEvaluaciones.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.nombre}</td>
                    <td className="right mono">{row.cantidadProyectos}</td>
                    <td>
                      {(row.proyectosAsignados ?? []).length > 0
                        ? row.proyectosAsignados.join(", ")
                        : "—"}
                    </td>
                    <td className="right mono">
                      {Number(row.rendimientoCarga).toLocaleString("es-ES", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td>{row.evaluacion || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </section>

      {period.projects.length > 0 && (
        <section id="sec-proyectos" className="report-section">
          <div className="section-label">Listado de proyectos</div>
          <div className="proj-table-wrap fade-in">
            <div className="proj-filters">
              <span className="filter-label">Filtrar</span>
              <button
                type="button"
                className={`filter-btn${projFilter === "all" ? " active" : ""}`}
                onClick={() => setProjFilter("all")}
              >
                Todos ({counts.all})
              </button>
              <button
                type="button"
                className={`filter-btn${projFilter === "verde" ? " active" : ""}`}
                onClick={() => setProjFilter("verde")}
              >
                <span className="proj-filter-dot proj-filter-dot--verde" aria-hidden /> En curso ({counts.verde})
              </button>
              <button
                type="button"
                className={`filter-btn${projFilter === "amarillo" ? " active" : ""}`}
                onClick={() => setProjFilter("amarillo")}
              >
                <span className="proj-filter-dot proj-filter-dot--amarillo" aria-hidden /> Atención ({counts.amarillo})
              </button>
              <button
                type="button"
                className={`filter-btn${projFilter === "rojo" ? " active" : ""}`}
                onClick={() => setProjFilter("rojo")}
              >
                <span className="proj-filter-dot proj-filter-dot--rojo" aria-hidden /> Crítico ({counts.rojo})
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Estado (Semáforo)</th>
                </tr>
              </thead>
              <tbody>
                {period.projects.map((p, i) => (
                  <tr
                    key={i}
                    data-hidden={
                      projFilter !== "all" && p.status !== projFilter ? "true" : "false"
                    }
                  >
                    <td>
                      <div className="proj-name">{p.name}</div>
                    </td>
                    <td>
                      <div className="proj-client">{p.client}</div>
                    </td>
                    <td>
                      <div className="semaforo">
                        <span className={`sem-luz rojo${p.status === "rojo" ? "" : " off"}`} />
                        <span
                          className={`sem-luz amarillo${p.status === "amarillo" ? "" : " off"}`}
                        />
                        <span className={`sem-luz verde${p.status === "verde" ? "" : " off"}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section id="sec-facturaciones" className="report-section">
      <div className="section-label">Facturaciones</div>
      <div className="fin-card facturaciones-section fade-in">
        <div className="fin-card-header">
          <div className="fin-card-title">
            <FinSectionIcon variant="facturacion" />
            <div>
              <div className="fin-title">Pendiente y planificación</div>
              <div className="fin-sub">Importes a facturar por proyecto y estado</div>
            </div>
          </div>
        </div>
        <div className="fin-scroll">
          <table className="fin-table facturaciones-table">
            <thead>
              <tr>
                <th>Nombre del proyecto</th>
                <th className="right">A facturar</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(period.facturaciones ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: "var(--ink3)", fontStyle: "italic" }}>
                    No hay líneas de facturación para este período.
                  </td>
                </tr>
              ) : (
                period.facturaciones.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.nombreProyecto}</td>
                    <td className="right mono">{fmtMoney(row.aFacturar)} $</td>
                    <td>
                      <span className="facturacion-estado-pill">{FACTURACION_ESTADO_LABELS[row.estado]}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </section>

      {period.ingresos.length > 0 && period.gastos.length > 0 && (
        <section id="sec-ingresos" className="report-section">
          <div className="section-label">Ingresos y gastos · desglose del mes</div>
          <div
            className={`resultado-card${period.resultado.positive ? " resultado-card--positive" : " resultado-card--negative"}`}
            style={{ marginBottom: 14 }}
          >
            <div className="resultado-label">Resultado neto del período</div>
            <div className="resultado-equation">
              <div className="eq-item">
                <div className="eq-label">Ingresos</div>
                <div className="eq-val eq-val--income">{fmtMoney(period.resultado.ingresos)} $</div>
              </div>
              <div className="eq-op">−</div>
              <div className="eq-item">
                <div className="eq-label">Gastos</div>
                <div className="eq-val eq-val--expense">{fmtMoney(period.resultado.gastos)} $</div>
              </div>
              <div className="eq-op">=</div>
              <div className="eq-item">
                <div className="eq-label">Resultado</div>
                <div
                  className={
                    period.resultado.positive ? "eq-val eq-val--result-pos" : "eq-val eq-val--result-neg"
                  }
                >
                  {period.resultado.resultado >= 0 ? "+" : ""}
                  {fmtMoney(period.resultado.resultado)} $
                </div>
              </div>
            </div>
            <div
              className={`resultado-note${period.resultado.positive ? " resultado-note--positive" : " resultado-note--negative"}`}
            >
              {period.resultado.note}
            </div>
          </div>
          <div className="fin-grid">
            <div className="fin-card">
              <div className="fin-card-header">
                <div className="fin-card-title">
                  <FinSectionIcon variant="ingresos" />
                  <div>
                    <div className="fin-title">Ingresos</div>
                    <div className="fin-sub">Por proyecto · facturado, gasto y ganancia</div>
                  </div>
                </div>
                <div className="fin-total-badge green">{fmtMoney(ingresoTotal)} $</div>
              </div>
              <div className="fin-ingresos-aligned">
              <div className="fin-scroll">
              <table className="fin-table fin-table-ingresos-main">
                <colgroup>
                  <col className="fin-col-ing-1" />
                  <col className="fin-col-ing-2" />
                  <col className="fin-col-ing-gasto" />
                  <col className="fin-col-ing-4" />
                  <col className="fin-col-ing-5" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Cliente / proyecto</th>
                    <th className="right">Facturado</th>
                    <th className="right">Gasto</th>
                    <th className="right">Ganancia</th>
                    <th className="right">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {period.ingresos.map((row, i) => {
                    const pct = ingresoTotal ? (row.amount / ingresoTotal) * 100 : 0;
                    const pctClamped = Math.min(100, Math.max(0, pct));
                    const gan = gananciaIngresoRow(row);
                    return (
                      <tr key={i}>
                        <td>{row.name}</td>
                        <td className="right mono">{fmtMoney(row.amount)}</td>
                        <td className="right mono">{fmtMoney(row.gasto ?? 0)}</td>
                        <td className="right mono">{fmtMoney(gan)}</td>
                        <td className="right">
                          <div className="fin-bar-wrap fin-bar-wrap-track">
                            <div className="fin-bar-track" aria-hidden="true">
                              <div
                                className="fin-bar-fill"
                                style={{
                                  width: `${pctClamped}%`,
                                  background: pctClamped > 0 ? "var(--green-dot)" : "transparent",
                                }}
                              />
                            </div>
                            <span className="fin-pct">
                              {pct.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Totales</td>
                    <td className="right mono">{fmtMoney(ingresoTotal)}</td>
                    <td className="right mono">{fmtMoney(ingresoGastoTotal)}</td>
                    <td className="right mono">{fmtMoney(ingresoGananciaTotal)}</td>
                    <td className="right">100%</td>
                  </tr>
                </tfoot>
              </table>
              </div>

              <div className="fin-trans-header">
                <div className="fin-trans-heading">
                  <div className="fin-trans-title">Transversales</div>
                  <div className="fin-trans-sub">Gasto por área · costes compartidos</div>
                </div>
                <div className="fin-scroll fin-trans-table-wrap">
                  <table className="fin-table fin-table-transversales">
                    <colgroup>
                      <col className="fin-col-tr-area" />
                      <col className="fin-col-tr-gasto" />
                      <col className="fin-col-tr-pct" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Área</th>
                        <th className="right">Gasto</th>
                        <th className="right">% del total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transversalRows.map((row, i) => {
                        const pct = transversalTotal ? (row.gasto / transversalTotal) * 100 : 0;
                        const pctClamped = Math.min(100, Math.max(0, pct));
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500, color: "var(--ink)" }}>{row.label}</td>
                            <td className="right fin-num">{fmtMoney(row.gasto)}</td>
                            <td className="right">
                              <div className="fin-bar-wrap fin-bar-wrap-track">
                                <div className="fin-bar-track" aria-hidden="true">
                                  <div
                                    className="fin-bar-fill"
                                    style={{
                                      width: `${pctClamped}%`,
                                      background:
                                        pctClamped > 0 ? "var(--blue)" : "transparent",
                                    }}
                                  />
                                </div>
                                <span className="fin-pct">
                                  {pct.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Totales</td>
                        <td className="right fin-num">{fmtMoney(transversalTotal)}</td>
                        <td className="right fin-num">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              </div>
            </div>

            <div className="fin-card">
              <div className="fin-card-header">
                <div className="fin-card-title">
                  <FinSectionIcon variant="gastos" />
                  <div>
                    <div className="fin-title">Gastos operativos</div>
                    <div className="fin-sub">Costos del período</div>
                  </div>
                </div>
                <div className="fin-total-badge red">{fmtMoney(gastoTotal)} $</div>
              </div>
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th className="right">Importe</th>
                    <th className="right">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {period.gastos.map((row, i) => {
                    const pct = gastoTotal ? (row.amount / gastoTotal) * 100 : 0;
                    const pctClamped = Math.min(100, Math.max(0, pct));
                    return (
                      <tr key={i}>
                        <td>{row.name}</td>
                        <td className="right mono">{fmtMoney(row.amount)}</td>
                        <td className="right">
                          <div className="fin-bar-wrap fin-bar-wrap-track">
                            <div className="fin-bar-track" aria-hidden="true">
                              <div
                                className="fin-bar-fill"
                                style={{
                                  width: `${pctClamped}%`,
                                  background: pctClamped > 0 ? "var(--red-dot)" : "transparent",
                                }}
                              />
                            </div>
                            <span className="fin-pct">
                              {pct.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total gastos</td>
                    <td className="right mono">{fmtMoney(gastoTotal)}</td>
                    <td className="right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}

        </div>
      </div>

      {afterEditorSlot}

      <div className="footer">
        <span>{period.footerTitle}</span>
        <span>Generado desde datos estructurados · Confidencial</span>
      </div>
    </div>
  );
}
