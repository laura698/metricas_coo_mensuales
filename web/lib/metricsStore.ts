import { get, put } from "@vercel/blob";
import { loadMetricsFromDisk } from "@/lib/metrics";
import { normalizeMetricsFile } from "@/lib/normalizeMetrics";
import type { MetricsFile } from "@/lib/types";

/** Pathname fijo en Blob para lectura/escritura idempotente */
export function getBlobPathname(): string {
  return process.env.METRICS_BLOB_PATHNAME?.trim() || "coo-metricas/metrics.json";
}

/** Carpeta lógica para Excel en Blob: mismo prefijo que el JSON, subcarpeta `excel`. */
export function getExcelBlobPrefix(): string {
  const jsonPath = getBlobPathname();
  const i = jsonPath.lastIndexOf("/");
  const dir = i >= 0 ? jsonPath.slice(0, i) : "coo-metricas";
  return `${dir}/excel`;
}

function getBlobToken(): string | undefined {
  const t = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return t || undefined;
}

/** Almacenes Blob en Vercel pueden ser solo privados: `public` falla con error explícito del API. */
const BLOB_ACCESS = "private" as const;

export async function saveExcelBufferToBlob(pathname: string, buffer: Buffer): Promise<{ url: string }> {
  const token = getBlobToken();
  if (!token) {
    throw new Error("Falta BLOB_READ_WRITE_TOKEN");
  }
  const blob = await put(pathname, buffer, {
    access: BLOB_ACCESS,
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return { url: blob.url };
}

export type MetricsSource = "blob" | "repo";

const BLOB_FETCH_MS = 12_000;
const BLOB_TOTAL_MS = 15_000;

async function tryLoadFromBlobInner(token: string): Promise<MetricsFile | null> {
  try {
    const pathname = getBlobPathname();
    const ac = new AbortController();
    const kill = setTimeout(() => ac.abort(), BLOB_FETCH_MS);
    try {
      const result = await get(pathname, {
        access: BLOB_ACCESS,
        token,
        abortSignal: ac.signal,
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as MetricsFile;
    } finally {
      clearTimeout(kill);
    }
  } catch {
    return null;
  }
}

async function tryLoadFromBlob(token: string): Promise<MetricsFile | null> {
  return Promise.race([
    tryLoadFromBlobInner(token),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), BLOB_TOTAL_MS)),
  ]);
}

/**
 * Producción: si existe `BLOB_READ_WRITE_TOKEN` y el objeto en Blob, se usa ese JSON.
 * Si la red al Blob falla o supera el tiempo máximo, se usa `data/metrics.json` del despliegue.
 */
export async function loadMetricsUnified(): Promise<{ data: MetricsFile; source: MetricsSource }> {
  const token = getBlobToken();
  if (token) {
    const fromBlob = await tryLoadFromBlob(token);
    if (fromBlob) {
      return { data: normalizeMetricsFile(fromBlob), source: "blob" };
    }
  }
  const data = normalizeMetricsFile(await loadMetricsFromDisk());
  return { data, source: "repo" };
}

export async function saveMetricsToBlob(data: MetricsFile): Promise<{ url: string }> {
  const token = getBlobToken();
  if (!token) {
    throw new Error("Falta BLOB_READ_WRITE_TOKEN");
  }
  const json = JSON.stringify(data);
  const blob = await put(getBlobPathname(), json, {
    access: BLOB_ACCESS,
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return { url: blob.url };
}

/** Validación mínima antes de guardar */
export function validateMetricsFile(x: unknown): x is MetricsFile {
  if (!x || typeof x !== "object") return false;
  const o = x as MetricsFile;
  if (typeof o.currentPeriodId !== "string" || !o.currentPeriodId) return false;
  if (!o.periods || typeof o.periods !== "object") return false;
  if (!o.periods[o.currentPeriodId]) return false;
  return true;
}
