import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

// Vercel Pro: allow up to 300 seconds for Apify scraping + processing
// Default is 60s which causes timeouts when Apify takes >60s
export const maxDuration = 300;

// ============================================================================
// CONFIGURATION
// ============================================================================

// Apify — PRIMARY data source
// SWITCHED to new-fast-airbnb-scraper: $0.50/1000 results (pay-per-event, no proxy charges)
// Old tri_angle~airbnb-scraper was costing $2-26/run due to RESIDENTIAL proxy bandwidth
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_ACTOR_ID = "tri_angle~new-fast-airbnb-scraper";
const APIFY_ACTOR_ID_LEGACY = "tri_angle~airbnb-scraper"; // fallback only
const APIFY_BASE_URL = "https://api.apify.com/v2";

// Hard cost cap: abort Apify run after 120 seconds to prevent runaway charges
const APIFY_TIMEOUT_SECS = 120;

// Cache duration: 30 days — aggressive caching to minimize Apify costs
// Most STR markets don't shift dramatically month-to-month
const CACHE_DURATION_DAYS = 30;

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

function getCacheKey(lat: number, lng: number, _bedrooms?: number): string {
  // Round to 1 decimal place (~11km radius) for wider cache coverage
  // This means any address within ~11km of a cached search will get a cache hit
  // The enrichListings function recalculates distances from the exact address
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLng = Math.round(lng * 10) / 10;
  // Location-only key — bedroom filtering happens client-side
  return `${roundedLat}_${roundedLng}_all`;
}

// Generate old-format cache keys for backwards compatibility
function getOldCacheKeys(lat: number, lng: number, bedrooms: number): string[] {
  // Try both old (2 decimal) and new (1 decimal) rounding for backwards compatibility
  const oldLat = Math.round(lat * 100) / 100;
  const oldLng = Math.round(lng * 100) / 100;
  const newLat = Math.round(lat * 10) / 10;
  const newLng = Math.round(lng * 10) / 10;
  const bedroomVariants = [bedrooms, 3, 2, 4, 1, 5, 6];
  const keys: string[] = [];
  // New format keys (wider radius)
  keys.push(`${newLat}_${newLng}_all`);
  // Old format keys (narrow radius, bedroom-specific)
  for (const br of Array.from(new Set(bedroomVariants))) {
    keys.push(`${oldLat}_${oldLng}_${br}br`);
    keys.push(`${newLat}_${newLng}_${br}br`);
  }
  return keys;
}

async function getCachedMarketData(cacheKey: string, lat?: number, lng?: number, bedrooms?: number): Promise<any | null> {
  try {
    // Try new format first
    const { data, error } = await supabase
      .from("market_data")
      .select("*")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!error && data) {
      await supabase
        .from("market_data")
        .update({ search_count: (data.search_count || 1) + 1, updated_at: new Date().toISOString() })
        .eq("cache_key", cacheKey);
      console.log(`[Cache] HIT for ${cacheKey} (searched ${data.search_count + 1} times)`);
      return data;
    }

    // Fallback: try old cache key formats (e.g., "35.32_-82.46_3br")
    if (lat !== undefined && lng !== undefined && bedrooms !== undefined) {
      const oldKeys = getOldCacheKeys(lat, lng, bedrooms);
      for (const oldKey of oldKeys) {
        const { data: oldData, error: oldError } = await supabase
          .from("market_data")
          .select("*")
          .eq("cache_key", oldKey)
          .gt("expires_at", new Date().toISOString())
          .single();
        if (!oldError && oldData) {
          await supabase
            .from("market_data")
            .update({ search_count: (oldData.search_count || 1) + 1, updated_at: new Date().toISOString() })
            .eq("cache_key", oldKey);
          console.log(`[Cache] HIT (old key) for ${oldKey} (searched ${oldData.search_count + 1} times)`);
          return oldData;
        }
      }
    }

    return null;
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

    const { error } = await supabase.from("market_data").upsert(
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
    if (error) {
      console.error(`[Cache] Supabase upsert error for ${params.cacheKey}:`, error.message, error.details, error.hint);
    } else {
      console.log(`[Cache] SAVED ${params.listings.length} listings for ${params.cacheKey}`);
    }
  } catch (err) {
    console.error("[Cache] Failed to save:", err);
  }
}

// Also save to the legacy airbnb_comp_cache for backwards compatibility
async function saveLegacyCache(cacheKey: string, lat: number, lng: number, bedrooms: number, listings: any[]): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_DURATION_DAYS);
    const { error } = await supabase.from("airbnb_comp_cache").upsert(
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
    if (error) console.error(`[LegacyCache] Upsert error:`, error.message);
  } catch (err) {
    console.error("[LegacyCache] Failed:", err);
  }
}

// ============================================================================
// APIFY SCRAPER — Primary data source
// ============================================================================

// Single Apify scrape using the NEW FAST scraper (pay-per-event, no proxy charges)
// Cost: ~$0.12 per search (vs $2-26 with old scraper + RESIDENTIAL proxy)
async function runApifyScrape(
  lat: number,
  lng: number,
  latDelta: number,
  bedrooms: number,
  maxListings: number = 50,
  filterBedrooms: boolean = false,
  cityName?: string,
  stateName?: string,
): Promise<{ success: boolean; listings: any[]; error?: string }> {
  if (!APIFY_API_TOKEN) {
    return { success: false, listings: [], error: "APIFY_API_TOKEN not configured" };
  }

  try {
    const today = new Date();
    const checkIn = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const checkOut = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Build location query for the new fast scraper
    // Prefer city/state name for better results; fall back to coordinate-based query
    const locationQuery = (cityName && stateName)
      ? `${cityName}, ${stateName}`
      : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const radiusMiles = Math.round(latDelta * 69);
    console.log(`[Apify-Fast] Scraping "${locationQuery}" (~${radiusMiles}mi radius)...`);

    // Build input for new-fast-airbnb-scraper
    // This scraper uses locationQueries instead of startUrls
    // NO proxy config needed — pay-per-event model includes all costs
    const actorInput: any = {
      locationQueries: [locationQuery],
      checkIn,
      checkOut,
      locale: "en-US",
      currency: "USD",
      adults: 1,
    };

    // Add bedroom filter if requested
    if (filterBedrooms && bedrooms > 0) {
      actorInput.minBedrooms = Math.max(1, bedrooms - 1);
    }

    // Start actor run with timeout to prevent runaway costs
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_API_TOKEN}&timeout=${APIFY_TIMEOUT_SECS}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error("[Apify-Fast] Start failed:", runResponse.status, errorText);
      return { success: false, listings: [], error: `Apify error: ${runResponse.status}` };
    }

    const runData = await runResponse.json();
    const runId = runData?.data?.id;
    if (!runId) {
      return { success: false, listings: [], error: "No run ID from Apify" };
    }

    console.log(`[Apify-Fast] Run ${runId} started, polling...`);

    // Poll for completion (max 120 seconds = 60 attempts × 2s)
    let attempts = 0;
    const maxAttempts = 60;
    let runStatus = "RUNNING";

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
      try {
        const statusRes = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);
        const statusData = await statusRes.json();
        runStatus = statusData?.data?.status || "UNKNOWN";
      } catch (pollErr) {
        console.warn(`[Apify-Fast] Poll error (attempt ${attempts}):`, pollErr);
      }
      if (attempts % 5 === 0) console.log(`[Apify-Fast] Status (${attempts}): ${runStatus}`);
    }

    if (runStatus !== "SUCCEEDED") {
      // If still running, try to abort to prevent further charges
      if (runStatus === "RUNNING") {
        try {
          await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}/abort?token=${APIFY_API_TOKEN}`, { method: "POST" });
          console.warn(`[Apify-Fast] Aborted run ${runId} after timeout`);
        } catch (abortErr) {
          console.error(`[Apify-Fast] Failed to abort run:`, abortErr);
        }
      }
      return { success: false, listings: [], error: `Apify run ${runStatus === "RUNNING" ? "timed out" : "failed"}: ${runStatus}` };
    }

    // Fetch results — cap at 50 to keep costs predictable
    const datasetId = runData?.data?.defaultDatasetId;
    const resultsRes = await fetch(`${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=50`);
    if (!resultsRes.ok) {
      return { success: false, listings: [], error: "Failed to fetch Apify results" };
    }

    const rawListings = await resultsRes.json();
    console.log(`[Apify-Fast] Got ${rawListings.length} raw listings`);

    // Transform to Edge format
    // The new fast scraper has a slightly different output format
    const listings = rawListings
      .filter((item: any) => item.name && (item.pricing?.rate?.amount || item.price || item.pricePerNight))
      .map((item: any, index: number) => {
        const nightlyPrice = item.pricing?.rate?.amount || item.price || item.pricePerNight || 0;
        const rating = item.rating || item.stars || 0;
        const reviewCount = item.reviewsCount || item.numberOfReviews || 0;
        const listingBedrooms = item.bedrooms || bedrooms;
        const listingBathrooms = item.bathrooms || 1;
        const listingId = item.id || item.roomId || item.url?.match(/rooms\/(\d+)/)?.[1] || `apify_${index}`;
        const image = item.images?.[0]?.url || item.images?.[0] || item.thumbnail || item.pictureUrl || item.image || null;
        const compLat = item.location?.lat || item.lat || item.latitude || 0;
        const compLng = item.location?.lng || item.lng || item.longitude || 0;

        return {
          id: listingId,
          name: item.name || item.title || `${listingBedrooms} BR Listing`,
          url: item.url || `https://www.airbnb.com/rooms/${listingId}`,
          image,
          bedrooms: listingBedrooms,
          bathrooms: listingBathrooms,
          accommodates: item.personCapacity || item.maxGuests || item.guests || listingBedrooms * 2,
          sqft: 0,
          nightPrice: Math.round(nightlyPrice),
          rating: typeof rating === "number" ? rating : parseFloat(rating) || 0,
          reviewsCount: typeof reviewCount === "number" ? reviewCount : parseInt(reviewCount) || 0,
          propertyType: item.roomType || item.type || item.propertyType || "Entire home",
          latitude: compLat,
          longitude: compLng,
          amenities: item.amenities || [],
          hostName: item.host?.name || item.hostName || "",
          isSuperhost: item.host?.isSuperhost || item.isSuperhost || false,
          source: "apify",
        };
      });

    console.log(`[Apify-Fast] Transformed ${listings.length} listings (from ${rawListings.length} raw)`);
    return { success: true, listings };
  } catch (error) {
    console.error("[Apify-Fast] Error:", error);
    return { success: false, listings: [], error: `Scraping failed: ${error}` };
  }
}

// City-name fallback using the new fast scraper
// This is now much simpler since the new scraper natively supports location queries
async function scrapeAirbnbByCity(
  city: string,
  state: string,
  bedrooms: number,
): Promise<{ success: boolean; listings: any[]; error?: string }> {
  // The new fast scraper already uses locationQueries, so this is just a direct call
  // with the city name. No need for a separate URL-based approach.
  console.log(`[Apify-Fast] City-name fallback: ${city}, ${state}...`);
  return runApifyScrape(0, 0, 0.36, bedrooms, 50, false, city, state);
}

// Main scraping function — COST-EFFICIENT: max 2 Apify runs per search
// Strategy: One wide-radius scrape (~25mi) to get 30-50+ listings in a single call.
// Only falls back to city-name search if the first scrape returns 0.
async function scrapeAirbnbComps(
  lat: number,
  lng: number,
  bedrooms: number,
  city?: string,
  state?: string,
): Promise<{ success: boolean; listings: any[]; error?: string }> {
  // === Run 1: Single wide-radius bounding box (~25mi) ===
  // 25mi is the sweet spot: covers enough area for most markets in one call
  // The enrichListings function handles bedroom filtering and distance weighting
  // Pass city/state so the new fast scraper can use locationQueries
  const result = await runApifyScrape(lat, lng, 0.36, bedrooms, 50, false, city, state);
  if (result.success && result.listings.length > 0) {
    console.log(`[Apify] Got ${result.listings.length} listings in single 25mi scrape`);
    return result;
  }

  // === Run 2 (fallback): City-name search if bounding box returned 0 ===
  // This uses Airbnb's own search algorithm which sometimes works better
  // for addresses where the bounding box coordinates don't match well
  if (city && state) {
    console.log(`[Apify] Bounding box returned 0, trying city-name fallback: ${city}, ${state}`);
    const cityResult = await scrapeAirbnbByCity(city, state, bedrooms);
    if (cityResult.success && cityResult.listings.length > 0) {
      console.log(`[Apify] City fallback got ${cityResult.listings.length} listings`);
      return cityResult;
    }
  }

  // Both strategies failed — no listings found
  console.log(`[Apify] No listings found after 2 search strategies`);
  return { success: false, listings: [], error: "No listings found in area" };
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

// Estimate occupancy from review count using improved industry heuristic
// Airbnb data: ~30% of guests leave reviews (was assuming 33% = 3x multiplier)
// Actual: reviews/year ÷ 0.30 = bookings/year, avg stay ~3.5 nights (longer in vacation markets)
// Also accounts for last-minute bookings that don't show in scraped calendar data
function estimateOccupancy(reviewsCount: number, listingAgeFactor: number = 2): number {
  if (reviewsCount <= 0) return 55; // Conservative default for new/no-review listings
  const reviewsPerYear = reviewsCount / listingAgeFactor;
  const bookingsPerYear = reviewsPerYear / 0.30; // 30% review rate (industry standard)
  const avgStayNights = 3.5; // Vacation rentals average 3-4 nights
  const nightsPerYear = bookingsPerYear * avgStayNights;
  // Add 12% for last-minute bookings not captured in calendar scrapes
  const adjustedNights = nightsPerYear * 1.12;
  const occupancy = Math.round((adjustedNights / 365) * 100);
  return Math.min(90, Math.max(35, occupancy));
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
  // Mountain/outdoor tourism markets
  if ((lat >= 35 && lat <= 37 && lng >= -84 && lng <= -82) ||   // Smoky Mountains TN/NC
      (lat >= 37 && lat <= 40 && lng >= -82 && lng <= -79) ||   // WV/VA Appalachian (New River Gorge, Shenandoah)
      (lat >= 38 && lat <= 41 && lng >= -107 && lng <= -104) || // Colorado Rockies
      (lat >= 40 && lat <= 42 && lng >= -112 && lng <= -110) || // Utah mountains
      (lat >= 43 && lat <= 48 && lng >= -115 && lng <= -110) || // Idaho/Montana
      (lat >= 34 && lat <= 37 && lng >= -112 && lng <= -109) || // Arizona mountains (Sedona, Flagstaff)
      (lat >= 35 && lat <= 37 && lng >= -79 && lng <= -76) ||   // NC Blue Ridge
      (lat >= 34 && lat <= 36 && lng >= -84 && lng <= -83))     // North GA mountains
    return "mountain";
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

    const startTime = Date.now();
    console.log(`[Analyze] ${address} | ${bedrooms}br/${bathrooms}ba`);

    // =====================================================================
    // STEP 0: Check property_cache for EXACT address match (instant, ~200ms)
    // This is the fastest path — no geocoding needed
    // =====================================================================
    try {
      const { data: exactCache, error: exactErr } = await supabase
        .from("property_cache")
        .select("data, created_at")
        .eq("address", address)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!exactErr && exactCache?.data) {
        const cachedData = exactCache.data as any;
        // The property_cache stores the full API response shape
        if (cachedData?.property || cachedData?.neighborhood) {
          console.log(`[Analyze] INSTANT HIT from property_cache (${Date.now() - startTime}ms)`);
          
          // Reconstruct targetCoordinates if missing (legacy cache entries)
          if (!cachedData.targetCoordinates && cachedData.comparables?.length > 0) {
            const firstCompWithCoords = cachedData.comparables.find(
              (c: any) => c.latitude && c.longitude && c.latitude !== 0 && c.longitude !== 0
            );
            if (firstCompWithCoords) {
              cachedData.targetCoordinates = {
                latitude: firstCompWithCoords.latitude,
                longitude: firstCompWithCoords.longitude,
              };
              console.log(`[Analyze] Reconstructed targetCoordinates from comp: ${firstCompWithCoords.latitude}, ${firstCompWithCoords.longitude}`);
              
              // Update cache entry in background so future hits have targetCoordinates
              supabase.from("property_cache").update({ data: cachedData }).eq("address", address)
                .then(({ error: updateErr }) => {
                  if (updateErr) console.error("[PropertyCache] Failed to backfill targetCoordinates:", updateErr.message);
                  else console.log(`[PropertyCache] Backfilled targetCoordinates for ${address}`);
                });
            }
          }
          
          // Re-wrap in success response if needed
          if (cachedData.success !== undefined) {
            return NextResponse.json(cachedData);
          }
          // Legacy format: wrap the cached data
          return NextResponse.json({ success: true, dataSource: "property_cache", ...cachedData });
        }
      }
    } catch {
      // Non-fatal — continue to geocode path
    }

    // =====================================================================
    // STEP 1: Geocode + check market_data cache IN PARALLEL
    // =====================================================================
    // Start geocoding immediately, and also check nearby cache by city name
    const [coords, nearbyCacheByCity] = await Promise.all([
      geocodeAddress(address),
      // Quick city-level cache check (doesn't need exact coords)
      (async () => {
        try {
          const { data } = await supabase
            .from("market_data")
            .select("*")
            .ilike("city", cityFromAddress || "__none__")
            .ilike("state", stateFromAddress || "__none__")
            .gt("expires_at", new Date().toISOString())
            .limit(1)
            .single();
          return data;
        } catch { return null; }
      })(),
    ]);

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
    console.log(`[Analyze] Geocoded: ${latitude}, ${longitude} (${city}, ${state}) [${Date.now() - startTime}ms]`);

    // =====================================================================
    // STEP 2: Check Supabase cache (market_data table)
    // Try exact cache key first, then nearby city cache from parallel fetch
    // =====================================================================
    const cacheKey = getCacheKey(latitude, longitude, bedrooms);
    let cached = await getCachedMarketData(cacheKey, latitude, longitude, bedrooms);

    // If no exact coord match, use the city-level cache from parallel fetch
    if (!cached && nearbyCacheByCity && nearbyCacheByCity.listings?.length > 0) {
      console.log(`[Analyze] Using nearby city cache for ${city}, ${state}`);
      cached = nearbyCacheByCity;
    }

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

      // allComps = full cached listing set (before bedroom filtering)
      // We enrich ALL listings (not just bedroom-filtered) so client can re-filter
      const allEnriched = (cached.listings || []).map((listing: any) => {
        const nightPrice = listing.nightPrice || 150;
        const occupancy = listing.occupancy || estimateOccupancy(listing.reviewsCount || 0);
        const annualRev = listing.annualRevenue || Math.round(nightPrice * 365 * (occupancy / 100));
        const monthlyRev = listing.monthlyRevenue || Math.round(annualRev / 12);
        const distance = listing.distance || calcDistance(latitude, longitude, listing.latitude, listing.longitude);
        return { ...listing, occupancy, annualRevenue: annualRev, monthlyRevenue: monthlyRev, distance: Math.round(distance * 10) / 10 };
      });

      return NextResponse.json(buildResponse({
        city, state, street, latitude, longitude, bedrooms, bathrooms,
        adr: finalAdr,
        occupancy: finalOccupancy,
        annualRevenue: finalAnnualRevenue,
        percentiles: finalPercentiles,
        comparables: enriched.slice(0, 30),
        allComps: allEnriched,
        historical,
        totalListings: allEnriched.length,
        filteredListings: enriched.length,
        dataSource: `cache (${cached.source})`,
      }));
    }

    // =====================================================================
    // STEP 3: Scrape from Apify (PRIMARY)
    // =====================================================================
    console.log(`[Analyze] Cache MISS — scraping via Apify...`);
    const scrapeResult = await scrapeAirbnbComps(
      latitude,
      longitude,
      bedrooms,
      city || cityFromAddress,
      state || stateFromAddress,
    );

    if (!scrapeResult.success || scrapeResult.listings.length === 0) {
      console.warn(`[Analyze] All scraping strategies returned no results: ${scrapeResult.error}`);
      return NextResponse.json({
        success: false,
        error: "Unable to fetch rental data right now",
        message: `We're having trouble fetching Airbnb data for ${city || cityFromAddress}, ${state || stateFromAddress} right now. This is usually a temporary issue. Please try again in a few minutes.`,
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

    console.log(`[Analyze] SUCCESS — ${enriched.length} comps, ADR $${avgAdr}, Occ ${avgOccupancy}%, Rev $${avgAnnualRevenue}/yr [${Date.now() - startTime}ms total]`);

    // Build allComps from the full raw listing set (before bedroom filtering)
    // This enriches ALL listings so the client can re-filter by bedroom locally
    const allEnrichedForClient = scrapeResult.listings.map((listing: any) => {
      const nightPrice = listing.nightPrice || 150;
      const occ = estimateOccupancy(listing.reviewsCount || 0);
      const annualRev = Math.round(nightPrice * 365 * (occ / 100));
      const monthlyRev = Math.round(annualRev / 12);
      const dist = calcDistance(latitude, longitude, listing.latitude, listing.longitude);
      return { ...listing, occupancy: occ, annualRevenue: annualRev, monthlyRevenue: monthlyRev, distance: Math.round(dist * 10) / 10 };
    });

    const responseData = buildResponse({
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
      allComps: allEnrichedForClient,
      historical,
      totalListings: scrapeResult.listings.length,
      filteredListings: enriched.length,
      dataSource: "apify",
    });

    // Save FULL response to property_cache for instant future lookups on this exact address
    // This runs in background (don't await) to not delay the response
    supabase.from("property_cache").upsert(
      {
        address,
        data: responseData,
        expires_at: new Date(Date.now() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "address" }
    ).then(({ error }) => {
      if (error) console.error("[PropertyCache] Save error:", error.message);
      else console.log(`[PropertyCache] Saved full response for ${address}`);
    });

    return NextResponse.json(responseData);
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
  allComps: any[];  // Full unfiltered listing set for client-side re-filtering
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
    marketType: getMarketType(params.latitude, params.longitude),

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
      amenities: c.amenities || c._raw?.amenities || [],
      hostName: c.hostName || c._raw?.hostName || "",
      isSuperhost: c.isSuperhost || c._raw?.isSuperhost || false,
    })),

    historical: params.historical,

    recommendedAmenities: getRecommendedAmenities(params.latitude, params.longitude),

    // Full unfiltered comp set for client-side bedroom re-filtering
    // This allows changing bedrooms without burning another API credit
    allComps: params.allComps.map((c) => ({
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
      amenities: c.amenities || [],
      hostName: c.hostName || "",
      isSuperhost: c.isSuperhost || false,
    })),
  };
}
