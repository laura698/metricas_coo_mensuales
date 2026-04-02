import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

/** Fuentes vía next/font: no dependen de fonts.googleapis.com (evita bloqueos y fallos de estilo). */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reporte operativo · Métricas COO",
  description: "Panel de control COO · DClick Soluciones",
};

/** Debe coincidir con `next.config.mjs` (`NEXT_BASE_PATH`) para que el enlace al CSS de respaldo funcione. */
const basePath = (process.env.NEXT_BASE_PATH || "").replace(/\/$/, "");

export default function RootLayout({ children }: { children: ReactNode }) {
  const themeFallbackHref = `${basePath}/api/theme-css`;
  return (
    <html lang="es" className={`${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <link rel="stylesheet" href={themeFallbackHref} />
      </head>
      {/*
        Estilos críticos inline: si globals.css no llega (caché .next corrupta, basePath mal configurado),
        la página no queda en blanco puro. El resto sigue en ./globals.css + /api/theme-css.
      */}
      {/*
        No fijar color/fondo aquí: el modo oscuro usa variables en globals.css; inline ganaría a eso y dejaría texto oscuro sobre tarjetas oscuras.
      */}
      <body className={dmSans.className} style={{ fontSize: 14, lineHeight: 1.6, minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
