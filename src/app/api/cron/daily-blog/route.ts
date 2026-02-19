import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily cron job: Generate a blog post draft and send review notification
 * Runs daily at 8am UTC (3am EST) via Vercel cron
 * 
 * This endpoint chains two operations:
 * 1. Generate a new blog post draft
 * 2. Send review notification email to jeff@teeco.co
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = request.nextUrl.origin;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

    // Step 1: Generate blog post
    const generateRes = await fetch(`${baseUrl}/api/admin/generate-blog?password=${ADMIN_PASSWORD}`, {
      method: "POST",
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    });

    const generateData = await generateRes.json();

    if (!generateRes.ok) {
      console.error("[DailyBlog] Generation failed:", generateData);
      return NextResponse.json({
        success: false,
        step: "generate",
        error: generateData.error,
      }, { status: 500 });
    }

    // Step 2: Send review notification
    const notifyRes = await fetch(`${baseUrl}/api/admin/blog-review?password=${ADMIN_PASSWORD}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
      body: JSON.stringify({ action: "notify-review" }),
    });

    const notifyData = await notifyRes.json();

    return NextResponse.json({
      success: true,
      generated: generateData.post,
      notification: notifyData,
    });
  } catch (error) {
    console.error("[DailyBlog] Cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
