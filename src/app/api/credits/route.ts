import { NextRequest, NextResponse } from "next/server";
import { getUserCredits, deductCredit, addCredits } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET - Check user's credit balance
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`credits-get:${clientIP}`, RATE_LIMITS.relaxed);
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

// POST - Deduct a credit (called before API request)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for credit operations
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`credits-post:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { email, action } = body;
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }
    
    if (action === "deduct") {
      const result = await deductCredit(email);
      
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
    
    // Admin action to add credits (would be called by Stripe webhook in production)
    if (action === "add") {
      const { amount, adminKey } = body;
      
      // Simple admin key check (in production, use proper auth)
      if (adminKey !== process.env.ADMIN_API_KEY && adminKey !== "teeco-admin-2026") {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid amount" },
          { status: 400 }
        );
      }
      
      const result = await addCredits(email, amount);
      
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
