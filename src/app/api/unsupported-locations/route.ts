import { NextRequest, NextResponse } from "next/server";
import { 
  isLocationUnsupported, 
  addUnsupportedLocation, 
  releaseUnsupportedLocation,
  getAllUnsupportedLocations 
} from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET - Check if a location is unsupported
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`unsupported-get:${clientIP}`, RATE_LIMITS.relaxed);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const city = request.nextUrl.searchParams.get("city");
    const state = request.nextUrl.searchParams.get("state");
    const listAll = request.nextUrl.searchParams.get("list") === "true";
    
    // Admin: list all unsupported locations
    if (listAll) {
      const locations = await getAllUnsupportedLocations();
      return NextResponse.json({ success: true, locations });
    }
    
    if (!city || !state) {
      return NextResponse.json(
        { success: false, error: "City and state are required" },
        { status: 400 }
      );
    }
    
    const isUnsupported = await isLocationUnsupported(city, state);
    
    return NextResponse.json({
      success: true,
      city,
      state,
      isUnsupported,
    });
  } catch (error) {
    console.error("Error checking unsupported location:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Add or release unsupported location
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`unsupported-post:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { action, city, state, searchedAddress, returnedMarket, reason, adminKey } = body;
    
    if (!city || !state) {
      return NextResponse.json(
        { success: false, error: "City and state are required" },
        { status: 400 }
      );
    }
    
    if (action === "add") {
      // Add to unsupported list (called when mismatch detected)
      const success = await addUnsupportedLocation(
        city,
        state,
        searchedAddress || "",
        returnedMarket || ""
      );
      
      return NextResponse.json({
        success,
        message: success ? "Location added to unsupported list" : "Failed to add location",
      });
    }
    
    if (action === "release") {
      // Release from unsupported list (admin only)
      if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      const success = await releaseUnsupportedLocation(city, state, reason || "Manual release");
      
      return NextResponse.json({
        success,
        message: success ? "Location released" : "Failed to release location",
      });
    }
    
    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'add' or 'release'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing unsupported location:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
