import { NextResponse } from "next/server";
import { buildMetricsWorkbookBuffer } from "@/lib/excelMonthSheets";
import { loadMetricsUnified } from "@/lib/metricsStore";

export const dynamic = "force-dynamic";

/** Descarga .xlsx: hoja `_Control` + una hoja por mes con todos los campos. */
export async function GET() {
  try {
    const { data } = await loadMetricsUnified();
    const buf = buildMetricsWorkbookBuffer(data);
    const filename = `metricas_coo_${data.currentPeriodId}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo generar el Excel" }, { status: 500 });
  }
}
