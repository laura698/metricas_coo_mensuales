"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardClient from "@/components/DashboardClient";
import { normalizeMetricsFile } from "@/lib/normalizeMetrics";
import { getTrendSeries } from "@/lib/trend";
import type { MetricsFile } from "@/lib/types";

type Props = {
  /** Rellenado en el servidor: evita pantalla “Cargando…” si el cliente no puede hacer fetch. */
  initialData: MetricsFile | null;
  initialSource?: string;
};

export default function MetricsApp({ initialData, initialSource = "" }: Props) {
  const [data, setData] = useState<MetricsFile | null>(() => initialData);
  const [source, setSource] = useState<string>(() => initialSource);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  /** Por defecto el formulario visible: edición “normal”, sin JSON. */
  const [editOpen, setEditOpen] = useState(true);
  const [jsonDraft, setJsonDraft] = useState(() =>
    initialData ? JSON.stringify(initialData, null, 2) : ""
  );

  const dataRef = useRef<MetricsFile | null>(initialData);
  dataRef.current = data;

  const fetchMetrics = useCallback(async () => {
    setLoadErr(null);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 25_000);
    const apiUrl =
      typeof window !== "undefined" ? `${window.location.origin}/api/metrics` : "/api/metrics";
    try {
      const res = await fetch(apiUrl, { cache: "no-store", signal: ac.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as unknown;
      if (raw && typeof raw === "object" && "error" in raw && !("periods" in (raw as object))) {
        throw new Error(String((raw as { error?: string }).error ?? "error API"));
      }
      const j = normalizeMetricsFile(raw as MetricsFile);
      setData(j);
      setSource(res.headers.get("X-Metrics-Source") || "");
      setJsonDraft(JSON.stringify(j, null, 2));
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      const msg = aborted
        ? "Tiempo de espera agotado. Reintenta o revisa la red y variables (Blob). En local: npm run dev en la carpeta web."
        : "No se pudieron cargar las métricas desde el navegador. Si ya ves el tablero, puedes ignorar este aviso.";
      if (dataRef.current == null) {
        setLoadErr(msg);
      }
    } finally {
      clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const trend = useMemo(() => (data ? getTrendSeries(data) : { labels: [], entregas: [] }), [data]);

  async function saveToBlob(payload: MetricsFile) {
    setSaveMsg(null);
    if (!secret.trim()) {
      setSaveMsg("Escribe la contraseña de guardado (SAVE_METRICS_SECRET en el servidor).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/metrics", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret.trim()}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveMsg(typeof body.error === "string" ? body.error : "Error al guardar");
        return;
      }
      setData(payload);
      setJsonDraft(JSON.stringify(payload, null, 2));
      setSaveMsg("Cambios guardados correctamente en la nube.");
      setSource("blob");
      await fetchMetrics();
    } catch {
      setSaveMsg("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  }

  function applyJsonToBoard() {
    setSaveMsg(null);
    try {
      const parsed = normalizeMetricsFile(JSON.parse(jsonDraft) as MetricsFile);
      setData(parsed);
      setSaveMsg("JSON aplicado. Revisa el reporte y pulsa Guardar si quieres subirlo a la nube.");
    } catch {
      setSaveMsg("El JSON no es válido.");
    }
  }

  if (!data) {
    return (
      <div className="shell">
        <p style={{ marginBottom: 12 }}>{loadErr ?? "Cargando…"}</p>
        <p style={{ fontSize: 13, color: "var(--ink2)", maxWidth: 520, lineHeight: 1.5 }}>
          Si se queda aquí mucho rato: abre la consola (F12 → Consola) por si falla JavaScript, comprueba que entras con la
          URL del servidor (p. ej. <code>http://localhost:3000</code>) y no abriendo un fichero HTML suelto, y ejecuta{" "}
          <code>npm run dev</code> dentro de la carpeta <code>web</code>.
        </p>
        <button type="button" className="filter-btn active" style={{ marginTop: 14 }} onClick={() => fetchMetrics()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <DashboardClient
      data={data}
      trend={trend}
      editMode={editOpen}
      onDataChange={setData}
      toolbarAddon={
        <div style={{ width: "100%", marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, opacity: 0.85 }}>
              Origen: <strong>{source === "blob" ? "Vercel Blob" : "Repositorio (build)"}</strong>
            </span>
            <a
              href="/api/metrics/excel"
              className="filter-btn active"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Descargar Excel
            </a>
            <button
              type="button"
              className={`filter-btn${editOpen ? " active" : ""}`}
              onClick={() => setEditOpen((o) => !o)}
            >
              {editOpen ? "Ocultar formulario de edición" : "Editar métricas (formulario)"}
            </button>
          </div>
        </div>
      }
      afterEditorSlot={
        <div style={{ marginTop: 32, marginBottom: 20 }}>
          <div
            style={{
              padding: 16,
              background: "var(--surface2)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              maxWidth: 720,
            }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: "var(--ink)" }}>
              Guardar cambios en internet
            </h3>
            <p style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 0, lineHeight: 1.5 }}>
              Lo que ves en pantalla (gráficas y tablas) es lo que se sube. Solo necesario si despliegas en Vercel con
              Blob: variables <code style={{ fontSize: 11 }}>BLOB_READ_WRITE_TOKEN</code> y{" "}
              <code style={{ fontSize: 11 }}>SAVE_METRICS_SECRET</code>
              . En local puedes ignorar esto y editar <code style={{ fontSize: 11 }}>data/metrics.json</code>.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 10,
                marginTop: 14,
              }}
            >
              <label style={{ fontSize: 12, color: "var(--ink2)", margin: 0 }}>
                Contraseña de guardado
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
                placeholder="SAVE_METRICS_SECRET"
                style={{
                  display: "block",
                  boxSizing: "border-box",
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border2)",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                className="filter-btn active"
                disabled={saving}
                onClick={() => saveToBlob(data)}
                style={{
                  padding: "8px 18px",
                  fontSize: 14,
                  alignSelf: "flex-start",
                }}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
            {saveMsg && (
              <p
                style={{
                  fontSize: 13,
                  marginTop: 12,
                  color:
                    saveMsg.includes("correctamente") || saveMsg.includes("aplicado") || saveMsg.includes("Cambios guardados")
                      ? "var(--green)"
                      : "var(--red)",
                }}
              >
                {saveMsg}
              </p>
            )}
          </div>

          <details style={{ marginTop: 14, maxWidth: 720 }} className="tech-json-details">
            <summary
              style={{
                fontSize: 12,
                color: "var(--ink3)",
                cursor: "pointer",
                userSelect: "none",
                padding: "8px 0",
              }}
            >
              Solo técnicos · pegar o editar JSON crudo
            </summary>
            <div
              style={{
                marginTop: 10,
                padding: 12,
                background: "var(--surface)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <textarea
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight: 200,
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border2)",
                  marginBottom: 10,
                }}
              />
              <button type="button" className="filter-btn active" onClick={applyJsonToBoard}>
                Aplicar JSON al tablero
              </button>
              <button
                type="button"
                className="filter-btn"
                style={{ marginLeft: 8 }}
                onClick={() => setJsonDraft(JSON.stringify(data, null, 2))}
              >
                Descartar y cargar desde tablero
              </button>
            </div>
          </details>
        </div>
      }
    />
  );
}
