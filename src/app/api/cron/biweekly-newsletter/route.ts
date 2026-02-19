import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Biweekly cron job: Send newsletter to subscribers
 * Runs every other Monday at 14:00 UTC (9am EST) via Vercel cron
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = request.nextUrl.origin;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

    const res = await fetch(`${baseUrl}/api/admin/send-newsletter?password=${ADMIN_PASSWORD}`, {
      method: "POST",
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    });

    const data = await res.json();

    return NextResponse.json({
      success: true,
      newsletter: data,
    });
  } catch (error) {
    console.error("[BiweeklyNewsletter] Cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
