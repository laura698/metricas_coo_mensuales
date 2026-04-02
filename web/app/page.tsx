import MetricsApp from "@/components/MetricsApp";
import { loadMetricsUnified } from "@/lib/metricsStore";
import type { MetricsFile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  let initialData: MetricsFile | null = null;
  let initialSource = "";
  try {
    const r = await loadMetricsUnified();
    initialData = r.data;
    initialSource = r.source;
  } catch (e) {
    console.error("loadMetricsUnified (SSR):", e);
  }

  return <MetricsApp initialData={initialData} initialSource={initialSource} />;
}
