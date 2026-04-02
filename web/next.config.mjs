/** @type {import('next').NextConfig} */
// Si la app se publica bajo un subdirectorio (p. ej. https://dominio.com/metricas),
// define en el entorno: NEXT_BASE_PATH=/metricas
const basePath = (process.env.NEXT_BASE_PATH || "").replace(/\/$/, "") || undefined;

const nextConfig = {
  reactStrictMode: true,
  /** Server Actions: el JSON de métricas puede superar el límite por defecto (~1 MB). */
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
