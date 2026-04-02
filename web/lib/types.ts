export type StatusTone = "green" | "amber" | "red";

export type KpiCard = {
  label: string;
  value: string;
  meta: string;
  progressPct: number;
  variant: StatusTone;
};

export type SemaforoDetail = { key: string; value: string };

export type SemaforoBlock = {
  id: string;
  title: string;
  cadence: string;
  headline: string;
  status: StatusTone;
  statusLabel: string;
  progressBar?: { fillPct: number; labelRight: string; minLabel?: string; midLabel?: string; maxLabel?: string };
  details: SemaforoDetail[];
  note?: string;
  noteTone?: StatusTone;
};

export type ProjectRow = {
  name: string;
  client: string;
  status: "verde" | "amarillo" | "rojo";
};

export type MoneyRow = {
  name: string;
  amount: number;
};

/** Fila de ingresos por proyecto/cliente (tabla del dashboard). */
export type IngresoProyectoRow = {
  name: string;
  amount: number;
  /** Gasto asignado a esa línea (proyecto/cliente). */
  gasto?: number;
};

/** Gasto transversal por área (tabla dentro de la tarjeta Ingresos). */
export type TransversalRow = {
  label: string;
  gasto: number;
};

/** Evaluación de Project Manager por persona (tabla tras métricas de equipo). */
export type ProjectManagerEvalRow = {
  nombre: string;
  cantidadProyectos: number;
  proyectosAsignados: string[];
  /** Puntuación de rendimiento y carga en escala 5–10. */
  rendimientoCarga: number;
  evaluacion: string;
};

/** Estado de línea en tabla Facturaciones (tras listado de proyectos). */
export type FacturacionEstado = "pendiente" | "futuro" | "nuevo";

export type FacturacionRow = {
  nombreProyecto: string;
  aFacturar: number;
  estado: FacturacionEstado;
};

export type PeriodBlock = {
  label: string;
  footerTitle: string;
  kpis: KpiCard[];
  semaforos: SemaforoBlock[];
  charts: {
    util: [number, number];
    entregas: [number, number];
    retraso: [number, number];
    /** Torta horas estimadas vs reales (dos porcentajes que suman 100). */
    horasEstReal: [number, number];
  };
  chartSubtitles: {
    entregas: string;
    retraso: string;
    horasEstReal: string;
  };
  projects: ProjectRow[];
  projectFilterCounts: { all: number; verde: number; amarillo: number; rojo: number };
  /** Facturaciones pendientes / futuras por proyecto. */
  facturaciones: FacturacionRow[];
  ingresos: IngresoProyectoRow[];
  /** Costes transversales por rol/área (misma sección visual que Ingresos). */
  transversales: TransversalRow[];
  /** Evaluación de PM: nombre, cantidad, proyectos asignados y evaluación. */
  pmEvaluaciones: ProjectManagerEvalRow[];
  gastos: MoneyRow[];
  resultado: {
    ingresos: number;
    gastos: number;
    resultado: number;
    note: string;
    positive: boolean;
  };
};

export type MetricsFile = {
  currentPeriodId: string;
  periods: Record<string, PeriodBlock>;
};
