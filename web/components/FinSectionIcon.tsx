"use client";

import { DollarSign, TrendingDown, TrendingUp, Users } from "lucide-react";

const MAP = {
  pm: Users,
  facturacion: DollarSign,
  ingresos: TrendingUp,
  gastos: TrendingDown,
} as const;

export type FinSectionIconVariant = keyof typeof MAP;

type Props = {
  variant: FinSectionIconVariant;
  /** Tamaño del icono en px (por defecto 18). */
  size?: number;
};

/** Icono Lucide unificado para cabeceras de tarjetas financieras / tablas. */
export default function FinSectionIcon({ variant, size = 18 }: Props) {
  const Icon = MAP[variant];
  return (
    <span className={`fin-icon fin-icon--${variant}`} aria-hidden>
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
