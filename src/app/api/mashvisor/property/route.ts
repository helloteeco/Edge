import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Apify — PRIMARY data source
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_ACTOR_ID = "tri_angle~airbnb-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

// Cache duration: 7 days (Airbnb pricing doesn't change hourly)
const CACHE_DURATION_DAYS = 7;

// ============================================================================
// GEOCODING
// ============================================================================

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; city?: string; state?: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "EdgeByTeeco/1.0 (contact@teeco.co)" },
    });
    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        city: result.address?.city || result.address?.town || result.address?.village || "",
        state: result.address?.state || "",
      };
    }

    // Fallback: city-level geocoding
    const parts = address.split(",").map((p: string) => p.trim());
    if (parts.length >= 2) {
      const cityQuery = parts.slice(1).join(", ");
      const cityUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1&addressdetails=1`;
      const cityResponse = await fetch(cityUrl, {
        headers: { "User-Agent": "EdgeByTeeco/1.0 (contact@teeco.co)" },
      });
      const cityData = await cityResponse.json();
      if (cityData && cityData.length > 0) {
        return {
          lat: parseFloat(cityData[0].lat),
          lng: parseFloat(cityData[0].lon),
          city: cityData[0].address?.city || cityData[0].address?.town || parts[1] || "",
          state: cityData[0].address?.state || "",
        };
      }
    }
    return null;
  } catch (error) {
    console.error("[Geocode] Error:", error);
    return null;
  }
}

// ============================================================================
// SUPABASE CACHE — Check market_data table for recent data
// ============================================================================

function getCacheKey(lat: number, lng: number, bedrooms: number): string {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${roundedLat}_${roundedLng}_${bedrooms}br`;
}

async function getCachedMarketData(cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from("market_data")
      .select("*")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Increment search_count for analytics
    await supabase
      .from("market_data")
      .update({ search_count: (data.search_count || 1) + 1, updated_at: new Date().toISOString() })
      .eq("cache_key", cacheKey);

    console.log(`[Cache] HIT for ${cacheKey} (searched ${data.search_count + 1} times)`);
    return data;
  } catch {
    return null;
  }
}

async function saveMarketData(params: {
  cacheKey: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  bedrooms: number;
  searchAddress: string;
  avgAdr: number;
  avgOccupancy: number;
  avgAnnualRevenue: number;
  avgMonthlyRevenue: number;
  percentiles: any;
  listings: any[];
  monthlyData: any;
  source: string;
  dataQuality: string;
}): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_DURATION_DAYS);

    await supabase.from("market_data").upsert(
      {
        cache_key: params.cacheKey,
        latitude: params.lat,
        longitude: params.lng,
        city: params.city,
        state: params.state,
        bedrooms: params.bedrooms,
        search_address: params.searchAddress,
        avg_adr: params.avgAdr,
        avg_occupancy: params.avgOccupancy,
        avg_annual_revenue: params.avgAnnualRevenue,
        avg_monthly_revenue: params.avgMonthlyRevenue,
        percentiles: params.percentiles,
        listings: params.listings,
        listings_count: params.listings.length,
        monthly_data: params.monthlyData,
        source: params.source,
        data_quality: params.dataQuality,
        search_count: 1,
        updated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "cache_key" }
    );
    console.log(`[Cache] SAVED ${params.listings.length} listings for ${params.cacheKey}`);
  } catch (err) {
    console.error("[Cache] Failed to save:", err);
  }
}

// Also save to the legacy airbnb_comp_cache for backwards compatibility
async function saveLegacyCache(cacheKey: string, lat: number, lng: number, bedrooms: number, listings: any[]): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_DURATION_DAYS);
    await supabase.from("airbnb_comp_cache").upsert(
      {
        cache_key: cacheKey,
        latitude: lat,
        longitude: lng,
        bedrooms,
        listings,
        listings_count: listings.length,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "cache_key" }
    );
  } catch {
    // Non-fatal
  }
}

// ============================================================================
// APIFY SCRAPER — Primary data source
// ============================================================================

async function scrapeAirbnbComps(
  lat: number,
  lng: number,
  bedrooms: number,
): Promise<{ success: boolean; listings: any[]; error?: string }> {
  if (!APIFY_API_TOKEN) {
    return { success: false, listings: [], error: "APIFY_API_TOKEN not configured" };
  }

  try {
    // Build bounding box (~10 mile radius)
    const latDelta = 0.15;
    const lngDelta = 0.15 / Math.cos((lat * Math.PI) / 180);

    const today = new Date();
    const checkIn = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const checkOut = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const searchUrl = `https://www.airbnb.com/s/homes?ne_lat=${lat + latDelta}&ne_lng=${lng + lngDelta}&sw_lat=${lat - latDelta}&sw_lng=${lng - lngDelta}&search_type=filter_change&tab_id=home_tab&refinement_paths[]=/homes&checkin=${checkIn}&checkout=${checkOut}&adults=1&room_types[]=Entire%20home/apt&min_bedrooms=${Math.max(1, bedrooms - 1)}`;

    console.log(`[Apify] Scraping ${lat},${lng} (${bedrooms}br)...`);

    // Start actor run
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: searchUrl }],
          maxListings: 40, // Request 40 to ensure we get 30 after filtering
          includeReviews: false,
          maxReviews: 0,
          calendarMonths: 0,
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"],
          },
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error("[Apify] Start failed:", runResponse.status, errorText);
      return { success: false, listings: [], error: `Apify error: ${runResponse.status}` };
    }

    const runData = await runResponse.json();
    const runId = runData?.data?.id;
    if (!runId) {
      return { success: false, listings: [], error: "No run ID from Apify" };
    }

    console.log(`[Apify] Run ${runId} started, polling...`);

    // Poll for completion (max 90 seconds)
    let attempts = 0;
    const maxAttempts = 45;
    let runStatus = "RUNNING";

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
      const statusRes = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);
      const statusData = await statusRes.json();
      runStatus = statusData?.data?.status || "UNKNOWN";
      if (attempts % 5 === 0) console.log(`[Apify] Status (${attempts}): ${runStatus}`);
    }

    if (runStatus !== "SUCCEEDED") {
      return { success: false, listings: [], error: `Apify run ${runStatus === "RUNNING" ? "timed out" : "failed"}: ${runStatus}` };
    }

    // Fetch results
    const datasetId = runData?.data?.defaultDatasetId;
    const resultsRes = await fetch(`${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=40`);
    if (!resultsRes.ok) {
      return { success: false, listings: [], error: "Failed to fetch Apify results" };
    }

    const rawListings = await resultsRes.json();
    console.log(`[Apify] Got ${rawListings.length} raw listings`);

    // Transform to Edge format
    const listings = rawListings
      .filter((item: any) => item.name && (item.pricing?.rate?.amount || item.price))
      .map((item: any, index: number) => {
        const nightlyPrice = item.pricing?.rate?.amount || item.price || 0;
        const rating = item.rating || item.stars || 0;
        const reviewCount = item.reviewsCount || 0;
        const listingBedrooms = item.bedrooms || bedrooms;
        const listingBathrooms = item.bathrooms || 1;
        const listingId = item.id || item.url?.match(/rooms\/(\d+)/)?.[1] || `apify_${index}`;
        const image = item.images?.[0]?.url || item.images?.[0] || item.thumbnail || item.pictureUrl || null;
        const compLat = item.location?.lat || item.lat || 0;
        const compLng = item.location?.lng || item.lng || 0;

        return {
          id: listingId,
          name: item.name || `${listingBedrooms} BR Listing`,
          url: item.url || `https://www.airbnb.com/rooms/${listingId}`,
          image,
          bedrooms: listingBedrooms,
          bathrooms: listingBathrooms,
          accommodates: item.personCapacity || item.maxGuests || listingBedrooms * 2,
          sqft: 0,
          nightPrice: Math.round(nightlyPrice),
          rating: typeof rating === "number" ? rating : parseFloat(rating) || 0,
          reviewsCount: typeof reviewCount === "number" ? reviewCount : parseInt(reviewCount) || 0,
          propertyType: item.roomType || item.type || "Entire home",
          latitude: compLat,
          longitude: compLng,
          amenities: item.amenities || [],
          hostName: item.host?.name || "",
          isSuperhost: item.host?.isSuperhost || false,
          source: "apify",
        };
      })
      .slice(0, 30); // Cap at 30

    console.log(`[Apify] Transformed ${listings.length} listings`);
    return { success: true, listings };
  } catch (error) {
    console.error("[Apify] Error:", error);
    return { success: false, listings: [], error: `Scraping failed: ${error}` };
  }
}

// ============================================================================
// MATH HELPERS — Calculate market metrics from scraped comps
// ============================================================================

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat2 || !lon2) return 999;
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculatePercentiles(values: number[]): { p25: number; p50: number; p75: number; p90: number } {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p25: sorted[Math.floor(sorted.length * 0.25)] || 0,
    p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
    p75: sorted[Math.floor(sorted.length * 0.75)] || 0,
    p90: sorted[Math.floor(sorted.length * 0.9)] || 0,
  };
}

// Estimate occupancy from review count using industry heuristic
// Reviews/year × ~3 = bookings/year, avg stay ~3 nights
function estimateOccupancy(reviewsCount: number, listingAgeFactor: number = 2): number {
  if (reviewsCount <= 0) return 55; // Conservative default
  const bookingsPerYear = (reviewsCount / listingAgeFactor) * 3;
  const nightsPerYear = bookingsPerYear * 3;
  const occupancy = Math.round((nightsPerYear / 365) * 100);
  return Math.min(85, Math.max(30, occupancy));
}

// Enrich listings with revenue estimates and distance
function enrichListings(
  listings: any[],
  targetLat: number,
  targetLng: number,
  targetBedrooms: number,
  targetBathrooms?: number,
  targetGuests?: number,
): {
  enriched: any[];
  avgAdr: number;
  avgOccupancy: number;
  avgAnnualRevenue: number;
  percentiles: { revenue: any; adr: any; occupancy: any };
} {
  const tBath = targetBathrooms || Math.ceil(targetBedrooms / 2);
  const tGuests = targetGuests || targetBedrooms * 2;

  // Filter to similar bedroom count (within ±1)
  const bedroomFiltered = listings.filter((l) => {
    const diff = Math.abs((l.bedrooms || targetBedrooms) - targetBedrooms);
    return targetBedrooms >= 6 ? (l.bedrooms || 0) >= 5 : diff <= 1;
  });

  // Use bedroom-filtered if we have enough, otherwise use all
  const compsForCalc = bedroomFiltered.length >= 5 ? bedroomFiltered : listings;

  // Calculate occupancy and relevance score for each listing
  const enriched = compsForCalc.map((listing) => {
    const nightPrice = listing.nightPrice || 150;
    const occupancy = estimateOccupancy(listing.reviewsCount || 0);
    const annualRevenue = Math.round(nightPrice * 365 * (occupancy / 100));
    const monthlyRevenue = Math.round(annualRevenue / 12);
    const distance = calcDistance(targetLat, targetLng, listing.latitude, listing.longitude);

    // Relevance score: lower = better match (like AirDNA's weighting)
    // Bed match is most important (weight 40), then bath (20), then guest count (15), then distance (25)
    const bedDiff = Math.abs((listing.bedrooms || targetBedrooms) - targetBedrooms);
    const bathDiff = Math.abs((listing.bathrooms || tBath) - tBath);
    const guestDiff = Math.abs((listing.accommodates || tGuests) - tGuests);
    const distScore = Math.min(distance / 15, 1); // Normalize: 15mi = max penalty
    const relevanceScore = (bedDiff * 40) + (bathDiff * 20) + (guestDiff * 2.5) + (distScore * 25);

    return {
      ...listing,
      occupancy,
      annualRevenue,
      monthlyRevenue,
      distance: Math.round(distance * 10) / 10,
      relevanceScore: Math.round(relevanceScore * 10) / 10,
    };
  });

  // Sort by relevance score (best match first), then distance as tiebreaker
  enriched.sort((a, b) => {
    if (a.relevanceScore !== b.relevanceScore) return a.relevanceScore - b.relevanceScore;
    return a.distance - b.distance;
  });
  const top30 = enriched.slice(0, 30);

  // Calculate market averages from enriched comps
  const adrs = top30.map((l) => l.nightPrice).filter((v) => v > 0);
  const occupancies = top30.map((l) => l.occupancy).filter((v) => v > 0);
  const revenues = top30.map((l) => l.annualRevenue).filter((v) => v > 0);

  const avgAdr = adrs.length > 0 ? Math.round(adrs.reduce((a, b) => a + b, 0) / adrs.length) : 0;
  const avgOccupancy = occupancies.length > 0 ? Math.round(occupancies.reduce((a, b) => a + b, 0) / occupancies.length) : 55;
  const avgAnnualRevenue = revenues.length > 0 ? Math.round(revenues.reduce((a, b) => a + b, 0) / revenues.length) : 0;

  return {
    enriched: top30,
    avgAdr,
    avgOccupancy,
    avgAnnualRevenue,
    percentiles: {
      revenue: calculatePercentiles(revenues),
      adr: calculatePercentiles(adrs),
      occupancy: calculatePercentiles(occupancies),
    },
  };
}

// ============================================================================
// MARKET TYPE & AMENITY RECOMMENDATIONS
// ============================================================================

function getMarketType(lat: number, lng: number): string {
  if ((lat >= 35 && lat <= 37 && lng >= -84 && lng <= -82) ||
      (lat >= 38 && lat <= 41 && lng >= -107 && lng <= -104) ||
      (lat >= 40 && lat <= 42 && lng >= -112 && lng <= -110)) return "mountain";
  if ((lat >= 24 && lat <= 31 && lng >= -88 && lng <= -80) ||
      (lat >= 32 && lat <= 38 && lng >= -124 && lng <= -117)) return "beach";
  if ((lat >= 35 && lat <= 37 && lng >= -86 && lng <= -84) ||
      (lat >= 42 && lat <= 47 && lng >= -90 && lng <= -82)) return "lake";
  if (lat >= 31 && lat <= 37 && lng >= -115 && lng <= -109) return "desert";
  if ((lat >= 40.5 && lat <= 41 && lng >= -74.5 && lng <= -73.5) ||
      (lat >= 33.5 && lat <= 34.5 && lng >= -118.5 && lng <= -117.5) ||
      (lat >= 41.5 && lat <= 42 && lng >= -88 && lng <= -87)) return "urban";
  return "rural";
}

function getRecommendedAmenities(lat: number, lng: number): any[] {
  const marketType = getMarketType(lat, lng);
  const base = [
    { name: "High-Speed WiFi", boost: 5, priority: "MUST HAVE", icon: "📶" },
    { name: "Smart TV with Streaming", boost: 3, priority: "MUST HAVE", icon: "📺" },
  ];
  const byMarket: Record<string, any[]> = {
    mountain: [
      { name: "Hot Tub", boost: 22, priority: "MUST HAVE", icon: "♨️" },
      { name: "Fireplace", boost: 15, priority: "HIGH IMPACT", icon: "🔥" },
      { name: "Game Room", boost: 12, priority: "HIGH IMPACT", icon: "🎮" },
      { name: "Mountain Views", boost: 10, priority: "HIGH IMPACT", icon: "🏔️" },
      { name: "Fire Pit", boost: 8, priority: "NICE TO HAVE", icon: "🪵" },
    ],
    beach: [
      { name: "Pool", boost: 25, priority: "MUST HAVE", icon: "🏊" },
      { name: "Ocean View", boost: 20, priority: "HIGH IMPACT", icon: "🌊" },
      { name: "Beach Gear", boost: 10, priority: "HIGH IMPACT", icon: "🏖️" },
      { name: "Outdoor Shower", boost: 8, priority: "NICE TO HAVE", icon: "🚿" },
      { name: "Kayaks/Paddleboards", boost: 7, priority: "NICE TO HAVE", icon: "🛶" },
    ],
    lake: [
      { name: "Boat Dock", boost: 28, priority: "MUST HAVE", icon: "⚓" },
      { name: "Kayaks/Canoes", boost: 15, priority: "HIGH IMPACT", icon: "🛶" },
      { name: "Lake View", boost: 12, priority: "HIGH IMPACT", icon: "🏞️" },
      { name: "Fire Pit", boost: 10, priority: "HIGH IMPACT", icon: "🪵" },
      { name: "Fishing Gear", boost: 6, priority: "NICE TO HAVE", icon: "🎣" },
    ],
    desert: [
      { name: "Pool", boost: 30, priority: "MUST HAVE", icon: "🏊" },
      { name: "Outdoor Kitchen", boost: 15, priority: "HIGH IMPACT", icon: "🍳" },
      { name: "Fire Pit", boost: 12, priority: "HIGH IMPACT", icon: "🪵" },
      { name: "Mountain Views", boost: 10, priority: "HIGH IMPACT", icon: "🏜️" },
      { name: "Hot Tub", boost: 8, priority: "NICE TO HAVE", icon: "♨️" },
    ],
    urban: [
      { name: "Parking", boost: 20, priority: "MUST HAVE", icon: "🅿️" },
      { name: "Workspace", boost: 15, priority: "HIGH IMPACT", icon: "💼" },
      { name: "Gym Access", boost: 10, priority: "HIGH IMPACT", icon: "🏋️" },
      { name: "Rooftop/Balcony", boost: 12, priority: "HIGH IMPACT", icon: "🌆" },
      { name: "Washer/Dryer", boost: 8, priority: "NICE TO HAVE", icon: "🧺" },
    ],
    rural: [
      { name: "Hot Tub", boost: 18, priority: "MUST HAVE", icon: "♨️" },
      { name: "Fire Pit", boost: 12, priority: "HIGH IMPACT", icon: "🪵" },
      { name: "Outdoor Space", boost: 10, priority: "HIGH IMPACT", icon: "🌳" },
      { name: "Game Room", boost: 8, priority: "NICE TO HAVE", icon: "🎮" },
      { name: "Grill/BBQ", boost: 6, priority: "NICE TO HAVE", icon: "🍖" },
    ],
  };
  return [...base, ...(byMarket[marketType] || byMarket.rural)].slice(0, 7);
}

// Generate estimated monthly seasonality from comps
// Uses market type to create realistic seasonal patterns
function generateSeasonality(avgAdr: number, avgOccupancy: number, lat: number, lng: number): any[] {
  const marketType = getMarketType(lat, lng);

  // Seasonal multipliers by market type (Jan-Dec)
  const patterns: Record<string, { occ: number[]; adr: number[] }> = {
    beach: {
      occ: [0.45, 0.50, 0.65, 0.70, 0.85, 0.95, 1.00, 1.00, 0.80, 0.60, 0.45, 0.40],
      adr: [0.80, 0.85, 0.90, 0.95, 1.10, 1.20, 1.30, 1.30, 1.05, 0.90, 0.75, 0.75],
    },
    mountain: {
      occ: [0.85, 0.90, 0.80, 0.55, 0.50, 0.70, 0.85, 0.80, 0.65, 0.75, 0.70, 0.90],
      adr: [1.20, 1.15, 1.00, 0.80, 0.75, 0.90, 1.10, 1.05, 0.85, 0.95, 0.90, 1.25],
    },
    lake: {
      occ: [0.30, 0.35, 0.45, 0.55, 0.75, 0.90, 1.00, 1.00, 0.70, 0.50, 0.35, 0.30],
      adr: [0.70, 0.75, 0.80, 0.90, 1.05, 1.15, 1.30, 1.30, 1.00, 0.85, 0.70, 0.70],
    },
    desert: {
      occ: [0.85, 0.90, 0.95, 0.80, 0.55, 0.40, 0.35, 0.35, 0.50, 0.70, 0.80, 0.85],
      adr: [1.15, 1.20, 1.25, 1.05, 0.80, 0.65, 0.60, 0.60, 0.75, 0.95, 1.10, 1.15],
    },
    urban: {
      occ: [0.65, 0.70, 0.80, 0.85, 0.90, 0.90, 0.85, 0.85, 0.90, 0.85, 0.75, 0.70],
      adr: [0.90, 0.90, 0.95, 1.00, 1.05, 1.05, 1.00, 1.00, 1.05, 1.00, 0.95, 0.95],
    },
    rural: {
      occ: [0.40, 0.45, 0.55, 0.65, 0.80, 0.90, 0.95, 0.95, 0.75, 0.60, 0.45, 0.40],
      adr: [0.80, 0.85, 0.90, 0.95, 1.05, 1.10, 1.20, 1.20, 1.00, 0.90, 0.80, 0.80],
    },
  };

  const pattern = patterns[marketType] || patterns.rural;
  const now = new Date();
  const currentYear = now.getFullYear();

  return pattern.occ.map((occMult, i) => {
    const monthOcc = Math.round(avgOccupancy * occMult);
    const monthAdr = Math.round(avgAdr * pattern.adr[i]);
    const monthRev = Math.round(monthAdr * (monthOcc / 100) * 30);
    return {
      year: currentYear,
      month: i + 1,
      occupancy: Math.min(95, Math.max(15, monthOcc)),
      adr: monthAdr,
      revenue: monthRev,
    };
  });
}

// ============================================================================
// LOG TO analysis_log — Persist every search for analytics
// ============================================================================

async function logAnalysis(params: {
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  bedrooms: number;
  bathrooms: number;
  guestCount: number;
  annualRevenue: number;
  monthlyRevenue: number;
  adr: number;
  occupancy: number;
  source: string;
  compCount: number;
  percentiles: any;
  seasonality: any;
}): Promise<void> {
  try {
    await supabase.from("analysis_log").insert({
      address: params.address,
      city: params.city,
      state: params.state,
      latitude: params.lat,
      longitude: params.lng,
      bedrooms: params.bedrooms,
      bathrooms: params.bathrooms,
      guest_count: params.guestCount,
      annual_revenue: params.annualRevenue,
      monthly_revenue: params.monthlyRevenue,
      adr: params.adr,
      occupancy_rate: params.occupancy,
      revenue_source: params.source,
      data_provider: "apify",
      comp_count: params.compCount,
      revenue_p25: params.percentiles?.revenue?.p25 || 0,
      revenue_p50: params.percentiles?.revenue?.p50 || 0,
      revenue_p75: params.percentiles?.revenue?.p75 || 0,
      revenue_p90: params.percentiles?.revenue?.p90 || 0,
      seasonality_data: params.seasonality,
    });
  } catch (err) {
    console.error("[AnalysisLog] Failed:", err);
  }
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`property:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before analyzing another property." },
        { status: 429 }
      );
    }

    const { address, bedrooms = 3, bathrooms = 2, accommodates = 6 } = await request.json();
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Parse address components
    const addressParts = address.split(",").map((p: string) => p.trim());
    const street = addressParts[0] || "";
    const cityFromAddress = addressParts[1] || "";
    const stateZip = addressParts[2] || "";
    const stateFromAddress = stateZip.split(" ")[0] || "";

    console.log(`[Analyze] ${address} | ${bedrooms}br/${bathrooms}ba`);

    // =====================================================================
    // STEP 1: Geocode the address
    // =====================================================================
    const coords = await geocodeAddress(address);
    if (!coords) {
      return NextResponse.json({
        success: false,
        error: "Could not geocode this address",
        message: "We couldn't find the location. Please check the address and try again.",
      });
    }

    const { lat: latitude, lng: longitude } = coords;
    const city = coords.city || cityFromAddress;
    const state = coords.state || stateFromAddress;
    console.log(`[Analyze] Geocoded: ${latitude}, ${longitude} (${city}, ${state})`);

    // =====================================================================
    // STEP 2: Check Supabase cache (market_data table)
    // =====================================================================
    const cacheKey = getCacheKey(latitude, longitude, bedrooms);
    const cached = await getCachedMarketData(cacheKey);

    if (cached && cached.listings && cached.listings.length > 0) {
      console.log(`[Analyze] Cache HIT — ${cached.listings_count} listings from ${cached.source}`);

      // Re-enrich cached listings (recalculate distances from THIS address)
      const { enriched, avgAdr, avgOccupancy, avgAnnualRevenue, percentiles } = enrichListings(
        cached.listings,
        latitude,
        longitude,
        bedrooms,
        bathrooms,
        accommodates,
      );

      // Use cached percentiles if they exist, otherwise use recalculated
      const finalPercentiles = cached.percentiles || percentiles;
      const finalAdr = cached.avg_adr || avgAdr;
      const finalOccupancy = cached.avg_occupancy || avgOccupancy;
      const finalAnnualRevenue = cached.avg_annual_revenue || avgAnnualRevenue;

      // Generate seasonality
      const historical = cached.monthly_data || generateSeasonality(finalAdr, finalOccupancy, latitude, longitude);

      // Log the search
      await logAnalysis({
        address, city, state, lat: latitude, lng: longitude,
        bedrooms, bathrooms, guestCount: accommodates,
        annualRevenue: finalAnnualRevenue,
        monthlyRevenue: Math.round(finalAnnualRevenue / 12),
        adr: finalAdr, occupancy: finalOccupancy,
        source: "cache", compCount: enriched.length,
        percentiles: finalPercentiles, seasonality: historical,
      });

      return NextResponse.json(buildResponse({
        city, state, street, latitude, longitude, bedrooms, bathrooms,
        adr: finalAdr,
        occupancy: finalOccupancy,
        annualRevenue: finalAnnualRevenue,
        percentiles: finalPercentiles,
        comparables: enriched.slice(0, 30),
        historical,
        totalListings: enriched.length,
        filteredListings: enriched.length,
        dataSource: `cache (${cached.source})`,
      }));
    }

    // =====================================================================
    // STEP 3: Scrape from Apify (PRIMARY)
    // =====================================================================
    console.log(`[Analyze] Cache MISS — scraping via Apify...`);
    const scrapeResult = await scrapeAirbnbComps(latitude, longitude, bedrooms);

    if (!scrapeResult.success || scrapeResult.listings.length === 0) {
      console.warn(`[Analyze] Apify returned no results: ${scrapeResult.error}`);
      return NextResponse.json({
        success: false,
        error: "No STR data found for this location",
        message: `We couldn't find short-term rental data for ${city || cityFromAddress}, ${state || stateFromAddress}. This could mean there are very few Airbnb listings in this area. Try a nearby larger city.`,
        suggestions: ["Nashville, TN", "Austin, TX", "Denver, CO", "Miami, FL", "Phoenix, AZ"],
      });
    }

    // =====================================================================
    // STEP 4: Enrich listings with revenue estimates
    // =====================================================================
    const { enriched, avgAdr, avgOccupancy, avgAnnualRevenue, percentiles } = enrichListings(
      scrapeResult.listings,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      accommodates,
    );

    // Generate seasonality from market data
    const historical = generateSeasonality(avgAdr, avgOccupancy, latitude, longitude);

    // =====================================================================
    // STEP 5: Save EVERYTHING to Supabase (persistent database)
    // =====================================================================
    await saveMarketData({
      cacheKey,
      lat: latitude,
      lng: longitude,
      city: city || cityFromAddress,
      state: state || stateFromAddress,
      bedrooms,
      searchAddress: address,
      avgAdr,
      avgOccupancy,
      avgAnnualRevenue,
      avgMonthlyRevenue: Math.round(avgAnnualRevenue / 12),
      percentiles,
      listings: enriched,
      monthlyData: historical,
      source: "apify",
      dataQuality: enriched.length >= 15 ? "high" : enriched.length >= 5 ? "standard" : "low",
    });

    // Also save to legacy cache
    await saveLegacyCache(cacheKey, latitude, longitude, bedrooms, enriched);

    // Log the analysis
    await logAnalysis({
      address, city: city || cityFromAddress, state: state || stateFromAddress,
      lat: latitude, lng: longitude,
      bedrooms, bathrooms, guestCount: accommodates,
      annualRevenue: avgAnnualRevenue,
      monthlyRevenue: Math.round(avgAnnualRevenue / 12),
      adr: avgAdr, occupancy: avgOccupancy,
      source: "apify", compCount: enriched.length,
      percentiles, seasonality: historical,
    });

    console.log(`[Analyze] SUCCESS — ${enriched.length} comps, ADR $${avgAdr}, Occ ${avgOccupancy}%, Rev $${avgAnnualRevenue}/yr`);

    return NextResponse.json(buildResponse({
      city: city || cityFromAddress,
      state: state || stateFromAddress,
      street,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      adr: avgAdr,
      occupancy: avgOccupancy,
      annualRevenue: avgAnnualRevenue,
      percentiles,
      comparables: enriched.slice(0, 30),
      historical,
      totalListings: enriched.length,
      filteredListings: enriched.length,
      dataSource: "apify",
    }));
  } catch (error) {
    console.error("[Analyze] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch property data", message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// ============================================================================
// BUILD RESPONSE — Same shape as before so calculator UI doesn't break
// ============================================================================

function buildResponse(params: {
  city: string;
  state: string;
  street: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  adr: number;
  occupancy: number;
  annualRevenue: number;
  percentiles: any;
  comparables: any[];
  historical: any[];
  totalListings: number;
  filteredListings: number;
  dataSource: string;
}) {
  const monthlyRevenue = Math.round(params.annualRevenue / 12);

  return {
    success: true,
    dataSource: params.dataSource,
    bedroomsUsed: params.bedrooms,
    bathroomsUsed: params.bathrooms,
    bedroomMultiplier: 1.0,
    ruralCorrectionApplied: false,
    isRuralMarket: getMarketType(params.latitude, params.longitude) === "rural",

    property: {
      address: params.street,
      city: params.city,
      state: params.state,
      zipCode: "",
      sqft: 0,
    },

    neighborhood: {
      id: null,
      name: params.city || "Unknown",
      city: params.city,
      state: params.state,

      occupancy: Math.round(params.occupancy * 10) / 10,
      adr: Math.round(params.adr),
      monthlyRevenue,
      annualRevenue: Math.round(params.annualRevenue),

      rawOccupancy: params.occupancy,
      rawAdr: params.adr,
      rawMonthlyRevenue: monthlyRevenue,

      revenueChange: "stable",
      revenueChangePercent: 0,
      occupancyChange: "stable",
      occupancyChangePercent: 0,

      listingsCount: params.totalListings,
      totalProperties: params.totalListings,

      mashMeter: 0,
      mashMeterStars: 0,
      walkScore: 0,
      transitScore: 0,
      bikeScore: 0,

      medianPrice: 0,
      pricePerSqft: 0,
      avgSoldPrice: 0,
      avgDaysOnMarket: 0,
    },

    percentiles: {
      revenue: params.percentiles.revenue,
      adr: params.percentiles.adr,
      occupancy: params.percentiles.occupancy,
      listingsAnalyzed: params.filteredListings,
      totalListingsInArea: params.totalListings,
    },

    // Target property coordinates for comp map
    targetCoordinates: {
      latitude: params.latitude,
      longitude: params.longitude,
    },

    comparables: params.comparables.map((c) => ({
      id: c.id,
      name: c.name,
      url: c.url,
      image: c.image,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      accommodates: c.accommodates,
      sqft: c.sqft || 0,
      nightPrice: c.nightPrice,
      occupancy: c.occupancy,
      monthlyRevenue: c.monthlyRevenue,
      annualRevenue: c.annualRevenue,
      rating: c.rating,
      reviewsCount: c.reviewsCount,
      propertyType: c.propertyType,
      distance: c.distance,
      latitude: c.latitude || 0,
      longitude: c.longitude || 0,
      relevanceScore: c.relevanceScore || 0,
      source: c.source || "apify",
    })),

    historical: params.historical,

    recommendedAmenities: getRecommendedAmenities(params.latitude, params.longitude),
  };
}
