import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getMarketCounts } from "@/data/helpers";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for monitoring.
 * Returns system status, database connectivity, and data freshness.
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "degraded" | "down"; detail?: string }> = {};

  // 1. App is running
  checks.app = { status: "ok" };

  // 2. Check Supabase connectivity
  try {
    const { count, error } = await supabase
      .from("cities")
      .select("*", { count: "exact", head: true });
    if (error) {
      checks.database = { status: "degraded", detail: error.message };
    } else {
      checks.database = { status: "ok", detail: `${count} cities indexed` };
    }
  } catch {
    checks.database = { status: "down", detail: "Cannot reach Supabase" };
  }

  // 3. Data freshness
  const counts = getMarketCounts();
  checks.data = {
    status: counts.total > 1000 ? "ok" : "degraded",
    detail: `${counts.total} markets, ${counts.withFullData} with full data`,
  };

  // 4. Check cache health (recent analyses)
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("analysis_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo);
    checks.recentActivity = {
      status: (count ?? 0) > 0 ? "ok" : "degraded",
      detail: `${count ?? 0} analyses in last 24h`,
    };
  } catch {
    checks.recentActivity = { status: "degraded", detail: "Could not check" };
  }

  const overallStatus = Object.values(checks).some((c) => c.status === "down")
    ? "down"
    : Object.values(checks).some((c) => c.status === "degraded")
    ? "degraded"
    : "ok";

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: overallStatus === "down" ? 503 : 200 }
  );
}
