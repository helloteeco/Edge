import { NextRequest, NextResponse } from "next/server";
import { getCachedProperty, cacheProperty, cleanExpiredCache } from "@/lib/supabase";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET - Check cache for property data
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");
    
    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address is required" },
        { status: 400 }
      );
    }
    
    const cachedData = await getCachedProperty(address);
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        cached: true,
        data: cachedData,
      });
    }
    
    return NextResponse.json({
      success: true,
      cached: false,
      data: null,
    });
  } catch (error) {
    console.error("Error checking cache:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Store property data in cache
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, data } = body;
    
    if (!address || !data) {
      return NextResponse.json(
        { success: false, error: "Address and data are required" },
        { status: 400 }
      );
    }
    
    const success = await cacheProperty(address, data);
    
    return NextResponse.json({
      success,
      message: success ? "Cached successfully" : "Failed to cache",
    });
  } catch (error) {
    console.error("Error caching property:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Clean expired cache entries (can be called by cron job)
export async function DELETE() {
  try {
    const count = await cleanExpiredCache();
    
    return NextResponse.json({
      success: true,
      cleaned: count,
    });
  } catch (error) {
    console.error("Error cleaning cache:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
