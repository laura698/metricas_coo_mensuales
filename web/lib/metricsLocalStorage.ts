import { normalizeMetricsFile } from "@/lib/normalizeMetrics";
import type { MetricsFile } from "@/lib/types";

const STORAGE_KEY = "dclick-metricas-coo-v1";

type StoredPayload = {
  v: 1;
  savedAt: number;
  metrics: MetricsFile;
};

export function loadMetricsFromBrowser(): { metrics: MetricsFile; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (parsed.v !== 1 || !parsed.metrics || typeof parsed.savedAt !== "number") return null;
    return {
      metrics: normalizeMetricsFile(parsed.metrics),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveMetricsToBrowser(metrics: MetricsFile): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPayload = { v: 1, savedAt: Date.now(), metrics };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("No se pudo guardar en localStorage (cuota o modo privado).", e);
  }
}

export function clearMetricsFromBrowser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
