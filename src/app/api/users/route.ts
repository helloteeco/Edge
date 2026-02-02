import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, getUserCount, getSavedProperties } from "@/lib/supabase";

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
      const users = await getAllUsers();
      const headers = ['Email', 'Created At', 'Last Login'];
      const rows = users.map(user => [
        user.email,
        user.created_at,
        user.last_login_at,
      ]);
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="teeco-users-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === "full") {
      // Return full user data including saved properties
      const users = await getAllUsers();
      const usersWithProperties = await Promise.all(
        users.map(async (u) => {
          const savedProperties = await getSavedProperties(u.email);
          return {
            email: u.email,
            createdAt: u.created_at,
            lastLoginAt: u.last_login_at,
            savedPropertiesCount: savedProperties.length,
            savedProperties: savedProperties.map(p => ({
              id: p.id,
              address: p.address,
              savedAt: p.saved_at,
              notes: p.notes,
              annualRevenue: p.annual_revenue,
              cashOnCash: p.cash_on_cash,
            })),
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        count: users.length,
        users: usersWithProperties,
      });
    }

    // Default: return email list only
    const users = await getAllUsers();
    const count = await getUserCount();

    return NextResponse.json({
      success: true,
      count,
      emails: users.map(u => ({
        email: u.email,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
      })),
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
