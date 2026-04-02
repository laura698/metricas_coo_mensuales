import type { PeriodBlock, SemaforoBlock } from "@/lib/types";

/** Parsea valores como "800 h", "662 h", "1200 h". */
export function parseHoursValue(s: string): number {
  const x = s.replace(/h/gi, "").replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : NaN;
}

export function parseHorasFromSemaforoBlock(s: SemaforoBlock | undefined): {
  est: number;
  real: number;
} | null {
  if (!s?.details?.length) return null;
  let est = NaN;
  let real = NaN;
  for (const d of s.details) {
    const k = d.key.toLowerCase();
    const v = parseHoursValue(d.value);
    if (/estimad/.test(k)) est = v;
    if (/real/.test(k)) real = v;
  }
  if (!Number.isFinite(est) || est <= 0 || !Number.isFinite(real) || real < 0) return null;
  return { est, real };
}

export function parseHorasFromSemaforo(period: PeriodBlock) {
  const s = period.semaforos.find((x) => x.id === "horas_est_real");
  return parseHorasFromSemaforoBlock(s);
}

/**
 * Torta complementaria al 100 %:
 * - Si reales ≤ estimadas: [ % del aro = reales/est, resto = margen no consumido ]
 * - Si reales > estimadas: [ % = estimadas/reales, resto = exceso sobre la estimación ]
 */
export function horasSlicesFromNumbers(est: number, real: number): [number, number] | null {
  if (!Number.isFinite(est) || est <= 0 || !Number.isFinite(real) || real < 0) return null;
  if (real <= est) {
    const a = (100 * real) / est;
    const r0 = Math.round(a * 100) / 100;
    return [r0, Math.round((100 - r0) * 100) / 100];
  }
  const a = (100 * est) / real;
  const r0 = Math.round(a * 100) / 100;
  return [r0, Math.round((100 - r0) * 100) / 100];
}
