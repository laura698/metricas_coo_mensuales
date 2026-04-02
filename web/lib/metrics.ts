import { readFile } from "fs/promises";
import path from "path";
import type { MetricsFile } from "./types";

/** Intenta varias rutas: `cwd` suele ser la carpeta `web`, pero a veces es la raíz del repo. */
function metricsJsonCandidates(): string[] {
  return [
    path.join(process.cwd(), "data", "metrics.json"),
    path.join(process.cwd(), "web", "data", "metrics.json"),
  ];
}

export async function loadMetricsFromDisk(): Promise<MetricsFile> {
  let last: unknown;
  for (const DATA_PATH of metricsJsonCandidates()) {
    try {
      const raw = await readFile(DATA_PATH, "utf-8");
      return JSON.parse(raw) as MetricsFile;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
