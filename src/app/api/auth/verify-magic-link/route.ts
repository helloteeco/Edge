import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyMagicToken } from "@/lib/magic-token";
import { upsertUser, getSavedProperties } from "@/lib/user-store";

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

    // Store/update user in database
    const user = upsertUser(normalizedEmail);
    console.log("User stored/updated:", user.email, "Created:", new Date(user.createdAt).toISOString());

    // Generate a session token for the client
    const sessionToken = generateSessionToken();
    
    // Get user's saved properties
    const savedProperties = getSavedProperties(normalizedEmail);

    return NextResponse.json({
      success: true,
      sessionToken,
      email: normalizedEmail,
      savedProperties,
      isNewUser: user.createdAt === user.lastLoginAt,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
