import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ============================================================================
// PROPERTY DETAILS API — Fetches sqft and estimated value for a given address
// Uses Zillow's internal search API (no key required, public web endpoint)
// Results are cached in Supabase for 90 days to minimize external calls
// ============================================================================

interface PropertyDetails {
  sqft: number;
  estimatedValue: number;
  lotSize: number;
  yearBuilt: number;
  propertyType: string;
  source: string;
}

// Zillow search endpoint (public, used by their website)
async function fetchZillowDetails(address: string): Promise<PropertyDetails | null> {
  try {
    // Use Zillow's search API to find the property
    const searchUrl = `https://www.zillow.com/search/GetSearchPageState.htm?searchQueryState=${encodeURIComponent(
      JSON.stringify({
        usersSearchTerm: address,
        mapBounds: { west: -180, east: 180, south: -90, north: 90 },
        isMapVisible: false,
        filterState: {},
        isListVisible: true,
        mapZoom: 12,
      })
    )}&wants={"cat1":["listResults"]}&requestId=1`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.log(`[PropertyDetails] Zillow search returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const results = data?.cat1?.searchResults?.listResults;
    
    if (!results || results.length === 0) {
      console.log("[PropertyDetails] No Zillow results found");
      return null;
    }

    // Find best match (first result is usually most relevant)
    const match = results[0];
    const hdpData = match.hdpData?.homeInfo;

    if (!hdpData) {
      // Try basic fields from search result
      return {
        sqft: match.area || 0,
        estimatedValue: match.unformattedPrice || match.price || 0,
        lotSize: 0,
        yearBuilt: 0,
        propertyType: match.statusType || "house",
        source: "zillow-search",
      };
    }

    return {
      sqft: hdpData.livingArea || match.area || 0,
      estimatedValue: hdpData.zestimate || hdpData.price || match.unformattedPrice || 0,
      lotSize: hdpData.lotSize || hdpData.lotAreaValue || 0,
      yearBuilt: hdpData.yearBuilt || 0,
      propertyType: hdpData.homeType || "SINGLE_FAMILY",
      source: "zillow",
    };
  } catch (err) {
    console.error("[PropertyDetails] Zillow fetch error:", err);
    return null;
  }
}

// Fallback: estimate sqft from bedrooms using national averages
function estimateSqftFromBedrooms(bedrooms: number): number {
  const estimates: Record<number, number> = {
    0: 500,   // Studio
    1: 750,
    2: 1100,
    3: 1500,
    4: 2000,
    5: 2500,
    6: 3000,
  };
  return estimates[Math.min(bedrooms, 6)] || 1500;
}

// Fallback: estimate value from city median (very rough)
function estimateValueFromComps(comparables: any[]): number {
  if (!comparables || comparables.length === 0) return 0;
  // Use comp night prices to estimate property value
  // Rough heuristic: annual revenue / 0.08 cap rate = property value
  const avgNightPrice = comparables.reduce((sum: number, c: any) => sum + (c.nightPrice || 0), 0) / comparables.length;
  const estimatedAnnualRevenue = avgNightPrice * 365 * 0.65; // 65% occupancy assumption
  return Math.round(estimatedAnnualRevenue / 0.08); // 8% cap rate assumption
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address") || "";
  const bedrooms = parseInt(searchParams.get("bedrooms") || "3");

  if (!address) {
    return NextResponse.json({ success: false, error: "Address is required" });
  }

  // Check cache first
  try {
    const { data: cached } = await supabase
      .from("property_cache")
      .select("data")
      .eq("address", `details:${address}`)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached?.data) {
      console.log("[PropertyDetails] Cache hit");
      return NextResponse.json({ success: true, ...cached.data, source: "cache" });
    }
  } catch {
    // No cache, continue
  }

  // Try Zillow
  const details = await fetchZillowDetails(address);

  const result = {
    sqft: details?.sqft || estimateSqftFromBedrooms(bedrooms),
    estimatedValue: details?.estimatedValue || 0,
    lotSize: details?.lotSize || 0,
    yearBuilt: details?.yearBuilt || 0,
    propertyType: details?.propertyType || "house",
    source: details?.source || "estimate",
    isEstimate: !details?.sqft,
    isValueEstimate: !details?.estimatedValue,
  };

  // Cache the result for 90 days
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);
    
    await supabase.from("property_cache").upsert({
      address: `details:${address}`,
      data: result,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[PropertyDetails] Cache write error:", err);
  }

  return NextResponse.json({ success: true, ...result });
}
