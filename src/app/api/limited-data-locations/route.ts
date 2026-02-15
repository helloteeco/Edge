import { NextRequest, NextResponse } from "next/server";
import { 
  checkLimitedDataLocation,
  addLimitedDataLocation, 
  releaseLimitedDataLocation,
  getAllLimitedDataLocations 
} from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET - Check if a location has limited data and get nearest market info
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`limited-data-get:${clientIP}`, RATE_LIMITS.relaxed);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const city = request.nextUrl.searchParams.get("city");
    const state = request.nextUrl.searchParams.get("state");
    const listAll = request.nextUrl.searchParams.get("list") === "true";
    
    // Admin: list all limited data locations
    if (listAll) {
      const locations = await getAllLimitedDataLocations();
      return NextResponse.json({ success: true, locations });
    }
    
    if (!city || !state) {
      return NextResponse.json(
        { success: false, error: "City and state are required" },
        { status: 400 }
      );
    }
    
    const result = await checkLimitedDataLocation(city, state);
    
    return NextResponse.json({
      success: true,
      city,
      state,
      ...result,
    });
  } catch (error) {
    console.error("Error checking limited data location:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Add or release limited data location
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`limited-data-post:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { 
      action, 
      city, 
      state, 
      searchedAddress, 
      nearestMarketCity, 
      nearestMarketState,
      distanceMiles,
      reason, 
      adminKey 
    } = body;
    
    if (!city || !state) {
      return NextResponse.json(
        { success: false, error: "City and state are required" },
        { status: 400 }
      );
    }
    
    if (action === "add") {
      // Add to limited data list (called when mismatch detected)
      const success = await addLimitedDataLocation(
        city,
        state,
        searchedAddress || "",
        nearestMarketCity || "",
        nearestMarketState || "",
        distanceMiles
      );
      
      return NextResponse.json({
        success,
        message: success ? "Location added to limited data list" : "Failed to add location",
      });
    }
    
    if (action === "release") {
      // Release from limited data list (admin only)
      if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      const success = await releaseLimitedDataLocation(city, state, reason || "Manual release");
      
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
    console.error("Error processing limited data location:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
