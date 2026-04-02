"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { persistMetricsToCloud } from "@/app/actions/persistMetrics";
import DashboardClient from "@/components/DashboardClient";
import {
  clearMetricsFromBrowser,
  loadMetricsFromBrowser,
  saveMetricsToBrowser,
} from "@/lib/metricsLocalStorage";
import { normalizeMetricsFile } from "@/lib/normalizeMetrics";
import { getTrendSeries } from "@/lib/trend";
import type { MetricsFile } from "@/lib/types";

const AUTOSAVE_MS = 450;

type Props = {
  /** Rellenado en el servidor: evita pantalla “Cargando…” si el cliente no puede hacer fetch. */
  initialData: MetricsFile | null;
  initialSource?: string;
};

export default function MetricsApp({ initialData, initialSource = "" }: Props) {
  const [data, setData] = useState<MetricsFile | null>(() => initialData);
  const [source, setSource] = useState<string>(() => initialSource);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  /** Mes mostrado en el informe (selector de período); define qué hoja `mes-*.xlsx` se genera al guardar en nube. */
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    () => initialData?.currentPeriodId ?? ""
  );
  const [persisting, setPersisting] = useState(false);
  const [persistMsg, setPersistMsg] = useState<string | null>(null);
  const [persistExcelUrls, setPersistExcelUrls] = useState<{
    full: string;
    month: string;
  } | null>(null);
  /** Formulario de acordeones: cerrado hasta pulsar «Editar datos». */
  const [editOpen, setEditOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() =>
    initialData ? JSON.stringify(initialData, null, 2) : ""
  );

  const dataRef = useRef<MetricsFile | null>(initialData);
  dataRef.current = data;

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Línea base para detectar cambios sin guardar (JSON del tablero / último guardado local). */
  const baselineRef = useRef<string>(initialData ? JSON.stringify(initialData) : "");
  useEffect(() => {
    if (initialData) baselineRef.current = JSON.stringify(initialData);
  }, [initialData]);

  const isDirty = useMemo(() => {
    if (!data) return false;
    return JSON.stringify(data) !== baselineRef.current;
  }, [data]);

  const persistToBrowser = useCallback((metrics: MetricsFile) => {
    saveMetricsToBrowser(metrics);
    baselineRef.current = JSON.stringify(metrics);
    setJsonDraft(JSON.stringify(metrics, null, 2));
  }, []);

  const handleDataChange = useCallback(
    (next: MetricsFile) => {
      setData(next);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        persistToBrowser(next);
      }, AUTOSAVE_MS);
    },
    [persistToBrowser]
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const applyLocalSnapshot = useCallback((metrics: MetricsFile, label: string) => {
    const n = normalizeMetricsFile(metrics);
    setData(n);
    baselineRef.current = JSON.stringify(n);
    setSource(label);
    setJsonDraft(JSON.stringify(n, null, 2));
  }, []);

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
      const local = loadMetricsFromBrowser();
      if (local) {
        applyLocalSnapshot(local.metrics, "Copia en este navegador");
      } else {
        setData(j);
        baselineRef.current = JSON.stringify(j);
        const src = res.headers.get("X-Metrics-Source") || "";
        setSource(src === "blob" ? "Vercel Blob" : src === "repo" ? "Repositorio (build)" : src || "Servidor");
        setJsonDraft(JSON.stringify(j, null, 2));
      }
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      const msg = aborted
        ? "Tiempo de espera agotado. Reintenta o revisa la red. En local: npm run dev en la carpeta web."
        : "No se pudieron cargar las métricas desde el navegador. Si ya ves el tablero, puedes ignorar este aviso.";
      const local = loadMetricsFromBrowser();
      if (local && dataRef.current == null) {
        applyLocalSnapshot(local.metrics, "Copia en este navegador (sin conexión al servidor)");
      } else if (dataRef.current == null) {
        setLoadErr(msg);
      }
    } finally {
      clearTimeout(t);
    }
  }, [applyLocalSnapshot]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const trend = useMemo(() => (data ? getTrendSeries(data) : { labels: [], entregas: [] }), [data]);

  function applyJsonToBoard() {
    setSaveMsg(null);
    try {
      const parsed = normalizeMetricsFile(JSON.parse(jsonDraft) as MetricsFile);
      setData(parsed);
      persistToBrowser(parsed);
      setSaveMsg("JSON aplicado al tablero y guardado en el navegador.");
    } catch {
      setSaveMsg("El JSON no es válido.");
    }
  }

  async function persistToCloud() {
    if (!data) return;
    const periodId = selectedPeriodId || data.currentPeriodId;
    setPersisting(true);
    setPersistMsg(null);
    setPersistExcelUrls(null);
    try {
      const r = await persistMetricsToCloud(data, periodId);
      if (!r.ok) {
        setPersistMsg(r.error);
        return;
      }
      setPersistExcelUrls({ full: r.excelFullUrl, month: r.excelMonthUrl });
      setPersistMsg("Guardado persistente: JSON y Excel en Vercel Blob.");
      clearMetricsFromBrowser();
      baselineRef.current = JSON.stringify(data);
      setSource("Vercel Blob");
      await fetchMetrics();
    } catch (e) {
      setPersistMsg(e instanceof Error ? e.message : "Error al guardar en la nube.");
    } finally {
      setPersisting(false);
    }
  }

  const toggleEditPanel = useCallback(() => {
    setEditOpen((o) => {
      if (!o) {
        requestAnimationFrame(() =>
          document.getElementById("edicion-formulario")?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
      return !o;
    });
  }, []);

  const dismissPersistFeedback = useCallback(() => {
    setPersistMsg(null);
    setPersistExcelUrls(null);
  }, []);

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
      onDataChange={handleDataChange}
      dirty={isDirty}
      onSelectedPeriodChange={setSelectedPeriodId}
      stickyBarAddon={
        <>
          <div className="report-toolbar-row">
            <button
              type="button"
              className="report-sticky-btn report-sticky-btn--cloud"
              onClick={() => void persistToCloud()}
              disabled={persisting || !data}
              title="Sube JSON y Excel a Vercel Blob"
            >
              {persisting ? "Guardando…" : "Guardar en la nube"}
            </button>
            <a href="/api/metrics/excel" className="report-sticky-btn report-sticky-btn--export">
              Exportar
            </a>
            <button
              type="button"
              className={`report-sticky-btn${editOpen ? " report-sticky-btn--solid" : ""}`}
              onClick={() => toggleEditPanel()}
              aria-expanded={editOpen}
              title={editOpen ? "Ocultar el formulario de edición" : "Mostrar el formulario de edición debajo"}
            >
              {editOpen ? "Cerrar edición" : "Editar datos"}
            </button>
          </div>
          {(persistMsg || persistExcelUrls) && (
            <div
              className="report-sticky-persist-feedback report-sticky-persist-feedback--below"
              role="status"
            >
              <button
                type="button"
                className="report-sticky-persist-dismiss"
                onClick={dismissPersistFeedback}
                aria-label="Cerrar aviso de guardado"
                title="Cerrar"
              >
                ×
              </button>
              {persistMsg && <p className="report-sticky-persist-msg">{persistMsg}</p>}
              {persistExcelUrls && (
                <p className="report-sticky-persist-links">
                  Excel en la nube:{" "}
                  <a href={persistExcelUrls.full} target="_blank" rel="noreferrer">
                    libro completo
                  </a>
                  {" · "}
                  <a href={persistExcelUrls.month} target="_blank" rel="noreferrer">
                    solo mes {selectedPeriodId || data.currentPeriodId}
                  </a>
                  . Con almacén <strong>privado</strong>, el enlace puede no abrir en una pestaña nueva; descarga el
                  fichero desde el apartado Storage / Blob en Vercel si hace falta.
                </p>
              )}
            </div>
          )}
        </>
      }
      afterEditorSlot={
        <div style={{ marginTop: 32, marginBottom: 20 }}>
          <details style={{ maxWidth: 720 }} className="tech-json-details">
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
              {saveMsg && (
                <p
                  style={{
                    fontSize: 13,
                    marginTop: 12,
                    marginBottom: 0,
                    color:
                      saveMsg.includes("aplicado") && !saveMsg.includes("no es válido")
                        ? "var(--green)"
                        : "var(--red)",
                  }}
                >
                  {saveMsg}
                </p>
              )}
            </div>
          </details>
        </div>
      }
    />
  );
}
