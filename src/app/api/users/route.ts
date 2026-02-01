import { NextRequest, NextResponse } from "next/server";
import { getEmailList, getUserCount, exportUsersAsCSV, getAllUsers } from "@/lib/user-store";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Admin API key - in production, use environment variable
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "teeco-admin-2026";

export async function GET(request: NextRequest) {
  try {
    // Check for admin API key
    const apiKey = request.headers.get("x-api-key");
    
    if (apiKey !== ADMIN_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const format = request.nextUrl.searchParams.get("format");
    
    if (format === "csv") {
      // Return CSV for download
      const csv = exportUsersAsCSV();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="teeco-users-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === "full") {
      // Return full user data including saved properties
      const users = getAllUsers();
      return NextResponse.json({
        success: true,
        count: users.length,
        users: users.map(u => ({
          email: u.email,
          createdAt: new Date(u.createdAt).toISOString(),
          lastLoginAt: new Date(u.lastLoginAt).toISOString(),
          savedPropertiesCount: u.savedProperties.length,
          savedProperties: u.savedProperties,
        })),
      });
    }

    // Default: return email list only
    const emails = getEmailList();
    const count = getUserCount();

    return NextResponse.json({
      success: true,
      count,
      emails,
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
