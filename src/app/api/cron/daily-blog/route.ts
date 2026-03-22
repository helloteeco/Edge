import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily cron job: Generate a blog post draft and send review notification
 * Runs daily at 8am UTC (3am EST) via Vercel cron
 *
 * Steps run independently so one failure doesn't block the other:
 * 1. Generate a new blog post draft (with retry)
 * 2. Send review notification email to jeff@teeco.co
 */

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
      await new Promise((r) => setTimeout(r, delay));
      console.log(`[DailyBlog] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
    }
  }
  throw lastError;
}

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
    const authHeaders = cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {};

    // Step 1: Generate blog post (with retry)
    let generateData: Record<string, unknown> | null = null;
    let generateError: string | null = null;
    try {
      const generateRes = await fetchWithRetry(
        `${baseUrl}/api/admin/generate-blog?password=${ADMIN_PASSWORD}`,
        { method: "POST", headers: authHeaders },
      );
      generateData = await generateRes.json();
      if (!generateRes.ok) {
        generateError = String(generateData?.error || "Generation failed");
        console.error("[DailyBlog] Generation failed:", generateData);
      }
    } catch (err) {
      generateError = err instanceof Error ? err.message : "Generation failed after retries";
      console.error("[DailyBlog] Generation failed after retries:", err);
    }

    // Step 2: Send review notification (independent of step 1)
    let notifyData: Record<string, unknown> | null = null;
    let notifyError: string | null = null;
    try {
      const notifyRes = await fetch(`${baseUrl}/api/admin/blog-review?password=${ADMIN_PASSWORD}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "notify-review" }),
      });
      notifyData = await notifyRes.json();
    } catch (err) {
      notifyError = err instanceof Error ? err.message : "Notification failed";
      console.error("[DailyBlog] Notification failed:", err);
    }

    const success = !generateError;
    return NextResponse.json(
      {
        success,
        generated: generateData?.post ?? null,
        generateError,
        notification: notifyData,
        notifyError,
      },
      { status: success ? 200 : 207 } // 207 Multi-Status if partial failure
    );
  } catch (error) {
    console.error("[DailyBlog] Cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
