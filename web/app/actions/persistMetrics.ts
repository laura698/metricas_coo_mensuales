"use server";

import {
  buildMetricsWorkbookBuffer,
  buildMetricsWorkbookForSinglePeriod,
} from "@/lib/excelMonthSheets";
import { normalizeMetricsFile } from "@/lib/normalizeMetrics";
import {
  getExcelBlobPrefix,
  saveExcelBufferToBlob,
  saveMetricsToBlob,
  validateMetricsFile,
} from "@/lib/metricsStore";
import type { MetricsFile } from "@/lib/types";

function safePeriodFilename(periodId: string): string {
  return periodId.replace(/[/\\?*[\]:]/g, "-").trim() || "mes";
}

export type PersistMetricsResult =
  | { ok: true; excelFullUrl: string; excelMonthUrl: string }
  | { ok: false; error: string };

/**
 * Guarda JSON en Vercel Blob y dos Excel: libro completo + libro solo con el mes indicado.
 * Requiere BLOB_READ_WRITE_TOKEN en el servidor (sin exponer al navegador).
 */
export async function persistMetricsToCloud(
  metrics: unknown,
  periodIdForExcel: string
): Promise<PersistMetricsResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, error: "Falta BLOB_READ_WRITE_TOKEN en el servidor (Vercel)." };
  }
  if (!validateMetricsFile(metrics)) {
    return { ok: false, error: "Estructura de datos inválida." };
  }
  const data = normalizeMetricsFile(metrics as MetricsFile);
  if (!periodIdForExcel || !data.periods[periodIdForExcel]) {
    return { ok: false, error: "El mes indicado no existe en los datos." };
  }

  const prefix = getExcelBlobPrefix();
  const fullPath = `${prefix}/metricas_coo_completo.xlsx`;
  const monthPath = `${prefix}/mes-${safePeriodFilename(periodIdForExcel)}.xlsx`;

  try {
    await saveMetricsToBlob(data);

    const fullBuf = buildMetricsWorkbookBuffer(data);
    const { url: excelFullUrl } = await saveExcelBufferToBlob(fullPath, fullBuf);

    const monthBuf = buildMetricsWorkbookForSinglePeriod(data, periodIdForExcel);
    const { url: excelMonthUrl } = await saveExcelBufferToBlob(monthPath, monthBuf);

    return { ok: true, excelFullUrl, excelMonthUrl };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: "No se pudo guardar en el almacenamiento. Revisa el token y la cuota de Blob.",
    };
  }
}
