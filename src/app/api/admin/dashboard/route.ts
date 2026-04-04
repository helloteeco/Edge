import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboardData, addCredits, getUserCredits } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

export async function GET(request: NextRequest) {
  try {
    const password = request.nextUrl.searchParams.get("password");

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await getAdminDashboardData();

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action, email, amount } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "add_credits") {
      if (!email || !amount || amount <= 0 || amount > 10000) {
        return NextResponse.json({ error: "Invalid email or amount" }, { status: 400 });
      }
      const result = await addCredits(email, amount);
      if (!result.success) {
        return NextResponse.json({ error: "Failed to add credits. User may not exist." }, { status: 400 });
      }
      const updated = await getUserCredits(email);
      return NextResponse.json({
        success: true,
        email,
        amount,
        new_limit: result.new_limit,
        credits_used: updated?.credits_used ?? 0,
        credits_remaining: updated?.credits_remaining ?? 0,
      });
    }

    if (action === "set_credits") {
      if (!email || amount === undefined || amount < 0 || amount > 10000) {
        return NextResponse.json({ error: "Invalid email or amount" }, { status: 400 });
      }
      const current = await getUserCredits(email);
      if (!current) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const newLimit = (current.credits_used || 0) + amount;
      // Use addCredits with delta
      const delta = newLimit - (current.credits_limit || 3);
      if (delta === 0) {
        return NextResponse.json({ success: true, email, new_limit: newLimit, credits_remaining: amount });
      }
      const result = await addCredits(email, delta);
      return NextResponse.json({
        success: result.success,
        email,
        new_limit: result.new_limit,
        credits_remaining: amount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in admin dashboard POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
