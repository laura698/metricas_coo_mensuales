import { readFile } from "fs/promises";
import path from "path";
import type { MetricsFile } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "metrics.json");

export async function loadMetricsFromDisk(): Promise<MetricsFile> {
  const raw = await readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw) as MetricsFile;
}
