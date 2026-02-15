import { NextRequest, NextResponse } from "next/server";
import { getUserCredits, deductCredit, addCredits, refundCredit, logCreditTransaction } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Stricter rate limit for refunds (max 5 per 10 minutes per IP)
const REFUND_RATE_LIMIT = { limit: 5, windowSeconds: 600 };

// GET - Check user's credit balance
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`credits-get:${clientIP}`, RATE_LIMITS.relaxed);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const email = request.nextUrl.searchParams.get("email");
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }
    
    const credits = await getUserCredits(email);
    
    if (!credits) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      credits: {
        used: credits.credits_used,
        limit: credits.credits_limit,
        remaining: credits.credits_remaining,
      },
    });
  } catch (error) {
    console.error("Error checking credits:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Deduct, refund, or add credits
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Rate limiting for credit operations (per IP)
    const rateLimitResult = await rateLimit(`credits-post:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { email, action, address } = body;
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Per-email rate limit to prevent abuse (max 10 credit ops per 5 min per email)
    const emailRateLimit = await rateLimit(`credits-email:${email.toLowerCase().trim()}`, { limit: 10, windowSeconds: 300 });
    if (!emailRateLimit.success) {
      console.warn(`[Credits] Per-email rate limit hit for ${email} from IP ${clientIP}`);
      return NextResponse.json({ success: false, error: "Too many credit operations" }, { status: 429 });
    }
    
    if (action === "deduct") {
      // Get credits before for audit trail
      const creditsBefore = await getUserCredits(email);
      const result = await deductCredit(email);
      
      // Log the transaction regardless of success
      await logCreditTransaction({
        email,
        action: 'deduct',
        amount: 1,
        creditsBefore: creditsBefore?.credits_remaining ?? 0,
        creditsAfter: result.remaining,
        reason: result.success ? 'Analysis deduction' : `Failed: ${result.error}`,
        ipAddress: clientIP,
        address: address || undefined,
      });
      
      if (!result.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: result.error,
            remaining: result.remaining,
            needsUpgrade: result.remaining <= 0,
          },
          { status: result.error === "No credits remaining" ? 402 : 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        remaining: result.remaining,
      });
    }
    
    // Refund action — stricter rate limiting
    if (action === "refund") {
      // Extra rate limit specifically for refunds (prevent refund spam)
      const refundRateResult = await rateLimit(`credits-refund:${clientIP}`, REFUND_RATE_LIMIT);
      if (!refundRateResult.success) {
        console.warn(`[Credits] Refund rate limit hit from IP ${clientIP} for ${email}`);
        return NextResponse.json({ success: false, error: "Too many refund requests" }, { status: 429 });
      }

      // Also rate limit refunds per email (max 3 per 10 min)
      const emailRefundLimit = await rateLimit(`credits-refund-email:${email.toLowerCase().trim()}`, { limit: 3, windowSeconds: 600 });
      if (!emailRefundLimit.success) {
        console.warn(`[Credits] Per-email refund rate limit hit for ${email}`);
        return NextResponse.json({ success: false, error: "Too many refund requests" }, { status: 429 });
      }

      const creditsBefore = await getUserCredits(email);
      const result = await refundCredit(email);
      
      // Log the refund transaction
      await logCreditTransaction({
        email,
        action: 'refund',
        amount: 1,
        creditsBefore: creditsBefore?.credits_remaining ?? 0,
        creditsAfter: result.remaining,
        reason: body.reason || 'Cache hit auto-refund',
        ipAddress: clientIP,
        address: address || undefined,
      });
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, remaining: result.remaining },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        remaining: result.remaining,
        message: "Credit refunded",
      });
    }
    
    // Admin action to add credits (called by Stripe webhook)
    if (action === "add") {
      const { amount, adminKey } = body;
      
      // Admin key check - MUST be set in environment variables
      if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
        console.warn(`[Credits] Unauthorized add attempt from IP ${clientIP} for ${email}`);
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      if (!amount || amount <= 0 || amount > 1000) {
        return NextResponse.json(
          { success: false, error: "Invalid amount" },
          { status: 400 }
        );
      }
      
      const creditsBefore = await getUserCredits(email);
      const result = await addCredits(email, amount);
      
      // Log the add transaction
      await logCreditTransaction({
        email,
        action: 'add',
        amount,
        creditsBefore: creditsBefore?.credits_remaining ?? 0,
        creditsAfter: result.success ? (creditsBefore?.credits_remaining ?? 0) + amount : creditsBefore?.credits_remaining ?? 0,
        reason: body.reason || 'Credit purchase',
        ipAddress: clientIP,
      });
      
      return NextResponse.json({
        success: result.success,
        new_limit: result.new_limit,
      });
    }
    
    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing credit action:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
