import { NextRequest, NextResponse } from "next/server";
import { checkFreePreview, recordFreePreview, logCreditTransaction, getDailyFreePreviewCount } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Site-wide daily cap for free previews (prevents cost exposure if site goes viral)
const DAILY_FREE_PREVIEW_CAP = 75;

// GET - Check if this IP has already used their free preview
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`free-preview-check:${clientIP}`, RATE_LIMITS.relaxed);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const result = await checkFreePreview(clientIP);
    
    // Also check if daily cap has been reached (so UI can show appropriate messaging)
    let dailyCapReached = false;
    if (!result.used) {
      const dailyCount = await getDailyFreePreviewCount();
      dailyCapReached = dailyCount >= DAILY_FREE_PREVIEW_CAP;
    }
    
    return NextResponse.json({
      success: true,
      used: result.used,
      count: result.count,
      dailyCapReached,
    });
  } catch (error) {
    console.error("[FreePreview] Check error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// POST - Record that this IP used their free preview
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Strict rate limit — only 2 free preview records per IP ever (in 24h window)
    const rateLimitResult = await rateLimit(`free-preview-record:${clientIP}`, { limit: 2, windowSeconds: 86400 });
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Free preview limit reached" }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { address, fingerprint } = body;

    // Check if already used
    const existing = await checkFreePreview(clientIP);
    if (existing.used) {
      return NextResponse.json({
        success: false,
        error: "Free preview already used from this network",
        alreadyUsed: true,
      });
    }

    // DAILY CAP: Check site-wide daily free preview limit
    const dailyCount = await getDailyFreePreviewCount();
    if (dailyCount >= DAILY_FREE_PREVIEW_CAP) {
      return NextResponse.json({
        success: false,
        error: "Daily free analysis limit reached. Free analyses reset at midnight UTC. Purchase credits for unlimited access.",
        dailyCapReached: true,
      });
    }

    await recordFreePreview(clientIP, address, fingerprint);
    
    // Log for audit trail
    await logCreditTransaction({
      email: `anonymous-${clientIP}`,
      action: 'free_preview',
      amount: 0,
      reason: `Free preview used (daily count: ${dailyCount + 1}/${DAILY_FREE_PREVIEW_CAP})`,
      ipAddress: clientIP,
      address: address || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FreePreview] Record error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
