import { NextResponse } from "next/server";
import {
  loadMetricsUnified,
  saveMetricsToBlob,
  validateMetricsFile,
} from "@/lib/metricsStore";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, source } = await loadMetricsUnified();
    return NextResponse.json(data, {
      headers: {
        "X-Metrics-Source": source,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudieron leer las métricas" }, { status: 500 });
  }
}

async function handleSave(req: Request) {
  const secret = process.env.SAVE_METRICS_SECRET;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const auth = req.headers.get("authorization");
  if (!secret || !token) {
    return NextResponse.json(
      {
        error:
          "Configura BLOB_READ_WRITE_TOKEN y SAVE_METRICS_SECRET en Vercel para guardar desde la web.",
      },
      { status: 501 }
    );
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!validateMetricsFile(body)) {
    return NextResponse.json(
      { error: "Estructura inválida: currentPeriodId y periods requeridos" },
      { status: 400 }
    );
  }
  try {
    const { url } = await saveMetricsToBlob(body);
    return NextResponse.json({ ok: true, url, source: "blob" as const });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo guardar en Blob" }, { status: 500 });
  }
}

/** Guardar métricas en Vercel Blob (sobrescribe el JSON central). */
export async function PUT(req: Request) {
  return handleSave(req);
}

/** Compatibilidad con clientes que usen POST. */
export async function POST(req: Request) {
  return handleSave(req);
}
