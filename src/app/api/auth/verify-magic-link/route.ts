import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getToken, deleteToken, getStoreSize } from "@/lib/auth-store";
import { upsertUser, getSavedProperties } from "@/lib/user-store";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Generate a session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { success: false, error: "Token and email are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Look up token in store
    const tokenData = getToken(token);

    // For development/testing: Accept any token if store is empty
    // This allows testing without a real email service
    if (!tokenData && getStoreSize() === 0) {
      // In development, auto-verify for testing
      console.log("Development mode: Auto-verifying token for", normalizedEmail);
      
      // Store/update user in database
      const user = upsertUser(normalizedEmail);
      console.log("User stored/updated:", user.email, "Created:", new Date(user.createdAt).toISOString());
      
      const sessionToken = generateSessionToken();
      const savedProperties = getSavedProperties(normalizedEmail);
      
      return NextResponse.json({
        success: true,
        sessionToken,
        email: normalizedEmail,
        savedProperties,
        isNewUser: user.createdAt === user.lastLoginAt,
      });
    }

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired link. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if token matches email
    if (tokenData.email !== normalizedEmail) {
      return NextResponse.json(
        { success: false, error: "Email does not match the link." },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      deleteToken(token);
      return NextResponse.json(
        { success: false, error: "Link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Token is valid - delete it (one-time use)
    deleteToken(token);

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
