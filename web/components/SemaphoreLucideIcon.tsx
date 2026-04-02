"use client";

import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarCheck,
  Clock,
  type LucideIcon,
  Star,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  entregas: CalendarCheck,
  riesgo: AlertTriangle,
  horas_est_real: Clock,
  satisfaccion: Star,
  cobros_pend: Banknote,
  margen_sem: BarChart3,
};

type Props = { semId: string; className?: string; size?: number };

export default function SemaphoreLucideIcon({ semId, className, size = 18 }: Props) {
  const Icon = MAP[semId] ?? BarChart3;
  return <Icon className={className} size={size} strokeWidth={2} aria-hidden />;
}
