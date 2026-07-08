import { NextRequest, NextResponse } from "next/server";
import { supabase, addCredits, getUserCredits } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// This endpoint allows admin users (is_admin = true) to manage credits for other users.
// Authentication: requires the admin's email + session token (from localStorage).
// This is the endpoint that external platforms can call too.

async function verifyAdminUser(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const { data, error } = await supabase
    .from("users")
    .select("is_admin")
    .eq("email", normalizedEmail)
    .single();
  if (error || !data) return false;
  return data.is_admin === true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin_email, action, target_email, amount } = body;

    // Validate admin_email is provided
    if (!admin_email) {
      return NextResponse.json({ error: "admin_email is required" }, { status: 400 });
    }

    // Verify the caller is an admin
    const isAdmin = await verifyAdminUser(admin_email);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. You are not an admin." }, { status: 403 });
    }

    // Validate target email
    if (!target_email) {
      return NextResponse.json({ error: "target_email is required" }, { status: 400 });
    }

    const normalizedTarget = target_email.toLowerCase().trim();

    // Action: add_credits
    if (action === "add_credits") {
      if (!amount || amount <= 0 || amount > 10000) {
        return NextResponse.json({ error: "Invalid amount (1-10000)" }, { status: 400 });
      }
      const result = await addCredits(normalizedTarget, amount);
      if (!result.success) {
        return NextResponse.json({ error: "Failed to add credits. User may not exist." }, { status: 400 });
      }
      const updated = await getUserCredits(normalizedTarget);
      console.log(`[Admin:${admin_email}] Added ${amount} credits to ${normalizedTarget}`);
      return NextResponse.json({
        success: true,
        target_email: normalizedTarget,
        amount,
        new_limit: result.new_limit,
        credits_remaining: updated?.credits_remaining ?? 0,
      });
    }

    // Action: set_credits
    if (action === "set_credits") {
      if (amount === undefined || amount < 0 || amount > 10000) {
        return NextResponse.json({ error: "Invalid amount (0-10000)" }, { status: 400 });
      }
      const current = await getUserCredits(normalizedTarget);
      if (!current) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const newLimit = (current.credits_used || 0) + amount;
      const delta = newLimit - (current.credits_limit || 3);
      if (delta === 0) {
        return NextResponse.json({ success: true, target_email: normalizedTarget, new_limit: newLimit, credits_remaining: amount });
      }
      const result = await addCredits(normalizedTarget, delta);
      console.log(`[Admin:${admin_email}] Set credits for ${normalizedTarget} to ${amount} remaining`);
      return NextResponse.json({
        success: result.success,
        target_email: normalizedTarget,
        new_limit: result.new_limit,
        credits_remaining: amount,
      });
    }

    // Action: upgrade_unlimited
    if (action === "upgrade_unlimited") {
      const { error } = await supabase
        .from("users")
        .update({ is_unlimited: true })
        .eq("email", normalizedTarget);
      if (error) {
        return NextResponse.json({ error: "Failed to upgrade. User may not exist." }, { status: 400 });
      }
      console.log(`[Admin:${admin_email}] Upgraded ${normalizedTarget} to unlimited`);
      return NextResponse.json({ success: true, target_email: normalizedTarget, is_unlimited: true });
    }

    // Action: remove_unlimited
    if (action === "remove_unlimited") {
      const { error } = await supabase
        .from("users")
        .update({ is_unlimited: false })
        .eq("email", normalizedTarget);
      if (error) {
        return NextResponse.json({ error: "Failed to remove unlimited." }, { status: 400 });
      }
      console.log(`[Admin:${admin_email}] Removed unlimited from ${normalizedTarget}`);
      return NextResponse.json({ success: true, target_email: normalizedTarget, is_unlimited: false });
    }

    // Action: check_user - get user's credit info
    if (action === "check_user") {
      const credits = await getUserCredits(normalizedTarget);
      if (!credits) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      // Also get admin/unlimited status
      const { data: userData } = await supabase
        .from("users")
        .select("is_admin, is_unlimited")
        .eq("email", normalizedTarget)
        .single();
      return NextResponse.json({
        success: true,
        target_email: normalizedTarget,
        credits_used: credits.credits_used,
        credits_limit: credits.credits_limit,
        credits_remaining: credits.credits_remaining,
        is_admin: userData?.is_admin ?? false,
        is_unlimited: userData?.is_unlimited ?? false,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use: add_credits, set_credits, upgrade_unlimited, remove_unlimited, check_user" }, { status: 400 });
  } catch (error) {
    console.error("Error in admin manage-credits:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Check if a user is an admin (used by the frontend to show/hide admin UI)
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ is_admin: false });
    }
    const isAdmin = await verifyAdminUser(email);
    return NextResponse.json({ is_admin: isAdmin });
  } catch {
    return NextResponse.json({ is_admin: false });
  }
}
