import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ============================================================================
// PROPERTY DETAILS API — Fetches sqft and estimated value for a given address
// Tries multiple free sources: Redfin → Zillow → bedroom-based estimate
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

// ---- Source 1: Redfin (most reliable from server-side) ----
async function fetchRedfinDetails(address: string): Promise<PropertyDetails | null> {
  try {
    // Step 1: Search for the property to get the Redfin URL
    const searchUrl = `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent(address)}&v=2&al=1&num_homes=1`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Referer": "https://www.redfin.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) {
      console.log(`[PropertyDetails] Redfin search returned ${searchRes.status}`);
      return null;
    }

    const searchText = await searchRes.text();
    // Redfin returns JSONP-like response: {}&&{...}
    const jsonStr = searchText.replace(/^[^{]*/, "");
    const searchData = JSON.parse(jsonStr);
    
    const exactMatch = searchData?.payload?.exactMatch;
    if (!exactMatch?.url) {
      // Try sections
      const sections = searchData?.payload?.sections;
      if (!sections || sections.length === 0) {
        console.log("[PropertyDetails] No Redfin results found");
        return null;
      }
      // Look through sections for a property match
      for (const section of sections) {
        if (section.rows && section.rows.length > 0) {
          const row = section.rows[0];
          if (row.url) {
            return await fetchRedfinPropertyPage(row.url);
          }
        }
      }
      return null;
    }

    return await fetchRedfinPropertyPage(exactMatch.url);
  } catch (err) {
    console.error("[PropertyDetails] Redfin error:", err);
    return null;
  }
}

async function fetchRedfinPropertyPage(propertyUrl: string): Promise<PropertyDetails | null> {
  try {
    // Fetch the initial-info API for this property
    const abiUrl = `https://www.redfin.com/stingray/api/home/details/avm?path=${encodeURIComponent(propertyUrl)}`;
    
    // Try the below-the-fold API which has property details
    const btfUrl = `https://www.redfin.com/stingray/api/home/details/belowTheFold?path=${encodeURIComponent(propertyUrl)}`;
    
    const [abiRes, btfRes] = await Promise.allSettled([
      fetch(abiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Referer": "https://www.redfin.com/",
        },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(btfUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Referer": "https://www.redfin.com/",
        },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    let sqft = 0;
    let estimatedValue = 0;
    let yearBuilt = 0;
    let lotSize = 0;
    let propertyType = "house";

    // Parse AVM response for estimated value
    if (abiRes.status === "fulfilled" && abiRes.value.ok) {
      try {
        const abiText = await abiRes.value.text();
        const abiJson = JSON.parse(abiText.replace(/^[^{]*/, ""));
        estimatedValue = abiJson?.payload?.predictedValue || 0;
      } catch { /* ignore parse errors */ }
    }

    // Parse BTF response for property details
    if (btfRes.status === "fulfilled" && btfRes.value.ok) {
      try {
        const btfText = await btfRes.value.text();
        const btfJson = JSON.parse(btfText.replace(/^[^{]*/, ""));
        const publicRecords = btfJson?.payload?.publicRecordsInfo;
        if (publicRecords) {
          sqft = publicRecords.sqFt || publicRecords.livingAreaSqFt || 0;
          yearBuilt = publicRecords.yearBuilt || 0;
          lotSize = publicRecords.lotSqFt || 0;
          propertyType = publicRecords.propertyTypeName || "house";
        }
        // Also check basic info
        const basicInfo = btfJson?.payload?.basicInfo;
        if (basicInfo) {
          if (!sqft) sqft = basicInfo.sqFt || 0;
          if (!yearBuilt) yearBuilt = basicInfo.yearBuilt || 0;
        }
      } catch { /* ignore parse errors */ }
    }

    // If we got any useful data, return it
    if (sqft > 0 || estimatedValue > 0) {
      console.log(`[PropertyDetails] Redfin found: sqft=${sqft}, value=${estimatedValue}`);
      return {
        sqft,
        estimatedValue,
        lotSize,
        yearBuilt,
        propertyType,
        source: "redfin",
      };
    }

    // Try a simpler approach: fetch the property page HTML and extract from meta tags
    const pageRes = await fetch(`https://www.redfin.com${propertyUrl}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      
      // Extract sqft from HTML (look for common patterns)
      const sqftMatch = html.match(/(\d{3,5})\s*(?:Sq\.?\s*Ft|sqft|square\s*feet)/i);
      if (sqftMatch) sqft = parseInt(sqftMatch[1]);
      
      // Extract price/estimate from HTML
      const priceMatch = html.match(/\$(\d{1,3}(?:,\d{3})*)/);
      if (priceMatch && !estimatedValue) {
        estimatedValue = parseInt(priceMatch[1].replace(/,/g, ""));
      }
      
      // Extract year built
      const yearMatch = html.match(/(?:Built|Year\s*Built)[:\s]*(\d{4})/i);
      if (yearMatch) yearBuilt = parseInt(yearMatch[1]);

      if (sqft > 0 || estimatedValue > 0) {
        return {
          sqft,
          estimatedValue,
          lotSize: 0,
          yearBuilt,
          propertyType: "house",
          source: "redfin-html",
        };
      }
    }

    return null;
  } catch (err) {
    console.error("[PropertyDetails] Redfin property page error:", err);
    return null;
  }
}

// ---- Source 2: Zillow (backup) ----
async function fetchZillowDetails(address: string): Promise<PropertyDetails | null> {
  try {
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
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.log(`[PropertyDetails] Zillow returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const results = data?.cat1?.searchResults?.listResults;
    
    if (!results || results.length === 0) {
      console.log("[PropertyDetails] No Zillow results found");
      return null;
    }

    const match = results[0];
    const hdpData = match.hdpData?.homeInfo;

    if (!hdpData) {
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
    console.error("[PropertyDetails] Zillow error:", err);
    return null;
  }
}

// ---- Source 3: County assessor data via OpenStreetMap + Nominatim ----
async function fetchNominatimDetails(address: string): Promise<PropertyDetails | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&extratags=1&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "EdgeByTeeco/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!res.ok) return null;
    const results = await res.json();
    if (!results || results.length === 0) return null;
    
    const result = results[0];
    const tags = result.extratags || {};
    
    // OSM sometimes has building:levels which can help estimate sqft
    const levels = parseInt(tags["building:levels"] || "1");
    const floorArea = parseFloat(tags["building:floor_area"] || "0");
    
    if (floorArea > 0) {
      return {
        sqft: Math.round(floorArea * 10.764), // m² to sqft
        estimatedValue: 0,
        lotSize: 0,
        yearBuilt: parseInt(tags["start_date"] || "0"),
        propertyType: tags["building"] || "house",
        source: "osm",
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

// ---- Fallback: estimate sqft from bedrooms using national averages ----
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

  // Try sources in order: Redfin → Zillow → OSM → bedroom estimate
  let details: PropertyDetails | null = null;
  
  // Source 1: Redfin (most reliable)
  details = await fetchRedfinDetails(address);
  
  // Source 2: Zillow (if Redfin failed)
  if (!details || (details.sqft === 0 && details.estimatedValue === 0)) {
    const zillowDetails = await fetchZillowDetails(address);
    if (zillowDetails) {
      details = {
        sqft: details?.sqft || zillowDetails.sqft,
        estimatedValue: details?.estimatedValue || zillowDetails.estimatedValue,
        lotSize: details?.lotSize || zillowDetails.lotSize,
        yearBuilt: details?.yearBuilt || zillowDetails.yearBuilt,
        propertyType: details?.propertyType || zillowDetails.propertyType,
        source: zillowDetails.source,
      };
    }
  }
  
  // Source 3: OSM (if both failed for sqft)
  if (!details?.sqft) {
    const osmDetails = await fetchNominatimDetails(address);
    if (osmDetails?.sqft) {
      details = {
        sqft: osmDetails.sqft,
        estimatedValue: details?.estimatedValue || 0,
        lotSize: details?.lotSize || 0,
        yearBuilt: details?.yearBuilt || osmDetails.yearBuilt,
        propertyType: details?.propertyType || osmDetails.propertyType,
        source: osmDetails.source,
      };
    }
  }

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

  console.log(`[PropertyDetails] Final result for "${address}": sqft=${result.sqft} (${result.isEstimate ? 'estimated' : result.source}), value=${result.estimatedValue} (${result.isValueEstimate ? 'no data' : result.source})`);

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
