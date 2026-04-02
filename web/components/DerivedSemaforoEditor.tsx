"use client";

import type { ReactNode } from "react";
import { recalcPeriodSemaforos } from "@/lib/semaforoDerived";
import type { PeriodBlock, SemaforoBlock, SemaforoDetail } from "@/lib/types";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border2)",
  fontFamily: "inherit",
  fontSize: 13,
};

function mergeDetailKey(details: SemaforoDetail[] | undefined, key: string, value: string): SemaforoDetail[] {
  const m = new Map((details ?? []).map((d) => [d.key, d.value]));
  m.set(key, value);
  return Array.from(m.entries()).map(([k, v]) => ({ key: k, value: v }));
}

function row(label: string, node: ReactNode) {
  return (
    <>
      <label style={{ fontSize: 12, color: "var(--ink2)" }}>{label}</label>
      <div>{node}</div>
    </>
  );
}

type Props = {
  period: PeriodBlock;
  si: number;
  s: SemaforoBlock;
  onChange: (next: PeriodBlock) => void;
};

export default function DerivedSemaforoEditor({ period, si, s, onChange }: Props) {
  const applyDetails = (details: SemaforoDetail[]) => {
    const semaforos = [...(period.semaforos ?? [])];
    semaforos[si] = { ...semaforos[si], details };
    onChange(recalcPeriodSemaforos({ ...period, semaforos }));
  };

  const dv = (key: string) => s.details?.find((x) => x.key === key)?.value ?? "";

  const autoBox = (
    <div
      style={{
        background: "var(--surface2)",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 12,
        lineHeight: 1.6,
        border: "1px solid var(--border)",
      }}
    >
      <div>
        <span className="muted-inline-label">Cabecera (auto):</span> {s.headline}
      </div>
      <div>
        <span className="muted-inline-label">Estado (auto):</span> {s.statusLabel} · {s.status}
      </div>
      {s.progressBar && (
        <div>
          <span className="muted-inline-label">Barra (auto):</span> {Math.round(s.progressBar.fillPct)}% —{" "}
          {s.progressBar.labelRight}
        </div>
      )}
    </div>
  );

  const titleCadence = (
    <div className="pe-grid" style={{ marginBottom: 12 }}>
      {row(
        "Título",
        <input
          style={inp}
          value={s.title}
          onChange={(e) => {
            const semaforos = [...(period.semaforos ?? [])];
            semaforos[si] = { ...s, title: e.target.value };
            onChange(recalcPeriodSemaforos({ ...period, semaforos }));
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
            onChange(recalcPeriodSemaforos({ ...period, semaforos }));
          }}
        />
      )}
    </div>
  );

  switch (s.id) {
    case "entregas":
      return (
        <>
          <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Editá totales y desglose; el % a tiempo, la cabecera y la barra se calculan solos.
          </p>
          {titleCadence}
          {autoBox}
          <div className="pe-grid">
            {row(
              "Entregas totales",
              <input
                type="number"
                min={0}
                style={inp}
                value={dv("Entregas totales")}
                onChange={(e) => applyDetails(mergeDetailKey(s.details, "Entregas totales", e.target.value))}
              />
            )}
            {row(
              "Entregadas a tiempo",
              <input
                type="number"
                min={0}
                style={inp}
                value={dv("Entregadas a tiempo")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "Entregadas a tiempo", e.target.value))
                }
              />
            )}
            {row(
              "Con retraso",
              <input
                type="number"
                min={0}
                style={inp}
                value={dv("Con retraso")}
                onChange={(e) => applyDetails(mergeDetailKey(s.details, "Con retraso", e.target.value))}
              />
            )}
          </div>
        </>
      );
    case "riesgo":
      return (
        <>
          <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            La cabecera muestra el valor de «En riesgo de retraso»; estado según umbrales.
          </p>
          {titleCadence}
          {autoBox}
          <div className="pe-grid">
            {row(
              "Proyectos activos",
              <input
                type="number"
                min={0}
                style={inp}
                value={dv("Proyectos activos")}
                onChange={(e) => applyDetails(mergeDetailKey(s.details, "Proyectos activos", e.target.value))}
              />
            )}
            {row(
              "En riesgo de retraso",
              <input
                type="number"
                min={0}
                style={inp}
                value={dv("En riesgo de retraso")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "En riesgo de retraso", e.target.value))
                }
              />
            )}
            {row(
              "En riesgo de sobrecosto",
              <input
                type="number"
                min={0}
                style={inp}
                value={dv("En riesgo de sobrecosto")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "En riesgo de sobrecosto", e.target.value))
                }
              />
            )}
            {row(
              "En riesgo de calidad",
              <input
                type="number"
                min={0}
                style={inp}
                value={dv("En riesgo de calidad")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "En riesgo de calidad", e.target.value))
                }
              />
            )}
          </div>
        </>
      );
    case "horas_est_real":
      return (
        <>
          <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Estimado y reales en formato «800 h». Desviación y cabecera se calculan.
          </p>
          {titleCadence}
          {autoBox}
          <div className="pe-grid">
            {row(
              "Horas estimadas (mes)",
              <input
                style={inp}
                placeholder="800 h"
                value={dv("Horas estimadas (mes)")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "Horas estimadas (mes)", e.target.value))
                }
              />
            )}
            {row(
              "Horas reales (mes)",
              <input
                style={inp}
                placeholder="662 h"
                value={dv("Horas reales (mes)")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "Horas reales (mes)", e.target.value))
                }
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 8 }}>
            Desviación (auto): {dv("Desviación")}
          </div>
        </>
      );
    case "satisfaccion":
      return (
        <>
          <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Nota media 1–5 para la cabecera «X/5»; clientes y tendencia son texto libre.
          </p>
          {titleCadence}
          {autoBox}
          <div className="pe-grid">
            {row(
              "Clientes evaluados",
              <input
                style={inp}
                value={dv("Clientes evaluados")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "Clientes evaluados", e.target.value))
                }
              />
            )}
            {row(
              "Tendencia",
              <input
                style={inp}
                value={dv("Tendencia")}
                onChange={(e) => applyDetails(mergeDetailKey(s.details, "Tendencia", e.target.value))}
              />
            )}
            {row(
              "Nota media (1-5)",
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                style={inp}
                value={dv("Nota media (1-5)").replace(",", ".")}
                onChange={(e) =>
                  applyDetails(
                    mergeDetailKey(
                      s.details,
                      "Nota media (1-5)",
                      e.target.value.replace(".", ",")
                    )
                  )
                }
              />
            )}
          </div>
        </>
      );
    case "cobros_pend": {
      const projects = (s.details ?? []).filter((d) => d.key !== "Facturas pendientes");
      const fp = s.details?.find((d) => d.key === "Facturas pendientes")?.value ?? "0";
      return (
        <>
          <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Importes por proyecto; total y nº de facturas se calculan.
          </p>
          {titleCadence}
          {autoBox}
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <span className="muted-inline-label">Facturas pendientes (auto):</span> {fp}
          </div>
          {projects.map((d, pi) => (
            <div key={pi} style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="Proyecto"
                value={d.key}
                onChange={(e) => {
                  const next = projects.map((r, j) => (j === pi ? { ...r, key: e.target.value } : r));
                  applyDetails(next);
                }}
              />
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="600 $"
                value={d.value}
                onChange={(e) => {
                  const next = projects.map((r, j) => (j === pi ? { ...r, value: e.target.value } : r));
                  applyDetails(next);
                }}
              />
              <button
                type="button"
                className="filter-btn"
                onClick={() => {
                  const next = projects.filter((_, j) => j !== pi);
                  applyDetails(next);
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
            onClick={() => applyDetails([...projects, { key: "", value: "0 $" }])}
          >
            + Proyecto / importe
          </button>
        </>
      );
    }
    case "margen_sem":
      return (
        <>
          <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Ingresos y costos; margen $, % y cabecera se calculan.
          </p>
          {titleCadence}
          {autoBox}
          <div className="pe-grid">
            {row(
              "Ingresos",
              <input
                style={inp}
                placeholder="13.665 $"
                value={dv("Ingresos")}
                onChange={(e) => applyDetails(mergeDetailKey(s.details, "Ingresos", e.target.value))}
              />
            )}
            {row(
              "Costos operativos",
              <input
                style={inp}
                placeholder="12.662 $"
                value={dv("Costos operativos")}
                onChange={(e) =>
                  applyDetails(mergeDetailKey(s.details, "Costos operativos", e.target.value))
                }
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 8 }}>
            <span className="muted-inline-label">Margen % (auto):</span> {dv("Margen %")}
          </div>
        </>
      );
    default:
      return null;
  }
}
