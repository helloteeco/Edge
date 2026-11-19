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

    // Step 1: Generate blog post
    const generateRes = await fetch(`${baseUrl}/api/admin/generate-blog${passwordQuery}`, {
      method: "POST",
      headers: forwardHeaders,
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
    const notifyRes = await fetch(`${baseUrl}/api/admin/blog-review${passwordQuery}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...forwardHeaders,
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
