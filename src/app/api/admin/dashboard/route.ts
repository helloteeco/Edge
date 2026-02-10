import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboardData } from "@/lib/supabase";

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
