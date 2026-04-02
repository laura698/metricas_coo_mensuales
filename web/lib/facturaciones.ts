import type { FacturacionEstado, FacturacionRow } from "@/lib/types";

export const FACTURACION_ESTADO_LABELS: Record<FacturacionEstado, string> = {
  pendiente: "Pendientes por facturar",
  futuro: "Factura a Futuro",
  nuevo: "Proyecto Nuevo",
};

const ESTADOS: FacturacionEstado[] = ["pendiente", "futuro", "nuevo"];

export function parseFacturacionEstado(raw: unknown): FacturacionEstado {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "futuro" || s === "factura a futuro") return "futuro";
  if (s === "nuevo" || s === "proyecto nuevo") return "nuevo";
  if (
    s === "pendiente" ||
    s === "pendientes por facturar" ||
    s === "pendientes" ||
    s === "pendiente por facturar"
  ) {
    return "pendiente";
  }
  if (ESTADOS.includes(s as FacturacionEstado)) return s as FacturacionEstado;
  return "pendiente";
}

export function normalizeFacturaciones(rows: unknown): FacturacionRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      nombreProyecto: String(r.nombreProyecto ?? r.name ?? "").trim(),
      aFacturar: Math.max(0, Number(r.aFacturar ?? r.amount ?? 0) || 0),
      estado: parseFacturacionEstado(r.estado),
    };
  });
}
