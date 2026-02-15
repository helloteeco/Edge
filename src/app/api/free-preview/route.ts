import { NextRequest, NextResponse } from "next/server";
import { checkFreePreview, recordFreePreview, logCreditTransaction } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET - Check if this IP has already used their free preview
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`free-preview-check:${clientIP}`, RATE_LIMITS.relaxed);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const result = await checkFreePreview(clientIP);
    
    return NextResponse.json({
      success: true,
      used: result.used,
      count: result.count,
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
    const rateLimitResult = rateLimit(`free-preview-record:${clientIP}`, { windowMs: 24 * 60 * 60 * 1000, maxRequests: 2 });
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

    await recordFreePreview(clientIP, address, fingerprint);
    
    // Log for audit trail
    await logCreditTransaction({
      email: `anonymous-${clientIP}`,
      action: 'free_preview',
      amount: 0,
      reason: 'Free preview used',
      ipAddress: clientIP,
      address: address || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FreePreview] Record error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
