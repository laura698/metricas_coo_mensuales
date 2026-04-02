/** @type {import('next').NextConfig} */
// Si la app se publica bajo un subdirectorio (p. ej. https://dominio.com/metricas),
// define en el entorno: NEXT_BASE_PATH=/metricas
const basePath = (process.env.NEXT_BASE_PATH || "").replace(/\/$/, "") || undefined;

const nextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
