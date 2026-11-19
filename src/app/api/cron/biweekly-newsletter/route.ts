import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Twice-weekly cron job: Send newsletter to subscribers
 * Runs Tuesday and Thursday at 15:00 UTC (10am EST) via Vercel cron
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!cronSecret && !adminPassword) {
      return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 500 });
    }

    const baseUrl = request.nextUrl.origin;
    const forwardHeaders: Record<string, string> = {};
    if (cronSecret) forwardHeaders.Authorization = `Bearer ${cronSecret}`;
    const passwordQuery = adminPassword ? `?password=${encodeURIComponent(adminPassword)}` : "";

    const res = await fetch(`${baseUrl}/api/admin/send-newsletter${passwordQuery}`, {
      method: "POST",
      headers: forwardHeaders,
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
