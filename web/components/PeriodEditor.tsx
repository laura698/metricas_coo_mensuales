"use client";

import type { ReactNode } from "react";
import {
  recalcProjectCounts,
  syncChartsFromSemaforos,
  syncResultadoFromTables,
} from "@/lib/chartSync";
import { gananciaIngresoRow } from "@/lib/ingresoProyecto";
import { FACTURACION_ESTADO_LABELS } from "@/lib/facturaciones";
import { clampPmRendimientoCarga } from "@/lib/pmEvaluacion";
import { normalizeTransversalRows } from "@/lib/transversales";
import type {
  FacturacionEstado,
  FacturacionRow,
  IngresoProyectoRow,
  KpiCard,
  MoneyRow,
  PeriodBlock,
  ProjectManagerEvalRow,
  ProjectRow,
  SemaforoBlock,
  StatusTone,
} from "@/lib/types";

const FACTURACION_ESTADO_OPTS: FacturacionEstado[] = ["pendiente", "futuro", "nuevo"];

const TONES: { value: StatusTone; label: string }[] = [
  { value: "green", label: "Verde" },
  { value: "amber", label: "Ámbar" },
  { value: "red", label: "Rojo" },
];

const PROJ_STATUS: ProjectRow["status"][] = ["verde", "amarillo", "rojo"];

type Props = {
  periodId: string;
  period: PeriodBlock;
  onChange: (next: PeriodBlock) => void;
};

function row(label: string, node: ReactNode) {
  return (
    <>
      <label style={{ fontSize: 12, color: "var(--ink2)" }}>{label}</label>
      <div>{node}</div>
    </>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border2)",
  fontFamily: "inherit",
  fontSize: 13,
};

export default function PeriodEditor({ periodId, period, onChange }: Props) {
  const update = (patch: Partial<PeriodBlock>) => onChange({ ...period, ...patch });

  return (
    <div className="period-editor-wrap fade-in" style={{ marginBottom: 24 }}>
      <div className="section-label" style={{ marginTop: 16 }}>
        Formulario de edición · mes {periodId}
      </div>
      <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 14, lineHeight: 1.55 }}>
        Elige el mes arriba en &quot;Período del reporte&quot;. Al cambiar un valor, el reporte que sigue debajo se
        actualiza en vivo. Al final de la página está <strong>Guardar cambios</strong> (nube) y el Excel.
      </p>

      <div className="pe-section">
        <h3 className="pe-h3">Cabecera e informes</h3>
        <div className="pe-grid">
          {row(
            "Etiqueta mes",
            <input style={inp} value={period.label} onChange={(e) => update({ label: e.target.value })} />
          )}
          {row(
            "Pie de página",
            <input
              style={inp}
              value={period.footerTitle}
              onChange={(e) => update({ footerTitle: e.target.value })}
            />
          )}
          {row(
            "Subtítulo gráf. entregas",
            <input
              style={inp}
              value={period.chartSubtitles?.entregas ?? ""}
              onChange={(e) =>
                update({
                  chartSubtitles: { ...period.chartSubtitles, entregas: e.target.value },
                })
              }
            />
          )}
          {row(
            "Subtítulo gráf. retraso",
            <input
              style={inp}
              value={period.chartSubtitles?.retraso ?? ""}
              onChange={(e) =>
                update({
                  chartSubtitles: { ...period.chartSubtitles, retraso: e.target.value },
                })
              }
            />
          )}
          {row(
            "Subtítulo gráf. horas est./real",
            <input
              style={inp}
              value={period.chartSubtitles?.horasEstReal ?? ""}
              onChange={(e) =>
                update({
                  chartSubtitles: { ...period.chartSubtitles, horasEstReal: e.target.value },
                })
              }
            />
          )}
        </div>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">Datos de tortas (%)</h3>
        <div className="pe-grid">
          {row(
            "Entregas A / B",
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                style={{ ...inp, flex: 1 }}
                value={period.charts?.entregas?.[0] ?? ""}
                onChange={(e) =>
                  update({
                    charts: {
                      ...period.charts,
                      entregas: [
                        Number(e.target.value) || 0,
                        period.charts?.entregas?.[1] ?? 0,
                      ] as [number, number],
                    },
                  })
                }
              />
              <input
                type="number"
                style={{ ...inp, flex: 1 }}
                value={period.charts?.entregas?.[1] ?? ""}
                onChange={(e) =>
                  update({
                    charts: {
                      ...period.charts,
                      entregas: [
                        period.charts?.entregas?.[0] ?? 0,
                        Number(e.target.value) || 0,
                      ] as [number, number],
                    },
                  })
                }
              />
            </div>
          )}
          {row(
            "Retraso A / B",
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                style={{ ...inp, flex: 1 }}
                value={period.charts?.retraso?.[0] ?? ""}
                onChange={(e) =>
                  update({
                    charts: {
                      ...period.charts,
                      retraso: [
                        Number(e.target.value) || 0,
                        period.charts?.retraso?.[1] ?? 0,
                      ] as [number, number],
                    },
                  })
                }
              />
              <input
                type="number"
                style={{ ...inp, flex: 1 }}
                value={period.charts?.retraso?.[1] ?? ""}
                onChange={(e) =>
                  update({
                    charts: {
                      ...period.charts,
                      retraso: [
                        period.charts?.retraso?.[0] ?? 0,
                        Number(e.target.value) || 0,
                      ] as [number, number],
                    },
                  })
                }
              />
            </div>
          )}
          {row(
            "Horas est./real A / B (%)",
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                style={{ ...inp, flex: 1 }}
                value={period.charts?.horasEstReal?.[0] ?? ""}
                onChange={(e) =>
                  update({
                    charts: {
                      ...period.charts,
                      horasEstReal: [
                        Number(e.target.value) || 0,
                        period.charts?.horasEstReal?.[1] ?? 0,
                      ] as [number, number],
                    },
                  })
                }
              />
              <input
                type="number"
                style={{ ...inp, flex: 1 }}
                value={period.charts?.horasEstReal?.[1] ?? ""}
                onChange={(e) =>
                  update({
                    charts: {
                      ...period.charts,
                      horasEstReal: [
                        period.charts?.horasEstReal?.[0] ?? 0,
                        Number(e.target.value) || 0,
                      ] as [number, number],
                    },
                  })
                }
              />
            </div>
          )}
        </div>
        <button
          type="button"
          className="filter-btn"
          style={{ marginTop: 10 }}
          onClick={() => onChange(syncChartsFromSemaforos(period))}
        >
          Sincronizar tortas (entregas y horas desde semáforos)
        </button>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">KPIs financieros</h3>
        {(period.kpis ?? []).map((k: KpiCard, i: number) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              padding: 12,
              background: "var(--surface2)",
              borderRadius: 8,
            }}
          >
            <div className="pe-grid" style={{ marginBottom: 8 }}>
              {row(
                "Título",
                <input
                  style={inp}
                  value={k.label}
                  onChange={(e) => {
                    const kpis = [...(period.kpis ?? [])];
                    kpis[i] = { ...k, label: e.target.value };
                    update({ kpis });
                  }}
                />
              )}
              {row(
                "Valor",
                <input
                  style={inp}
                  value={k.value}
                  onChange={(e) => {
                    const kpis = [...(period.kpis ?? [])];
                    kpis[i] = { ...k, value: e.target.value };
                    update({ kpis });
                  }}
                />
              )}
              {row(
                "Meta / nota",
                <input
                  style={inp}
                  value={k.meta}
                  onChange={(e) => {
                    const kpis = [...(period.kpis ?? [])];
                    kpis[i] = { ...k, meta: e.target.value };
                    update({ kpis });
                  }}
                />
              )}
              {row(
                "% barra mini",
                <input
                  type="number"
                  style={inp}
                  value={k.progressPct}
                  onChange={(e) => {
                    const kpis = [...(period.kpis ?? [])];
                    kpis[i] = { ...k, progressPct: Number(e.target.value) || 0 };
                    update({ kpis });
                  }}
                />
              )}
              {row(
                "Variante",
                <select
                  style={inp}
                  value={k.variant}
                  onChange={(e) => {
                    const kpis = [...(period.kpis ?? [])];
                    kpis[i] = { ...k, variant: e.target.value as StatusTone };
                    update({ kpis });
                  }}
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              className="filter-btn"
              style={{ marginTop: 8 }}
              onClick={() => {
                const kpis = (period.kpis ?? []).filter((_, j) => j !== i);
                update({ kpis });
              }}
            >
              Eliminar este KPI
            </button>
          </div>
        ))}
        <button
          type="button"
          className="filter-btn"
          onClick={() => update({ kpis: [...(period.kpis ?? []), emptyKpi()] })}
        >
          + Añadir KPI
        </button>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">Semáforos</h3>
        {(period.semaforos ?? []).map((s: SemaforoBlock, si: number) => (
          <div
            key={`${s.id}-${si}`}
            style={{
              marginBottom: 14,
              padding: 12,
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
              Bloque {si + 1} · id:{" "}
              <input
                style={{ ...inp, display: "inline-block", width: 140, padding: "4px 8px", fontSize: 12 }}
                value={s.id}
                onChange={(e) => {
                  const semaforos = [...(period.semaforos ?? [])];
                  semaforos[si] = { ...s, id: e.target.value };
                  update({ semaforos });
                }}
              />
            </div>
            <div className="pe-grid">
              {row(
                "Título",
                <input
                  style={inp}
                  value={s.title}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    semaforos[si] = { ...s, title: e.target.value };
                    update({ semaforos });
                  }}
                />
              )}
              {row(
                "Cadencia",
                <input
                  style={inp}
                  value={s.cadence}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    semaforos[si] = { ...s, cadence: e.target.value };
                    update({ semaforos });
                  }}
                />
              )}
              {row(
                "Valor cabecera",
                <input
                  style={inp}
                  value={s.headline}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    semaforos[si] = { ...s, headline: e.target.value };
                    update({ semaforos });
                  }}
                />
              )}
              {row(
                "Estado",
                <select
                  style={inp}
                  value={s.status}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    semaforos[si] = { ...s, status: e.target.value as StatusTone };
                    update({ semaforos });
                  }}
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
              {row(
                "Etiqueta estado",
                <input
                  style={inp}
                  value={s.statusLabel}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    semaforos[si] = { ...s, statusLabel: e.target.value };
                    update({ semaforos });
                  }}
                />
              )}
              {row(
                "Nota",
                <textarea
                  style={{ ...inp, minHeight: 56, resize: "vertical" }}
                  value={s.note ?? ""}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    semaforos[si] = { ...s, note: e.target.value || undefined };
                    update({ semaforos });
                  }}
                />
              )}
              {row(
                "Tono nota",
                <select
                  style={inp}
                  value={s.noteTone ?? ""}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    const v = e.target.value as StatusTone | "";
                    semaforos[si] = { ...s, noteTone: v ? (v as StatusTone) : undefined };
                    update({ semaforos });
                  }}
                >
                  <option value="">(igual que estado)</option>
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink3)" }}>Barra de progreso (opcional)</div>
            <div className="pe-grid" style={{ marginTop: 8 }}>
              {row(
                "% relleno",
                <input
                  type="number"
                  style={inp}
                  value={s.progressBar?.fillPct ?? ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const semaforos = [...(period.semaforos ?? [])];
                    const pb = { ...(s.progressBar ?? { fillPct: 0, labelRight: "" }) };
                    pb.fillPct = Number.isFinite(n) ? n : 0;
                    semaforos[si] = { ...s, progressBar: pb };
                    update({ semaforos });
                  }}
                />
              )}
              {row(
                "Texto derecha",
                <input
                  style={inp}
                  value={s.progressBar?.labelRight ?? ""}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    const pb = { ...(s.progressBar ?? { fillPct: 0, labelRight: "" }) };
                    pb.labelRight = e.target.value;
                    semaforos[si] = { ...s, progressBar: pb };
                    update({ semaforos });
                  }}
                />
              )}
              {row(
                "Escala min / meta / max",
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    placeholder="min"
                    style={{ ...inp, flex: 1 }}
                    value={s.progressBar?.minLabel ?? ""}
                    onChange={(e) => {
                      const semaforos = [...(period.semaforos ?? [])];
                      const pb = { ...(s.progressBar ?? { fillPct: 0, labelRight: "" }) };
                      pb.minLabel = e.target.value;
                      semaforos[si] = { ...s, progressBar: pb };
                      update({ semaforos });
                    }}
                  />
                  <input
                    placeholder="meta"
                    style={{ ...inp, flex: 1 }}
                    value={s.progressBar?.midLabel ?? ""}
                    onChange={(e) => {
                      const semaforos = [...(period.semaforos ?? [])];
                      const pb = { ...(s.progressBar ?? { fillPct: 0, labelRight: "" }) };
                      pb.midLabel = e.target.value;
                      semaforos[si] = { ...s, progressBar: pb };
                      update({ semaforos });
                    }}
                  />
                  <input
                    placeholder="max"
                    style={{ ...inp, flex: 1 }}
                    value={s.progressBar?.maxLabel ?? ""}
                    onChange={(e) => {
                      const semaforos = [...(period.semaforos ?? [])];
                      const pb = { ...(s.progressBar ?? { fillPct: 0, labelRight: "" }) };
                      pb.maxLabel = e.target.value;
                      semaforos[si] = { ...s, progressBar: pb };
                      update({ semaforos });
                    }}
                  />
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink3)" }}>Detalle (pares clave / valor)</div>
            {(s.details ?? []).map((d, di) => (
              <div key={di} style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <input
                  style={{ ...inp, flex: 1 }}
                  value={d.key}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    const details = [...(s.details ?? [])];
                    details[di] = { ...d, key: e.target.value };
                    semaforos[si] = { ...s, details };
                    update({ semaforos });
                  }}
                />
                <input
                  style={{ ...inp, flex: 1 }}
                  value={d.value}
                  onChange={(e) => {
                    const semaforos = [...(period.semaforos ?? [])];
                    const details = [...(s.details ?? [])];
                    details[di] = { ...d, value: e.target.value };
                    semaforos[si] = { ...s, details };
                    update({ semaforos });
                  }}
                />
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    const semaforos = [...(period.semaforos ?? [])];
                    const details = (s.details ?? []).filter((_, j) => j !== di);
                    semaforos[si] = { ...s, details };
                    update({ semaforos });
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="filter-btn"
              style={{ marginTop: 8 }}
              onClick={() => {
                const semaforos = [...(period.semaforos ?? [])];
                semaforos[si] = { ...s, details: [...(s.details ?? []), { key: "", value: "" }] };
                update({ semaforos });
              }}
            >
              + Detalle
            </button>
            <button
              type="button"
              className="filter-btn"
              style={{ marginTop: 8, marginLeft: 8 }}
              onClick={() => {
                const semaforos = (period.semaforos ?? []).filter((_, j) => j !== si);
                update({ semaforos });
              }}
            >
              Eliminar semáforo
            </button>
          </div>
        ))}
        <button
          type="button"
          className="filter-btn"
          onClick={() =>
            update({
              semaforos: [
                ...(period.semaforos ?? []),
                {
                  id: `nuevo_${Date.now()}`,
                  title: "Nuevo",
                  cadence: "Mensual",
                  headline: "0",
                  status: "amber",
                  statusLabel: "—",
                  details: [],
                },
              ],
            })
          }
        >
          + Añadir semáforo
        </button>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">Proyectos</h3>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Proyecto</th>
              <th style={{ textAlign: "left", padding: 8 }}>Cliente</th>
              <th style={{ textAlign: "left", padding: 8 }}>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(period.projects ?? []).map((p: ProjectRow, pi: number) => (
              <tr key={pi}>
                <td style={{ padding: 6 }}>
                  <input
                    style={inp}
                    value={p.name}
                    onChange={(e) => {
                      const projects = [...(period.projects ?? [])];
                      projects[pi] = { ...p, name: e.target.value };
                      onChange(recalcProjectCounts({ ...period, projects }));
                    }}
                  />
                </td>
                <td style={{ padding: 6 }}>
                  <input
                    style={inp}
                    value={p.client}
                    onChange={(e) => {
                      const projects = [...(period.projects ?? [])];
                      projects[pi] = { ...p, client: e.target.value };
                      onChange(recalcProjectCounts({ ...period, projects }));
                    }}
                  />
                </td>
                <td style={{ padding: 6 }}>
                  <select
                    style={inp}
                    value={p.status}
                    onChange={(e) => {
                      const projects = [...(period.projects ?? [])];
                      projects[pi] = { ...p, status: e.target.value as ProjectRow["status"] };
                      onChange(recalcProjectCounts({ ...period, projects }));
                    }}
                  >
                    {PROJ_STATUS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => {
                      const projects = (period.projects ?? []).filter((_, j) => j !== pi);
                      onChange(recalcProjectCounts({ ...period, projects }));
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="filter-btn"
          style={{ marginTop: 10 }}
          onClick={() =>
            onChange(
              recalcProjectCounts({
                ...period,
                projects: [...(period.projects ?? []), { name: "", client: "", status: "amarillo" }],
              })
            )
          }
        >
          + Proyecto
        </button>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">Facturaciones</h3>
        <p style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 10, maxWidth: "42rem" }}>
          Proyecto, importe a facturar y estado: pendiente por facturar, factura a futuro o proyecto nuevo.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "var(--ink3)", textTransform: "uppercase", fontSize: 10 }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Nombre del proyecto</th>
              <th style={{ textAlign: "right", padding: "6px 8px", width: 120 }}>A facturar</th>
              <th style={{ textAlign: "left", padding: "6px 8px", minWidth: 200 }}>Estado</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {(period.facturaciones ?? []).map((row: FacturacionRow, fi: number) => (
              <tr key={fi} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <input
                    style={inp}
                    value={row.nombreProyecto}
                    onChange={(e) => {
                      const facturaciones = [...(period.facturaciones ?? [])];
                      facturaciones[fi] = { ...row, nombreProyecto: e.target.value };
                      onChange({ ...period, facturaciones });
                    }}
                  />
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    style={{ ...inp, textAlign: "right" }}
                    value={row.aFacturar}
                    onChange={(e) => {
                      const facturaciones = [...(period.facturaciones ?? [])];
                      facturaciones[fi] = {
                        ...row,
                        aFacturar: Math.max(0, Number(e.target.value) || 0),
                      };
                      onChange({ ...period, facturaciones });
                    }}
                  />
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <select
                    style={inp}
                    value={row.estado}
                    onChange={(e) => {
                      const facturaciones = [...(period.facturaciones ?? [])];
                      facturaciones[fi] = {
                        ...row,
                        estado: e.target.value as FacturacionEstado,
                      };
                      onChange({ ...period, facturaciones });
                    }}
                  >
                    {FACTURACION_ESTADO_OPTS.map((st) => (
                      <option key={st} value={st}>
                        {FACTURACION_ESTADO_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => {
                      const facturaciones = (period.facturaciones ?? []).filter((_, j) => j !== fi);
                      onChange({ ...period, facturaciones });
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="filter-btn"
          style={{ marginTop: 10 }}
          onClick={() =>
            onChange({
              ...period,
              facturaciones: [
                ...(period.facturaciones ?? []),
                { nombreProyecto: "", aFacturar: 0, estado: "pendiente" },
              ],
            })
          }
        >
          + Línea de facturación
        </button>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">Evaluación de las Project Manager</h3>
        <p style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 10, maxWidth: "42rem" }}>
          Incluye puntuación de rendimiento y carga del PM en escala <strong>5 a 10</strong>, además de
          proyectos (coma) y evaluación cualitativa.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "var(--ink3)", textTransform: "uppercase", fontSize: 10 }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Nombre</th>
              <th style={{ textAlign: "right", padding: "6px 8px", width: 100 }}>Cant.</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Proyectos asignados</th>
              <th style={{ textAlign: "right", padding: "6px 8px", width: 88 }}>5–10</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Evaluación</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {(period.pmEvaluaciones ?? []).map((row: ProjectManagerEvalRow, ei: number) => (
              <tr key={ei} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <input
                    style={inp}
                    value={row.nombre}
                    onChange={(e) => {
                      const pmEvaluaciones = [...(period.pmEvaluaciones ?? [])];
                      pmEvaluaciones[ei] = { ...row, nombre: e.target.value };
                      onChange({ ...period, pmEvaluaciones });
                    }}
                  />
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <input
                    type="number"
                    min={0}
                    style={{ ...inp, textAlign: "right" }}
                    value={row.cantidadProyectos}
                    onChange={(e) => {
                      const pmEvaluaciones = [...(period.pmEvaluaciones ?? [])];
                      pmEvaluaciones[ei] = {
                        ...row,
                        cantidadProyectos: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      };
                      onChange({ ...period, pmEvaluaciones });
                    }}
                  />
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <input
                    style={inp}
                    placeholder="Proyecto A, Proyecto B…"
                    value={row.proyectosAsignados.join(", ")}
                    onChange={(e) => {
                      const parts = e.target.value
                        .split(/[,]/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const pmEvaluaciones = [...(period.pmEvaluaciones ?? [])];
                      pmEvaluaciones[ei] = { ...row, proyectosAsignados: parts };
                      onChange({ ...period, pmEvaluaciones });
                    }}
                  />
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <input
                    type="number"
                    min={5}
                    max={10}
                    step={0.5}
                    style={{ ...inp, textAlign: "right" }}
                    value={row.rendimientoCarga}
                    onChange={(e) => {
                      const pmEvaluaciones = [...(period.pmEvaluaciones ?? [])];
                      pmEvaluaciones[ei] = {
                        ...row,
                        rendimientoCarga: clampPmRendimientoCarga(e.target.value),
                      };
                      onChange({ ...period, pmEvaluaciones });
                    }}
                  />
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <input
                    style={inp}
                    value={row.evaluacion}
                    onChange={(e) => {
                      const pmEvaluaciones = [...(period.pmEvaluaciones ?? [])];
                      pmEvaluaciones[ei] = { ...row, evaluacion: e.target.value };
                      onChange({ ...period, pmEvaluaciones });
                    }}
                  />
                </td>
                <td style={{ padding: 6, verticalAlign: "top" }}>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => {
                      const pmEvaluaciones = (period.pmEvaluaciones ?? []).filter((_, j) => j !== ei);
                      onChange({ ...period, pmEvaluaciones });
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="filter-btn"
          style={{ marginTop: 10 }}
          onClick={() =>
            onChange({
              ...period,
              pmEvaluaciones: [
                ...(period.pmEvaluaciones ?? []),
                {
                  nombre: "",
                  cantidadProyectos: 0,
                  proyectosAsignados: [],
                  rendimientoCarga: 7,
                  evaluacion: "",
                },
              ],
            })
          }
        >
          + Project Manager
        </button>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">Ingresos y gastos</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <strong style={{ fontSize: 12 }}>Ingresos por proyecto</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(80px,1fr) 88px 88px 88px 36px",
                gap: 6,
                marginTop: 8,
                fontSize: 10,
                color: "var(--ink3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <span>Cliente</span>
              <span>Fact.</span>
              <span>Gasto</span>
              <span>Ganancia</span>
              <span />
            </div>
            {(period.ingresos ?? []).map((r: IngresoProyectoRow, ri: number) => (
              <div
                key={ri}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(80px,1fr) 88px 88px 88px 36px",
                  gap: 6,
                  marginTop: 6,
                  alignItems: "center",
                }}
              >
                <input
                  placeholder="Proyecto / cliente"
                  style={inp}
                  value={r.name}
                  onChange={(e) => {
                    const ingresos = [...(period.ingresos ?? [])];
                    ingresos[ri] = { ...r, name: e.target.value };
                    onChange(syncResultadoFromTables({ ...period, ingresos }));
                  }}
                />
                <input
                  type="number"
                  placeholder="0"
                  style={inp}
                  value={r.amount}
                  onChange={(e) => {
                    const ingresos = [...(period.ingresos ?? [])];
                    ingresos[ri] = { ...r, amount: Number(e.target.value) || 0 };
                    onChange(syncResultadoFromTables({ ...period, ingresos }));
                  }}
                />
                <input
                  type="number"
                  placeholder="0"
                  style={inp}
                  value={r.gasto ?? 0}
                  onChange={(e) => {
                    const ingresos = [...(period.ingresos ?? [])];
                    ingresos[ri] = { ...r, gasto: Number(e.target.value) || 0 };
                    onChange(syncResultadoFromTables({ ...period, ingresos }));
                  }}
                />
                <span
                  className="mono"
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 12,
                    textAlign: "right",
                    color: "var(--ink)",
                  }}
                >
                  {gananciaIngresoRow(r).toLocaleString("es-ES", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    const ingresos = (period.ingresos ?? []).filter((_, j) => j !== ri);
                    onChange(syncResultadoFromTables({ ...period, ingresos }));
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="filter-btn"
              style={{ marginTop: 8 }}
              onClick={() =>
                onChange(
                  syncResultadoFromTables({
                    ...period,
                    ingresos: [...(period.ingresos ?? []), { name: "", amount: 0, gasto: 0 }],
                  })
                )
              }
            >
              + Ingreso
            </button>
            <strong style={{ fontSize: 12, display: "block", marginTop: 18 }}>
              Transversales (gasto por área)
            </strong>
            <p
              style={{
                fontSize: 11,
                color: "var(--ink3)",
                marginTop: 6,
                marginBottom: 8,
                lineHeight: 1.45,
              }}
            >
              Filas fijas: mismo desglose que en la tarjeta Ingresos del reporte.
            </p>
            {normalizeTransversalRows(period.transversales).map((r, ti: number) => (
              <div
                key={r.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(100px, 1fr) 100px",
                  gap: 8,
                  marginTop: 6,
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--ink)" }}>{r.label}</span>
                <input
                  type="number"
                  placeholder="0"
                  style={inp}
                  value={r.gasto}
                  onChange={(e) => {
                    const rows = [...normalizeTransversalRows(period.transversales)];
                    rows[ti] = { ...r, gasto: Number(e.target.value) || 0 };
                    onChange({ ...period, transversales: rows });
                  }}
                />
              </div>
            ))}
          </div>
          <div>
            <strong style={{ fontSize: 12 }}>Gastos</strong>
            {(period.gastos ?? []).map((r: MoneyRow, gi: number) => (
              <div key={gi} style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  placeholder="Concepto"
                  style={{ ...inp, flex: 1 }}
                  value={r.name}
                  onChange={(e) => {
                    const gastos = [...(period.gastos ?? [])];
                    gastos[gi] = { ...r, name: e.target.value };
                    onChange(syncResultadoFromTables({ ...period, gastos }));
                  }}
                />
                <input
                  type="number"
                  placeholder="Importe"
                  style={{ ...inp, width: 120 }}
                  value={r.amount}
                  onChange={(e) => {
                    const gastos = [...(period.gastos ?? [])];
                    gastos[gi] = { ...r, amount: Number(e.target.value) || 0 };
                    onChange(syncResultadoFromTables({ ...period, gastos }));
                  }}
                />
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    const gastos = (period.gastos ?? []).filter((_, j) => j !== gi);
                    onChange(syncResultadoFromTables({ ...period, gastos }));
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="filter-btn"
              style={{ marginTop: 8 }}
              onClick={() =>
                onChange(
                  syncResultadoFromTables({
                    ...period,
                    gastos: [...(period.gastos ?? []), { name: "", amount: 0 }],
                  })
                )
              }
            >
              + Gasto
            </button>
          </div>
        </div>
      </div>

      <div className="pe-section">
        <h3 className="pe-h3">Resultado del período</h3>
        <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
          Se recalcula automáticamente al editar tablas de ingresos/gastos. Aquí puedes ajustarlo a mano o el texto
          de la nota.
        </p>
        <div className="pe-grid">
          {row(
            "Ingresos (resumen)",
            <input
              type="number"
              style={inp}
              value={period.resultado?.ingresos ?? 0}
              onChange={(e) =>
                update({
                  resultado: {
                    ...period.resultado,
                    ingresos: Number(e.target.value) || 0,
                    gastos: period.resultado?.gastos ?? 0,
                    resultado:
                      (Number(e.target.value) || 0) - (period.resultado?.gastos ?? 0),
                    note: period.resultado?.note ?? "",
                    positive:
                      (Number(e.target.value) || 0) - (period.resultado?.gastos ?? 0) >= 0,
                  },
                })
              }
            />
          )}
          {row(
            "Gastos (resumen)",
            <input
              type="number"
              style={inp}
              value={period.resultado?.gastos ?? 0}
              onChange={(e) =>
                update({
                  resultado: {
                    ...period.resultado,
                    ingresos: period.resultado?.ingresos ?? 0,
                    gastos: Number(e.target.value) || 0,
                    resultado:
                      (period.resultado?.ingresos ?? 0) - (Number(e.target.value) || 0),
                    note: period.resultado?.note ?? "",
                    positive:
                      (period.resultado?.ingresos ?? 0) - (Number(e.target.value) || 0) >= 0,
                  },
                })
              }
            />
          )}
          {row(
            "Resultado neto",
            <input
              type="number"
              style={inp}
              value={period.resultado?.resultado ?? 0}
              onChange={(e) =>
                update({
                  resultado: {
                    ...period.resultado,
                    ingresos: period.resultado?.ingresos ?? 0,
                    gastos: period.resultado?.gastos ?? 0,
                    resultado: Number(e.target.value) || 0,
                    note: period.resultado?.note ?? "",
                    positive: (Number(e.target.value) || 0) >= 0,
                  },
                })
              }
            />
          )}
          {row(
            "¿Positivo?",
            <label style={{ fontSize: 13 }}>
              <input
                type="checkbox"
                checked={period.resultado?.positive ?? true}
                onChange={(e) =>
                  update({
                    resultado: {
                      ...period.resultado,
                      ingresos: period.resultado?.ingresos ?? 0,
                      gastos: period.resultado?.gastos ?? 0,
                      resultado: period.resultado?.resultado ?? 0,
                      note: period.resultado?.note ?? "",
                      positive: e.target.checked,
                    },
                  })
                }
              />{" "}
              Sí
            </label>
          )}
          {row(
            "Nota",
            <textarea
              style={{ ...inp, minHeight: 72 }}
              value={period.resultado?.note ?? ""}
              onChange={(e) =>
                update({
                  resultado: {
                    ...period.resultado,
                    ingresos: period.resultado?.ingresos ?? 0,
                    gastos: period.resultado?.gastos ?? 0,
                    resultado: period.resultado?.resultado ?? 0,
                    note: e.target.value,
                    positive: period.resultado?.positive ?? true,
                  },
                })
              }
            />
          )}
        </div>
        <button type="button" className="filter-btn" onClick={() => onChange(syncResultadoFromTables(period))}>
          Recalcular resultado desde sumas de tablas
        </button>
      </div>
    </div>
  );
}

function emptyKpi(): KpiCard {
  return {
    label: "Nuevo KPI",
    value: "0",
    meta: "",
    progressPct: 0,
    variant: "amber",
  };
}
