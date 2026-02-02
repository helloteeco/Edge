import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyMagicToken } from "@/lib/magic-token";
import { upsertUser, getSavedProperties } from "@/lib/supabase";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Generate a session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify the signed token
    const result = verifyMagicToken(token);

    if (!result.valid || !result.email) {
      return NextResponse.json(
        { success: false, error: result.error || "Invalid or expired link. Please request a new one." },
        { status: 400 }
      );
    }

    const normalizedEmail = result.email;

    // Store/update user in Supabase database
    const user = await upsertUser(normalizedEmail);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Failed to create/update user" },
        { status: 500 }
      );
    }
    
    console.log("User stored/updated:", user.email, "Created:", user.created_at);

    // Generate a session token for the client
    const sessionToken = generateSessionToken();
    
    // Get user's saved properties from Supabase
    const savedPropertiesRaw = await getSavedProperties(normalizedEmail);
    
    // Transform to match frontend expected format
    const savedProperties = savedPropertiesRaw.map(p => ({
      id: p.id,
      address: p.address,
      savedAt: new Date(p.saved_at).getTime(),
      notes: p.notes || "",
      result: {
        annualRevenue: p.annual_revenue,
        cashOnCash: p.cash_on_cash,
        monthlyNetCashFlow: p.monthly_net_cash_flow,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        guestCount: p.guest_count,
      },
    }));

    const isNewUser = new Date(user.created_at).getTime() === new Date(user.last_login_at).getTime();

    return NextResponse.json({
      success: true,
      sessionToken,
      email: normalizedEmail,
      savedProperties,
      isNewUser,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
