import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
// @ts-ignore — no types for google-trends-api
import googleTrends from "google-trends-api";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

// Vercel Pro: 60 seconds is plenty with direct Airbnb API (2-5s per fetch)
export const maxDuration = 60;

// ============================================================================
// CONFIGURATION
// ============================================================================

// Direct Airbnb API — PRIMARY data source (replaced Apify for speed + reliability)
// Uses Airbnb's own explore_tabs endpoint: 2-5 seconds vs 30-120s with Apify
// Same data, no middleman, no per-search cost
const AIRBNB_API_KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t20"; // Public Airbnb web client key
const AIRBNB_API_BASE = "https://www.airbnb.com/api/v2/explore_tabs";

// Cache duration: 60 days — aggressive caching to minimize API calls
// STR markets don't shift dramatically month-to-month; 60 days cuts repeat PriceLabs calls in half
const CACHE_DURATION_DAYS = 60;

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
      // Update search count in background (don't block response)
      supabase
        .from("market_data")
        .update({ search_count: (data.search_count || 1) + 1, updated_at: new Date().toISOString() })
        .eq("cache_key", cacheKey)
        .then(() => {});
      console.log(`[Cache] HIT for ${cacheKey} (searched ${data.search_count + 1} times)`);
      return data;
    }

    // Fallback: try old cache key formats in parallel (e.g., "35.32_-82.46_3br")
    if (lat !== undefined && lng !== undefined && bedrooms !== undefined) {
      const oldKeys = getOldCacheKeys(lat, lng, bedrooms);
      const results = await Promise.all(
        oldKeys.map(async (oldKey) => {
          try {
            const { data: oldData, error: oldError } = await supabase
              .from("market_data")
              .select("*")
              .eq("cache_key", oldKey)
              .gt("expires_at", new Date().toISOString())
              .single();
            if (!oldError && oldData) return { key: oldKey, data: oldData };
          } catch {}
          return null;
        })
      );
      const hit = results.find(r => r !== null);
      if (hit) {
        // Update search count in background
        supabase
          .from("market_data")
          .update({ search_count: (hit.data.search_count || 1) + 1, updated_at: new Date().toISOString() })
          .eq("cache_key", hit.key)
          .then(() => {});
        console.log(`[Cache] HIT (old key) for ${hit.key} (searched ${hit.data.search_count + 1} times)`);
        return hit.data;
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
// DIRECT AIRBNB API — Primary data source (replaced Apify)
// Uses Airbnb's own explore_tabs endpoint: 2-5 seconds, free, reliable
// ============================================================================

// Fetch a single page of Airbnb listings via the explore_tabs API
// Calculate bounding box from center point and radius in miles
function getBoundingBox(lat: number, lng: number, radiusMiles: number): { neLat: number; neLng: number; swLat: number; swLng: number } {
  const latDelta = radiusMiles / 69; // ~69 miles per degree latitude
  const lngDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180)); // Adjust for longitude at latitude
  return {
    neLat: lat + latDelta,
    neLng: lng + lngDelta,
    swLat: lat - latDelta,
    swLng: lng - lngDelta,
  };
}

async function fetchAirbnbPage(
  lat: number,
  lng: number,
  checkin: string,
  checkout: string,
  offset: number = 0,
  radiusMiles: number = 15,
): Promise<any[]> {
  // Use bounding box search (search_by_map=true) instead of query-based search
  // This constrains results to a geographic area rather than Airbnb's market regions
  const bbox = getBoundingBox(lat, lng, radiusMiles);
  
  const params = new URLSearchParams({
    _format: "for_explore_search_web",
    currency: "USD",
    locale: "en",
    key: AIRBNB_API_KEY,
    tab_id: "home_tab",
    "refinement_paths[]": "/homes",
    items_per_grid: "40",
    // Geographic bounding box — forces Airbnb to return only listings within this area
    ne_lat: bbox.neLat.toFixed(6),
    ne_lng: bbox.neLng.toFixed(6),
    sw_lat: bbox.swLat.toFixed(6),
    sw_lng: bbox.swLng.toFixed(6),
    search_by_map: "true",
    zoom_level: "12",
    checkin,
    checkout,
    adults: "1",
    search_type: "filter_change",
    items_offset: String(offset),
  });

  const response = await fetch(`${AIRBNB_API_BASE}?${params.toString()}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000), // 10s hard timeout per request
  });

  if (!response.ok) {
    throw new Error(`Airbnb API returned ${response.status}`);
  }

  // CRITICAL: Airbnb listing IDs (e.g. 1573491224895607862) exceed JavaScript's
  // Number.MAX_SAFE_INTEGER (9007199254740991). Using response.json() would silently
  // truncate these IDs, producing broken "View on Airbnb" links (404).
  // Fix: read as text and convert large integers to strings before JSON.parse.
  const rawText = await response.text();
  // Regex: match any integer with 16+ digits (safely above MAX_SAFE_INTEGER territory)
  // and wrap it in quotes so JSON.parse treats it as a string.
  const safeText = rawText.replace(/(:\s*)(\d{16,})(\s*[,}\]])/g, '$1"$2"$3');
  const data = JSON.parse(safeText);
  const sections = data?.explore_tabs?.[0]?.sections || [];
  const listings: any[] = [];

  for (const section of sections) {
    const items = section?.listings || [];
    for (const item of items) {
      const listing = item?.listing;
      const pricing = item?.pricing_quote;
      if (listing) {
        listings.push({ listing, pricing });
      }
    }
  }

  return listings;
}

// Fetch listings from Airbnb's direct API with pagination
// Returns 40-80 listings in 2-5 seconds (vs 30-120s with Apify)
async function fetchAirbnbDirect(
  lat: number,
  lng: number,
  bedrooms: number,
  city?: string,
  state?: string,
): Promise<{ success: boolean; listings: any[]; searchRadiusMiles: number; error?: string }> {
  try {
    const today = new Date();
    const checkin = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const checkout = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    console.log(`[Airbnb-Direct] Fetching listings near ${lat.toFixed(4)}, ${lng.toFixed(4)} (${city || "unknown"}, ${state || ""})...`);
    const startMs = Date.now();

    // Progressive radius expansion: start tight (15mi), expand if too few results
    // This ensures we always show geographically relevant comps
    const RADIUS_STEPS = [15, 30, 50];
    let allRaw: any[] = [];
    let usedRadius = RADIUS_STEPS[0];

    for (const radius of RADIUS_STEPS) {
      usedRadius = radius;
      // Fetch two pages in parallel for 40-80 listings within bounding box
      const [page1, page2] = await Promise.all([
        fetchAirbnbPage(lat, lng, checkin, checkout, 0, radius),
        fetchAirbnbPage(lat, lng, checkin, checkout, 40, radius),
      ]);
      allRaw = [...page1, ...page2];
      console.log(`[Airbnb-Direct] ${radius}mi radius: ${allRaw.length} raw listings (${Date.now() - startMs}ms)`);

      // If we got enough listings, stop expanding
      if (allRaw.length >= 10) break;
    }

    if (allRaw.length === 0) {
      console.log(`[Airbnb-Direct] No listings found within ${usedRadius}mi radius`);
      return { success: false, listings: [], searchRadiusMiles: usedRadius, error: "No listings found in area" };
    }

    // Transform to Edge format (same shape as old Apify output)
    const listings = transformAirbnbListings(allRaw, bedrooms);
    console.log(`[Airbnb-Direct] Transformed ${listings.length} listings within ${usedRadius}mi radius in ${Date.now() - startMs}ms total`);
    return { success: true, listings, searchRadiusMiles: usedRadius };
  } catch (error) {
    console.error("[Airbnb-Direct] Error:", error);
    return { success: false, listings: [], searchRadiusMiles: 0, error: `Direct API failed: ${error}` };
  }
}

// City-name fallback: search by city name instead of coordinates
async function fetchAirbnbByCity(
  city: string,
  state: string,
  checkin: string,
  checkout: string,
): Promise<any[]> {
  const params = new URLSearchParams({
    _format: "for_explore_search_web",
    currency: "USD",
    locale: "en",
    key: AIRBNB_API_KEY,
    tab_id: "home_tab",
    "refinement_paths[]": "/homes",
    items_per_grid: "40",
    query: `${city}, ${state}`,
    checkin,
    checkout,
    adults: "1",
    search_type: "filter_change",
  });

  const response = await fetch(`${AIRBNB_API_BASE}?${params.toString()}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return [];

  // Same large-integer fix as fetchAirbnbPage — preserve listing IDs as strings
  const rawText = await response.text();
  const safeText = rawText.replace(/(:\s*)(\d{16,})(\s*[,}\]])/g, '$1"$2"$3');
  const data = JSON.parse(safeText);
  const sections = data?.explore_tabs?.[0]?.sections || [];
  const listings: any[] = [];

  for (const section of sections) {
    const items = section?.listings || [];
    for (const item of items) {
      const listing = item?.listing;
      const pricing = item?.pricing_quote;
      if (listing) listings.push({ listing, pricing });
    }
  }

  return listings;
}

// Transform raw Airbnb API response items to Edge listing format
// This produces the EXACT same shape as the old Apify transformer
function transformAirbnbListings(rawItems: any[], defaultBedrooms: number): any[] {
  // Deduplicate by listing ID
  const seen = new Set<string>();

  return rawItems
    .filter((item: any) => {
      const listing = item.listing;
      if (!listing?.name) return false;
      const id = String(listing.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((item: any) => {
      const listing = item.listing;
      const pricing = item.pricing;

      // Extract nightly price from pricing_quote or listing
      const nightlyPrice =
        pricing?.rate?.amount ||
        pricing?.price?.total?.amount ||
        listing?.price_rate ||
        0;

      const listingId = String(listing.id);
      const listingBedrooms = listing.bedrooms ?? defaultBedrooms;
      const listingBathrooms = listing.bathrooms ?? 1;

      return {
        id: listingId,
        name: listing.name || `${listingBedrooms} BR Listing`,
        url: `https://www.airbnb.com/rooms/${listingId}`,
        image: listing.picture_url || listing.xl_picture_url || listing.picture?.picture || null,
        bedrooms: listingBedrooms,
        bathrooms: listingBathrooms,
        accommodates: listing.person_capacity || listing.guest_label?.replace(/[^0-9]/g, "") || listingBedrooms * 2,
        sqft: 0,
        nightPrice: Math.round(nightlyPrice),
        rating: listing.star_rating || listing.avg_rating || 0,
        reviewsCount: listing.reviews_count || listing.visible_review_count || 0,
        propertyType: listing.room_type || listing.room_type_category || "Entire home",
        latitude: listing.lat || listing.latitude || 0,
        longitude: listing.lng || listing.longitude || 0,
        amenities: listing.preview_amenities || [],
        hostName: listing.user?.first_name || "",
        isSuperhost: listing.is_superhost || listing.is_super_host || false,
        source: "airbnb-direct",
      };
    })
    .filter((l: any) => l.nightPrice > 0); // Only keep listings with valid pricing
}

// ============================================================================
// PRICELABS REVENUE ESTIMATOR — Licensed, accurate STR data
// Primary source for revenue, ADR, occupancy, and percentiles
// Uses V2 API: returns 25th/50th/75th/90th percentile revenue + ADR + occupancy
// ============================================================================

const PRICELABS_API_KEY = process.env.PRICELABS_API_KEY || "";
const PRICELABS_API_URL = "https://api.pricelabs.co/v1/revenue/estimator";

interface PriceLabsResult {
  success: boolean;
  revenue50: number;       // Median annual revenue
  revenue25: number;       // 25th percentile
  revenue75: number;       // 75th percentile
  revenue90: number;       // 90th percentile
  adr50: number;           // Median ADR
  adr25: number;
  adr75: number;
  adr90: number;
  occupancy: number;       // Average adjusted occupancy %
  listingsCount: number;   // Number of comparable listings analyzed
  monthlyRevAvg: number;   // Average monthly revenue
  error?: string;
}

async function fetchPriceLabs(
  address: string,
  bedrooms: number,
): Promise<PriceLabsResult> {
  if (!PRICELABS_API_KEY) {
    return { success: false, revenue50: 0, revenue25: 0, revenue75: 0, revenue90: 0, adr50: 0, adr25: 0, adr75: 0, adr90: 0, occupancy: 0, listingsCount: 0, monthlyRevAvg: 0, error: "No PriceLabs API key" };
  }

  try {
    const startMs = Date.now();
    const url = new URL(PRICELABS_API_URL);
    url.searchParams.set("address", address);
    url.searchParams.set("currency", "USD");
    url.searchParams.set("bedroom_category", String(bedrooms));
    url.searchParams.set("version", "2");

    console.log(`[PriceLabs] Fetching for "${address}" (${bedrooms}BR)...`);

    const response = await fetch(url.toString(), {
      headers: { "X-API-Key": PRICELABS_API_KEY },
      signal: AbortSignal.timeout(15000), // 15s hard timeout
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[PriceLabs] HTTP ${response.status}: ${errText}`);
      return { success: false, revenue50: 0, revenue25: 0, revenue75: 0, revenue90: 0, adr50: 0, adr25: 0, adr75: 0, adr90: 0, occupancy: 0, listingsCount: 0, monthlyRevAvg: 0, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const kpis = data?.KPIsByBedroomCategory?.[String(bedrooms)];

    if (!kpis) {
      // Try adjacent bedroom categories
      const allCategories = data?.KPIsByBedroomCategory || {};
      const closestKey = Object.keys(allCategories)
        .map(k => ({ key: k, diff: Math.abs(parseInt(k) - bedrooms) }))
        .sort((a, b) => a.diff - b.diff)[0]?.key;
      
      if (closestKey && allCategories[closestKey]) {
        const fallbackKpis = allCategories[closestKey];
        console.log(`[PriceLabs] No exact ${bedrooms}BR data, using ${closestKey}BR (${Date.now() - startMs}ms)`);
        return extractPriceLabsKPIs(fallbackKpis, Date.now() - startMs);
      }

      console.warn(`[PriceLabs] No data for ${bedrooms}BR at this address`);
      return { success: false, revenue50: 0, revenue25: 0, revenue75: 0, revenue90: 0, adr50: 0, adr25: 0, adr75: 0, adr90: 0, occupancy: 0, listingsCount: 0, monthlyRevAvg: 0, error: "No data for bedroom count" };
    }

    console.log(`[PriceLabs] Got data: ${kpis.NoOfListings} listings, Rev50=$${kpis.Revenue50PercentileSum} (${Date.now() - startMs}ms)`);
    return extractPriceLabsKPIs(kpis, Date.now() - startMs);
  } catch (error) {
    console.error("[PriceLabs] Error:", error);
    return { success: false, revenue50: 0, revenue25: 0, revenue75: 0, revenue90: 0, adr50: 0, adr25: 0, adr75: 0, adr90: 0, occupancy: 0, listingsCount: 0, monthlyRevAvg: 0, error: `${error}` };
  }
}

function extractPriceLabsKPIs(kpis: any, elapsedMs: number): PriceLabsResult {
  return {
    success: true,
    revenue50: kpis.Revenue50PercentileSum || 0,
    revenue25: kpis.Revenue25PercentileSum || 0,
    revenue75: kpis.Revenue75PercentileSum || 0,
    revenue90: kpis.Revenue90PercentileSum || 0,
    adr50: kpis.ADR50PercentileAvg || 0,
    adr25: kpis.ADR25PercentileAvg || 0,
    adr75: kpis.ADR75PercentileAvg || 0,
    adr90: kpis.ADR90PercentileAvg || 0,
    occupancy: kpis.AvgAdjustedOccupancy || kpis.AvgOccupancy || 55,
    listingsCount: kpis.NoOfListings || 0,
    monthlyRevAvg: kpis.RevenueMonthlyAvg || Math.round((kpis.Revenue50PercentileSum || 0) / 12),
  };
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

  // STEP 1: Filter out comps that are too far away (max 50 miles)
  // With bounding-box search, most results should already be within range
  const MAX_COMP_DISTANCE_MILES = 50;
  const distanceFiltered = listings.filter((l) => {
    if (!l.latitude || !l.longitude) return false; // Skip listings without coords entirely
    const dist = calcDistance(targetLat, targetLng, l.latitude, l.longitude);
    return dist <= MAX_COMP_DISTANCE_MILES;
  });
  // If distance filtering removed too many, use closest listings but NEVER show distant comps
  // Sort by distance and take the closest ones available
  const proximityFiltered = distanceFiltered.length >= 3 ? distanceFiltered : 
    [...listings]
      .filter((l) => l.latitude && l.longitude)
      .sort((a, b) => {
        const dA = calcDistance(targetLat, targetLng, a.latitude, a.longitude);
        const dB = calcDistance(targetLat, targetLng, b.latitude, b.longitude);
        return dA - dB;
      })
      .slice(0, 30);

  // STEP 2: Filter to similar bedroom count (within ±1)
  const bedroomFiltered = proximityFiltered.filter((l) => {
    const diff = Math.abs((l.bedrooms || targetBedrooms) - targetBedrooms);
    return targetBedrooms >= 6 ? (l.bedrooms || 0) >= 5 : diff <= 1;
  });

  // Use bedroom-filtered if we have enough, otherwise use proximity-filtered
  const compsForCalc = bedroomFiltered.length >= 5 ? bedroomFiltered : proximityFiltered;

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
  // Mountain-SUMMER markets (outdoor adventure, hiking, rafting — peak Jun-Aug)
  if ((lat >= 37 && lat <= 40 && lng >= -82 && lng <= -79) ||   // WV/VA Appalachian (New River Gorge, Shenandoah)
      (lat >= 35 && lat <= 37 && lng >= -79 && lng <= -76) ||   // NC Blue Ridge Parkway
      (lat >= 34 && lat <= 36 && lng >= -84 && lng <= -83) ||   // North GA mountains (summer hiking)
      (lat >= 35 && lat <= 37 && lng >= -94 && lng <= -91))     // Ozarks AR/MO
    return "mountain-summer";
  // Mountain-WINTER markets (ski resorts, winter tourism — peak Dec-Feb)
  if ((lat >= 35 && lat <= 37 && lng >= -84 && lng <= -82) ||   // Smoky Mountains TN/NC (Gatlinburg, Pigeon Forge)
      (lat >= 38 && lat <= 41 && lng >= -107 && lng <= -104) || // Colorado Rockies (ski)
      (lat >= 40 && lat <= 42 && lng >= -112 && lng <= -110) || // Utah mountains (Park City, ski)
      (lat >= 43 && lat <= 48 && lng >= -115 && lng <= -110) || // Idaho/Montana (ski)
      (lat >= 34 && lat <= 37 && lng >= -112 && lng <= -109))   // Arizona mountains (Sedona, Flagstaff — winter escape)
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
    "mountain-summer": [
      { name: "Hot Tub", boost: 22, priority: "MUST HAVE", icon: "♨️" },
      { name: "Fire Pit", boost: 15, priority: "HIGH IMPACT", icon: "🪵" },
      { name: "Outdoor Space", boost: 12, priority: "HIGH IMPACT", icon: "🌳" },
      { name: "Game Room", boost: 10, priority: "HIGH IMPACT", icon: "🎮" },
      { name: "Kayaks/Gear", boost: 8, priority: "NICE TO HAVE", icon: "🛶" },
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

// ============================================================================
// GOOGLE TRENDS SEASONALITY — Real backward-looking demand data
// ============================================================================

/**
 * Fetch Google Trends interest-over-time data for a search term.
 * Returns an array of 12 monthly average values (Jan=0..Dec=11), or null on failure.
 * Values are 0-100 scale (relative search interest).
 */
async function fetchGoogleTrendsMonthly(keyword: string): Promise<number[] | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const results = await googleTrends.interestOverTime({
      keyword,
      startTime: startDate,
      endTime: endDate,
      geo: "US",
    });

    const parsed = JSON.parse(results);
    const timeline = parsed.default?.timelineData || [];
    if (timeline.length === 0) return null;

    // Aggregate weekly data points into monthly averages
    const monthly: Record<number, { sum: number; count: number }> = {};
    for (const point of timeline) {
      const date = new Date(parseInt(point.time) * 1000);
      const m = date.getMonth(); // 0-11
      if (!monthly[m]) monthly[m] = { sum: 0, count: 0 };
      monthly[m].sum += point.value[0];
      monthly[m].count++;
    }

    const result: number[] = [];
    let hasData = false;
    for (let m = 0; m < 12; m++) {
      const val = monthly[m] ? Math.round(monthly[m].sum / monthly[m].count) : 0;
      result.push(val);
      if (val > 0) hasData = true;
    }

    // Need at least some non-zero months to be useful
    return hasData ? result : null;
  } catch (err) {
    console.log(`[GoogleTrends] Failed for "${keyword}": ${(err as Error).message?.substring(0, 100)}`);
    return null;
  }
}

/**
 * Convert Google Trends monthly values (0-100) into occupancy and ADR multipliers.
 * The peak month gets multiplier 1.0, and other months scale proportionally.
 * A floor of 0.20 prevents unrealistically low months.
 */
function trendsToMultipliers(trendsData: number[]): { occ: number[]; adr: number[] } {
  const max = Math.max(...trendsData);
  if (max === 0) return { occ: Array(12).fill(0.5), adr: Array(12).fill(0.9) };

  const occ = trendsData.map(v => {
    const raw = v / max; // 0.0 to 1.0
    return Math.max(0.20, Math.round(raw * 100) / 100); // Floor at 0.20
  });

  // ADR follows a dampened version of occupancy (prices don't swing as wildly as demand)
  const adr = occ.map(o => {
    // Map occ 0.20-1.00 to ADR 0.70-1.25
    const adrMult = 0.70 + (o - 0.20) * (0.55 / 0.80);
    return Math.round(adrMult * 100) / 100;
  });

  return { occ, adr };
}

/**
 * Try multiple Google Trends search terms for a location.
 * Returns the first one that has meaningful data.
 */
async function getGoogleTrendsSeasonality(city: string, state: string): Promise<{ occ: number[]; adr: number[] } | null> {
  // Build candidate search terms — broader terms work better on Google Trends
  const searchTerms: string[] = [];
  
  if (city && state) {
    searchTerms.push(`Airbnb ${city} ${state}`);
    searchTerms.push(`${city} ${state} vacation rental`);
    searchTerms.push(`${city} ${state} cabin rental`);
  }
  if (city) {
    searchTerms.push(`Airbnb ${city}`);
  }

  for (const term of searchTerms) {
    console.log(`[GoogleTrends] Trying: "${term}"`);
    const data = await fetchGoogleTrendsMonthly(term);
    if (data) {
      // Check that data has meaningful variation (not all zeros or all same value)
      const nonZero = data.filter(v => v > 0);
      if (nonZero.length >= 6) {
        console.log(`[GoogleTrends] SUCCESS with "${term}": [${data.join(", ")}]`);
        return trendsToMultipliers(data);
      }
    }
  }

  console.log(`[GoogleTrends] No usable data for ${city}, ${state} — using market-type fallback`);
  return null;
}

// Generate estimated monthly seasonality
// PRIMARY: Google Trends real backward-looking demand data
// FALLBACK: Hardcoded market-type patterns (always produces a result so chart always shows)
async function generateSeasonality(avgAdr: number, avgOccupancy: number, lat: number, lng: number, city?: string, state?: string): Promise<any[]> {
  const marketType = getMarketType(lat, lng);

  // Hardcoded fallback patterns by market type (Jan-Dec)
  const patterns: Record<string, { occ: number[]; adr: number[] }> = {
    beach: {
      occ: [0.45, 0.50, 0.65, 0.70, 0.85, 0.95, 1.00, 1.00, 0.80, 0.60, 0.45, 0.40],
      adr: [0.80, 0.85, 0.90, 0.95, 1.10, 1.20, 1.30, 1.30, 1.05, 0.90, 0.75, 0.75],
    },
    mountain: {
      occ: [0.85, 0.90, 0.80, 0.55, 0.50, 0.70, 0.85, 0.80, 0.65, 0.75, 0.70, 0.90],
      adr: [1.20, 1.15, 1.00, 0.80, 0.75, 0.90, 1.10, 1.05, 0.85, 0.95, 0.90, 1.25],
    },
    "mountain-summer": {
      occ: [0.25, 0.30, 0.45, 0.60, 0.80, 0.90, 1.00, 1.00, 0.70, 0.55, 0.35, 0.30],
      adr: [0.70, 0.75, 0.85, 0.90, 1.05, 1.15, 1.25, 1.25, 1.00, 0.90, 0.75, 0.75],
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

  // Try Google Trends for real data (non-blocking — if it fails, we use fallback)
  let pattern: { occ: number[]; adr: number[] } | null = null;
  if (city || state) {
    try {
      pattern = await getGoogleTrendsSeasonality(city || "", state || "");
    } catch (err) {
      console.log(`[GoogleTrends] Error: ${(err as Error).message?.substring(0, 100)}`);
    }
  }

  // Fallback to hardcoded market-type pattern
  if (!pattern) {
    pattern = patterns[marketType] || patterns.rural;
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  return pattern.occ.map((occMult, i) => {
    const monthOcc = Math.round(avgOccupancy * occMult);
    const monthAdr = Math.round(avgAdr * pattern!.adr[i]);
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
      data_provider: params.source || "airbnb-direct",
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
          
          // Ensure we have valid target coordinates — geocode if missing
          const hasValidTarget = cachedData.targetCoordinates && 
            cachedData.targetCoordinates.latitude !== 0 && 
            cachedData.targetCoordinates.longitude !== 0;
          
          let targetLat = hasValidTarget ? cachedData.targetCoordinates.latitude : 0;
          let targetLng = hasValidTarget ? cachedData.targetCoordinates.longitude : 0;
          
          if (!hasValidTarget) {
            const geocoded = await geocodeAddress(address);
            if (geocoded) {
              targetLat = geocoded.lat;
              targetLng = geocoded.lng;
              cachedData.targetCoordinates = { latitude: targetLat, longitude: targetLng };
              console.log(`[Analyze] Geocoded targetCoordinates for cached entry: ${targetLat}, ${targetLng}`);
              
              // Update cache entry in background
              supabase.from("property_cache").update({ data: cachedData }).eq("address", address)
                .then(({ error: updateErr }) => {
                  if (updateErr) console.error("[PropertyCache] Failed to backfill targetCoordinates:", updateErr.message);
                  else console.log(`[PropertyCache] Backfilled targetCoordinates for ${address}`);
                });
            }
          }
          
          // CRITICAL: Filter cached comps by distance from the actual address
          // Old cache entries may contain distant comps from before bounding-box search was implemented
          const MAX_CACHE_COMP_DIST = 50; // miles
          if (targetLat !== 0 && targetLng !== 0) {
            if (cachedData.comparables && Array.isArray(cachedData.comparables)) {
              const beforeCount = cachedData.comparables.length;
              cachedData.comparables = cachedData.comparables.filter((c: any) => {
                if (!c.latitude || !c.longitude || c.latitude === 0 || c.longitude === 0) return false;
                const dist = calcDistance(targetLat, targetLng, c.latitude, c.longitude);
                c.distance = Math.round(dist * 10) / 10; // Recalculate distance from actual address
                return dist <= MAX_CACHE_COMP_DIST;
              });
              // Re-sort by relevance (distance + bedroom match)
              const reqBedrooms = cachedData.bedroomsUsed || 3;
              cachedData.comparables.sort((a: any, b: any) => {
                const bedDiffA = Math.abs((a.bedrooms || reqBedrooms) - reqBedrooms);
                const bedDiffB = Math.abs((b.bedrooms || reqBedrooms) - reqBedrooms);
                const scoreA = (bedDiffA * 40) + (Math.min(a.distance / 15, 1) * 25);
                const scoreB = (bedDiffB * 40) + (Math.min(b.distance / 15, 1) * 25);
                return scoreA - scoreB;
              });
              cachedData.comparables = cachedData.comparables.slice(0, 30);
              console.log(`[PropertyCache] Distance-filtered comps: ${beforeCount} → ${cachedData.comparables.length} (within ${MAX_CACHE_COMP_DIST}mi)`);
            }
            if (cachedData.allComps && Array.isArray(cachedData.allComps)) {
              cachedData.allComps = cachedData.allComps.filter((c: any) => {
                if (!c.latitude || !c.longitude || c.latitude === 0 || c.longitude === 0) return false;
                const dist = calcDistance(targetLat, targetLng, c.latitude, c.longitude);
                c.distance = Math.round(dist * 10) / 10;
                return dist <= MAX_CACHE_COMP_DIST;
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
      const historical = cached.monthly_data || await generateSeasonality(finalAdr, finalOccupancy, latitude, longitude, city, state);

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
      // ALWAYS recalculate distance from actual geocoded coordinates (never trust cached distance)
      // This is critical when nearbyCacheByCity is used — cached distances are from a different center point
      const MAX_COMP_DISTANCE = 50;
      const allEnriched = (cached.listings || []).map((listing: any) => {
        const nightPrice = listing.nightPrice || 150;
        const occupancy = listing.occupancy || estimateOccupancy(listing.reviewsCount || 0);
        const annualRev = listing.annualRevenue || Math.round(nightPrice * 365 * (occupancy / 100));
        const monthlyRev = listing.monthlyRevenue || Math.round(annualRev / 12);
        // ALWAYS recalculate distance from THIS address's geocoded coordinates
        const distance = (listing.latitude && listing.longitude && listing.latitude !== 0 && listing.longitude !== 0)
          ? calcDistance(latitude, longitude, listing.latitude, listing.longitude)
          : 999; // No valid coordinates = exclude
        return { ...listing, occupancy, annualRevenue: annualRev, monthlyRevenue: monthlyRev, distance: Math.round(distance * 10) / 10 };
      }).filter((l: any) => l.distance <= MAX_COMP_DISTANCE);

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
        searchRadiusMiles: cached.searchRadiusMiles || 15,
      }));
    }

    // =====================================================================
    // STEP 3: HYBRID FETCH — PriceLabs (revenue data) + Airbnb Direct (comp markers)
    // Both run IN PARALLEL for 5-8 second total response time
    // PriceLabs = PRIMARY for revenue, ADR, occupancy, percentiles (licensed, accurate)
    // Airbnb Direct = comp map markers only (names, images, coordinates, prices)
    // =====================================================================
    console.log(`[Analyze] Cache MISS — fetching PriceLabs + Airbnb Direct in parallel... [${Date.now() - startTime}ms elapsed]`);

    const [priceLabsResult, scrapeResult] = await Promise.all([
      fetchPriceLabs(address, bedrooms),
      fetchAirbnbDirect(
        latitude,
        longitude,
        bedrooms,
        city || cityFromAddress,
        state || stateFromAddress,
      ),
    ]);

    console.log(`[Analyze] Parallel fetch done — PriceLabs: ${priceLabsResult.success ? 'OK' : priceLabsResult.error}, Airbnb: ${scrapeResult.success ? scrapeResult.listings.length + ' listings within ' + scrapeResult.searchRadiusMiles + 'mi' : scrapeResult.error} [${Date.now() - startTime}ms elapsed]`);

    // If BOTH fail, return error
    if (!priceLabsResult.success && (!scrapeResult.success || scrapeResult.listings.length === 0)) {
      console.warn(`[Analyze] Both data sources failed`);
      return NextResponse.json({
        success: false,
        error: "Unable to fetch rental data right now",
        message: `We couldn't find enough rental listings near ${city || cityFromAddress}, ${state || stateFromAddress}. This area may have limited short-term rental activity. Try a nearby city or a more popular market.`,
        suggestions: ["Nashville, TN", "Austin, TX", "Denver, CO", "Miami, FL", "Phoenix, AZ"],
      });
    }

    // =====================================================================
    // STEP 4: Enrich Airbnb listings for comp map markers
    // Then overlay PriceLabs data for the headline revenue/ADR/occupancy
    // =====================================================================
    let enriched: any[] = [];
    let allEnrichedForClient: any[] = [];
    let airbnbPercentiles: any = null;
    let airbnbAvgAdr = 0;
    let airbnbAvgOccupancy = 0;
    let airbnbAvgAnnualRevenue = 0;

    if (scrapeResult.success && scrapeResult.listings.length > 0) {
      const enrichResult = enrichListings(
        scrapeResult.listings,
        latitude,
        longitude,
        bedrooms,
        bathrooms,
        accommodates,
      );
      enriched = enrichResult.enriched;
      airbnbPercentiles = enrichResult.percentiles;
      airbnbAvgAdr = enrichResult.avgAdr;
      airbnbAvgOccupancy = enrichResult.avgOccupancy;
      airbnbAvgAnnualRevenue = enrichResult.avgAnnualRevenue;

      // Build allComps from the full raw listing set (before bedroom filtering)
      // Filter out comps > 50 miles away to avoid showing irrelevant distant listings on the map
      const MAX_COMP_DIST = 50;
      allEnrichedForClient = scrapeResult.listings.map((listing: any) => {
        const nightPrice = listing.nightPrice || 150;
        const occ = estimateOccupancy(listing.reviewsCount || 0);
        const annualRev = Math.round(nightPrice * 365 * (occ / 100));
        const monthlyRev = Math.round(annualRev / 12);
        const dist = calcDistance(latitude, longitude, listing.latitude, listing.longitude);
        return { ...listing, occupancy: occ, annualRevenue: annualRev, monthlyRevenue: monthlyRev, distance: Math.round(dist * 10) / 10 };
      }).filter((l: any) => l.distance <= MAX_COMP_DIST);
    }

    // =====================================================================
    // STEP 4b: Determine final metrics — PriceLabs PRIMARY, Airbnb FALLBACK
    // =====================================================================
    let finalAdr: number;
    let finalOccupancy: number;
    let finalAnnualRevenue: number;
    let finalPercentiles: any;
    let dataSourceLabel: string;

    if (priceLabsResult.success && priceLabsResult.revenue50 > 0) {
      // PriceLabs is PRIMARY — use its licensed, accurate data
      finalAdr = Math.round(priceLabsResult.adr50);
      finalOccupancy = Math.round(priceLabsResult.occupancy);
      finalAnnualRevenue = Math.round(priceLabsResult.revenue50);
      finalPercentiles = {
        revenue: {
          p25: Math.round(priceLabsResult.revenue25),
          p50: Math.round(priceLabsResult.revenue50),
          p75: Math.round(priceLabsResult.revenue75),
          p90: Math.round(priceLabsResult.revenue90),
        },
        adr: {
          p25: Math.round(priceLabsResult.adr25),
          p50: Math.round(priceLabsResult.adr50),
          p75: Math.round(priceLabsResult.adr75),
          p90: Math.round(priceLabsResult.adr90),
        },
        occupancy: {
          p25: Math.round(priceLabsResult.occupancy * 0.7),
          p50: Math.round(priceLabsResult.occupancy),
          p75: Math.round(Math.min(95, priceLabsResult.occupancy * 1.2)),
          p90: Math.round(Math.min(98, priceLabsResult.occupancy * 1.35)),
        },
      };
      dataSourceLabel = `pricelabs (${priceLabsResult.listingsCount} listings)`;
      console.log(`[Analyze] Using PriceLabs data: ADR $${finalAdr}, Occ ${finalOccupancy}%, Rev $${finalAnnualRevenue}/yr (${priceLabsResult.listingsCount} comps)`);
    } else {
      // Fallback to Airbnb-derived metrics
      finalAdr = airbnbAvgAdr;
      finalOccupancy = airbnbAvgOccupancy;
      finalAnnualRevenue = airbnbAvgAnnualRevenue;
      finalPercentiles = airbnbPercentiles || {
        revenue: { p25: 0, p50: 0, p75: 0, p90: 0 },
        adr: { p25: 0, p50: 0, p75: 0, p90: 0 },
        occupancy: { p25: 0, p50: 0, p75: 0, p90: 0 },
      };
      dataSourceLabel = "airbnb-direct";
      console.log(`[Analyze] PriceLabs unavailable, using Airbnb-derived data: ADR $${finalAdr}, Occ ${finalOccupancy}%, Rev $${finalAnnualRevenue}/yr`);
    }

    console.log(`[Analyze] Enrichment done — ${enriched.length} comp markers, source: ${dataSourceLabel} [${Date.now() - startTime}ms elapsed]`);

    // Generate seasonality from final metrics
    const historical = await generateSeasonality(finalAdr, finalOccupancy, latitude, longitude, city, state);

    // =====================================================================
    // STEP 5: Save to Supabase IN BACKGROUND (don't block response)
    // =====================================================================
    Promise.all([
      saveMarketData({
        cacheKey,
        lat: latitude,
        lng: longitude,
        city: city || cityFromAddress,
        state: state || stateFromAddress,
        bedrooms,
        searchAddress: address,
        avgAdr: finalAdr,
        avgOccupancy: finalOccupancy,
        avgAnnualRevenue: finalAnnualRevenue,
        avgMonthlyRevenue: Math.round(finalAnnualRevenue / 12),
        percentiles: finalPercentiles,
        listings: enriched,
        monthlyData: historical,
        source: dataSourceLabel,
        dataQuality: priceLabsResult.success ? "high" : (enriched.length >= 15 ? "high" : enriched.length >= 5 ? "standard" : "low"),
      }),
      saveLegacyCache(cacheKey, latitude, longitude, bedrooms, enriched),
      logAnalysis({
        address, city: city || cityFromAddress, state: state || stateFromAddress,
        lat: latitude, lng: longitude,
        bedrooms, bathrooms, guestCount: accommodates,
        annualRevenue: finalAnnualRevenue,
        monthlyRevenue: Math.round(finalAnnualRevenue / 12),
        adr: finalAdr, occupancy: finalOccupancy,
        source: dataSourceLabel, compCount: enriched.length,
        percentiles: finalPercentiles, seasonality: historical,
      }),
    ]).catch(err => console.error("[Analyze] Background save error:", err));

    console.log(`[Analyze] SUCCESS — ${enriched.length} comps, ADR $${finalAdr}, Occ ${finalOccupancy}%, Rev $${finalAnnualRevenue}/yr [${Date.now() - startTime}ms total]`);

    const responseData = buildResponse({
      city: city || cityFromAddress,
      state: state || stateFromAddress,
      street,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      adr: finalAdr,
      occupancy: finalOccupancy,
      annualRevenue: finalAnnualRevenue,
      percentiles: finalPercentiles,
      comparables: enriched.slice(0, 30),
      allComps: allEnrichedForClient,
      historical,
      totalListings: priceLabsResult.success ? priceLabsResult.listingsCount : scrapeResult.listings.length,
      filteredListings: priceLabsResult.success ? priceLabsResult.listingsCount : enriched.length,
      dataSource: dataSourceLabel,
      searchRadiusMiles: scrapeResult.searchRadiusMiles || 15,
    });

    // Save FULL response to property_cache for instant future lookups on this exact address
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
  searchRadiusMiles: number;
}) {
  const monthlyRevenue = Math.round(params.annualRevenue / 12);

  return {
    success: true,
    dataSource: params.dataSource,
    searchRadiusMiles: params.searchRadiusMiles,
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
      source: c.source || "airbnb-direct",
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
      source: c.source || "airbnb-direct",
      amenities: c.amenities || [],
      hostName: c.hostName || "",
      isSuperhost: c.isSuperhost || false,
    })),
  };
}
