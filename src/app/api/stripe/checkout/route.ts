import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Price IDs mapped to tiers — these correspond to the Stripe products
// You can find these in your Stripe Dashboard > Products > Prices
const TIER_CONFIG: Record<string, { priceId: string; credits: number; label: string }> = {
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER || "",   // 5 credits - $4.99
    credits: 5,
    label: "5 Analysis Credits",
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO || "",       // 25 credits - $19.99
    credits: 25,
    label: "25 Analysis Credits",
  },
  power: {
    priceId: process.env.STRIPE_PRICE_POWER || "",     // 100 credits - $69.99
    credits: 100,
    label: "100 Analysis Credits",
  },
};

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    // Rate limit: max 10 checkout attempts per 5 minutes per IP
    const rateLimitResult = await rateLimit(`stripe-checkout:${clientIP}`, { limit: 10, windowSeconds: 300 });
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { tier, email } = body;

    // Validate tier
    const tierConfig = TIER_CONFIG[tier];
    if (!tierConfig) {
      return NextResponse.json(
        { success: false, error: "Invalid tier. Must be: starter, pro, or power" },
        { status: 400 }
      );
    }

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // If price IDs aren't configured, fall back to payment links
    // This ensures the app doesn't break if env vars aren't set yet
    if (!tierConfig.priceId) {
      console.warn(`[Stripe Checkout] Price ID not configured for tier: ${tier}. Falling back.`);
      return NextResponse.json(
        { success: false, error: "Checkout not configured for this tier", fallback: true },
        { status: 503 }
      );
    }

    // Create Checkout Session with locked email
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: sanitizedEmail, // LOCKED — user cannot change this at checkout
      line_items: [
        {
          price: tierConfig.priceId,
          quantity: 1,
        },
      ],
      // After payment, redirect back to calculator
      success_url: `${request.nextUrl.origin}/calculator?purchase=success&credits=${tierConfig.credits}`,
      cancel_url: `${request.nextUrl.origin}/calculator?purchase=cancelled`,
      metadata: {
        user_email: sanitizedEmail,
        tier: tier,
        credits: tierConfig.credits.toString(),
      },
      // Prevent duplicate charges — each email+tier combo gets a unique idempotency window
      payment_intent_data: {
        metadata: {
          user_email: sanitizedEmail,
          tier: tier,
          credits: tierConfig.credits.toString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("[Stripe Checkout] Error creating session:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
