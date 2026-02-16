import { NextRequest, NextResponse } from "next/server";
import { getUserProfile, updateUserAvatar, updateUserSavedMarkets, getUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET - Fetch user profile (avatar, saved markets)
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const user = await getUser(email);
    if (!user) {
      return NextResponse.json({ success: true, profile: null });
    }

    const profile = await getUserProfile(email);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("[UserProfile] Error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}

// PATCH - Update user profile fields
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, avatarId, savedCities, savedStates } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const user = await getUser(email);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Update avatar if provided
    if (typeof avatarId === "string") {
      const ok = await updateUserAvatar(email, avatarId);
      if (!ok) {
        return NextResponse.json({ success: false, error: "Failed to update avatar" }, { status: 500 });
      }
    }

    // Update saved markets if provided
    if (Array.isArray(savedCities) || Array.isArray(savedStates)) {
      const profile = await getUserProfile(email);
      const cities = Array.isArray(savedCities) ? savedCities : (profile?.saved_cities || []);
      const states = Array.isArray(savedStates) ? savedStates : (profile?.saved_states || []);
      const ok = await updateUserSavedMarkets(email, cities, states);
      if (!ok) {
        return NextResponse.json({ success: false, error: "Failed to update saved markets" }, { status: 500 });
      }
    }

    // Return updated profile
    const updatedProfile = await getUserProfile(email);
    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("[UserProfile] Error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
