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
  ingresos: IngresoProyectoRow[];
  /** Costes transversales por rol/área (misma sección visual que Ingresos). */
  transversales: TransversalRow[];
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
