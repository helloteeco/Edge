import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET - Fetch user's recent searches from Supabase
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`recent-searches-get:${clientIP}`, RATE_LIMITS.relaxed);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Fetch recent searches, ordered by most recent first, limit 10
    const { data, error } = await supabase
      .from("recent_searches")
      .select("*")
      .eq("user_email", normalizedEmail)
      .order("analyzed_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[RecentSearches] Error fetching:", error);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    // Transform to match the frontend RecentSearch format
    const searches = (data || []).map((row) => ({
      address: row.address,
      annualRevenue: Number(row.annual_revenue) || 0,
      adr: Number(row.adr) || 0,
      occupancy: Number(row.occupancy) || 0,
      cachedBedrooms: row.bedrooms,
      cachedBathrooms: row.bathrooms,
      cachedGuestCount: row.guest_count,
      cachedResult: row.cached_result,
      analyzedAt: row.analyzed_at,
      expiresAt: row.expires_at,
    }));

    return NextResponse.json({ success: true, searches });
  } catch (error) {
    console.error("[RecentSearches] Error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}

// POST - Save/update a recent search to Supabase
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`recent-searches-post:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { email, search } = body;

    if (!email || !search?.address) {
      return NextResponse.json({ success: false, error: "Email and search data required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

    // Upsert: update if same address exists, insert otherwise
    const { error } = await supabase
      .from("recent_searches")
      .upsert(
        {
          user_email: normalizedEmail,
          address: search.address,
          annual_revenue: search.annualRevenue || 0,
          adr: search.adr || 0,
          occupancy: search.occupancy || 0,
          bedrooms: search.cachedBedrooms || null,
          bathrooms: search.cachedBathrooms || null,
          guest_count: search.cachedGuestCount || null,
          cached_result: search.cachedResult || null,
          analyzed_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "user_email,address" }
      );

    if (error) {
      console.error("[RecentSearches] Error saving:", error);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    // Enforce max 10 searches per user: delete oldest beyond 10
    const { data: allSearches } = await supabase
      .from("recent_searches")
      .select("id, analyzed_at")
      .eq("user_email", normalizedEmail)
      .order("analyzed_at", { ascending: false });

    if (allSearches && allSearches.length > 10) {
      const idsToDelete = allSearches.slice(10).map((s) => s.id);
      await supabase.from("recent_searches").delete().in("id", idsToDelete);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RecentSearches] Error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
