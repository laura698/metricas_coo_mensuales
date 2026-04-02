import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { NextResponse } from "next/server";

/** Ruta a `app/globals.css` sin depender solo de `process.cwd()` (evita 500 si el cwd no es la carpeta `web`). */
function getGlobalsCssPathFromRoute(): string {
  const routeDir = dirname(fileURLToPath(import.meta.url));
  return join(routeDir, "..", "..", "globals.css");
}

/**
 * Mismo contenido que `app/globals.css`, servido por URL fija.
 * Respaldo si el CSS empaquetado en `_next/static` no carga (caché .next, basePath, proxy).
 */
export async function GET() {
  const fromRoute = getGlobalsCssPathFromRoute();
  const fromCwd = join(process.cwd(), "app", "globals.css");
  let css: string;
  try {
    css = await readFile(fromRoute, "utf8");
  } catch {
    try {
      css = await readFile(fromCwd, "utf8");
    } catch (e) {
      console.error("theme-css: no se pudo leer globals.css", { fromRoute, fromCwd, e });
      css = "/* theme-css: no se encontró app/globals.css; revisa la instalación. */\n";
    }
  }
  return new NextResponse(css, {
    status: 200,
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
