import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Vercel Pro: allow up to 300 seconds for Apify scraping
export const maxDuration = 300;

// Apify configuration
// SWITCHED to new-fast-airbnb-scraper: $0.50/1000 results (pay-per-event, no proxy charges)
// Old tri_angle~airbnb-scraper was costing $2-26/run due to RESIDENTIAL proxy bandwidth
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_ACTOR_ID = "tri_angle~new-fast-airbnb-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_TIMEOUT_SECS = 120;

// Cache duration: 7 days (168 hours) — Airbnb listings are stable week-to-week, saves 7x Apify costs
const CACHE_DURATION_HOURS = 168;

// Generate a cache key from lat/lng/bedrooms (rounded to ~1 mile precision)
function getCacheKey(lat: number, lng: number, bedrooms: number): string {
  // Round to 2 decimal places (~1.1km / 0.7mi precision)
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${roundedLat}_${roundedLng}_${bedrooms}br`;
}

// Check Supabase cache for existing comp data
async function getCachedComps(cacheKey: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from("airbnb_comp_cache")
      .select("listings, created_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) return null;
    return data.listings as any[];
  } catch {
    return null;
  }
}

// Store comp data in Supabase cache
async function cacheComps(
  cacheKey: string,
  lat: number,
  lng: number,
  bedrooms: number,
  listings: any[]
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    await supabase.from("airbnb_comp_cache").upsert(
      {
        cache_key: cacheKey,
        latitude: lat,
        longitude: lng,
        bedrooms,
        listings: listings,
        listings_count: listings.length,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "cache_key" }
    );
  } catch (err) {
    console.error("[CompCache] Failed to cache:", err);
  }
}

// Call Apify to scrape Airbnb search results for a location
async function scrapeAirbnbComps(
  lat: number,
  lng: number,
  bedrooms: number,
  checkIn?: string,
  checkOut?: string
): Promise<{ success: boolean; listings: any[]; error?: string }> {
  if (!APIFY_API_TOKEN) {
    return { success: false, listings: [], error: "APIFY_API_TOKEN not configured" };
  }

  try {
    // Use the new fast scraper with locationQueries instead of startUrls
    const today = new Date();
    const defaultCheckIn = checkIn || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const defaultCheckOut = checkOut || new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Build location query from coordinates
    const locationQuery = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    console.log(`[Apify-Fast] Scraping comps for ${locationQuery} (${bedrooms}br)`);

    // Build input for new-fast-airbnb-scraper
    // NO proxy config needed — pay-per-event model includes all costs ($0.50/1000 results)
    const actorInput: any = {
      locationQueries: [locationQuery],
      checkIn: defaultCheckIn,
      checkOut: defaultCheckOut,
      locale: "en-US",
      currency: "USD",
      adults: 1,
      minBedrooms: Math.max(1, bedrooms - 1),
    };

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
      console.error("[Apify] Failed to start run:", runResponse.status, errorText);
      return { success: false, listings: [], error: `Apify error: ${runResponse.status}` };
    }

    const runData = await runResponse.json();
    const runId = runData?.data?.id;

    if (!runId) {
      console.error("[Apify] No run ID returned:", runData);
      return { success: false, listings: [], error: "No run ID returned from Apify" };
    }

    console.log(`[Apify-Fast] Run started: ${runId}`);

    // Poll for completion (max 120 seconds = 60 attempts × 2s)
    let attempts = 0;
    const maxAttempts = 60;
    let runStatus = "RUNNING";

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      try {
        const statusResponse = await fetch(
          `${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
        );
        const statusData = await statusResponse.json();
        runStatus = statusData?.data?.status || "UNKNOWN";
      } catch (pollErr) {
        console.warn(`[Apify-Fast] Poll error (attempt ${attempts}):`, pollErr);
      }

      if (attempts % 5 === 0) console.log(`[Apify-Fast] Run status (attempt ${attempts}): ${runStatus}`);
    }

    if (runStatus !== "SUCCEEDED") {
      // Abort runaway runs to prevent further charges
      if (runStatus === "RUNNING") {
        try {
          await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}/abort?token=${APIFY_API_TOKEN}`, { method: "POST" });
          console.warn(`[Apify-Fast] Aborted run ${runId} after timeout`);
        } catch (abortErr) {
          console.error(`[Apify-Fast] Failed to abort run:`, abortErr);
        }
      }
      console.error(`[Apify-Fast] Run did not succeed. Status: ${runStatus}`);
      return {
        success: false,
        listings: [],
        error: `Apify run ${runStatus === "RUNNING" ? "timed out" : "failed"}: ${runStatus}`,
      };
    }

    // Fetch results from the dataset — cap at 50
    const datasetId = runData?.data?.defaultDatasetId;
    const resultsResponse = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=50`
    );

    if (!resultsResponse.ok) {
      return { success: false, listings: [], error: "Failed to fetch Apify results" };
    }

    const rawListings = await resultsResponse.json();
    console.log(`[Apify-Fast] Got ${rawListings.length} raw listings`);

    // Transform results to Edge's ComparableListing format
    // The new fast scraper may have slightly different field names
    const listings = rawListings
      .filter((item: any) => item.name && (item.pricing?.rate?.amount || item.price || item.pricePerNight))
      .map((item: any, index: number) => {
        const nightlyPrice =
          item.pricing?.rate?.amount ||
          item.price ||
          item.pricePerNight ||
          0;

        const rating = item.rating || item.stars || 0;
        const reviewCount = item.reviewsCount || item.numberOfReviews || 0;
        const listingBedrooms = item.bedrooms || bedrooms;
        const listingBathrooms = item.bathrooms || 1;

        // Extract listing ID from URL
        const listingId =
          item.id ||
          item.roomId ||
          item.url?.match(/rooms\/(\d+)/)?.[1] ||
          `apify_${index}`;

        // Get primary image
        const image =
          item.images?.[0]?.url ||
          item.images?.[0] ||
          item.thumbnail ||
          item.pictureUrl ||
          item.image ||
          null;

        // Calculate lat/lng for the comp
        const compLat = item.location?.lat || item.lat || item.latitude || 0;
        const compLng = item.location?.lng || item.lng || item.longitude || 0;

        return {
          id: listingId,
          name: item.name || `${listingBedrooms} BR Listing`,
          url: item.url || `https://www.airbnb.com/rooms/${listingId}`,
          image: image,
          bedrooms: listingBedrooms,
          bathrooms: listingBathrooms,
          accommodates: item.personCapacity || item.maxGuests || listingBedrooms * 2,
          sqft: 0,
          nightPrice: Math.round(nightlyPrice),
          // These will be enriched by PriceLabs or estimated from nightly price
          occupancy: 0,
          monthlyRevenue: 0,
          annualRevenue: 0,
          rating: typeof rating === "number" ? rating : parseFloat(rating) || 0,
          reviewsCount: typeof reviewCount === "number" ? reviewCount : parseInt(reviewCount) || 0,
          propertyType: item.roomType || item.type || "Entire home",
          latitude: compLat,
          longitude: compLng,
          // Raw data for enrichment
          _raw: {
            amenities: item.amenities || [],
            hostName: item.host?.name || "",
            isSuperhost: item.host?.isSuperhost || false,
          },
        };
      });

    console.log(`[Apify-Fast] Transformed ${listings.length} listings`);
    return { success: true, listings };
  } catch (error) {
    console.error("[Apify-Fast] Scraping error:", error);
    return { success: false, listings: [], error: `Scraping failed: ${error}` };
  }
}

// Enrich comp listings with revenue estimates
// Uses PriceLabs market data if available, otherwise estimates from nightly price
function enrichCompsWithRevenue(
  listings: any[],
  marketOccupancy: number,
  marketAdr: number,
  targetLat: number,
  targetLng: number
): any[] {
  // Haversine distance calculation
  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat2 || !lon2) return 999;
    const R = 3959; // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Default occupancy if no market data: use review-based heuristic
  const defaultOccupancy = marketOccupancy || 55; // Conservative 55% default

  return listings.map((listing) => {
    const nightPrice = listing.nightPrice || marketAdr || 150;

    // Estimate occupancy from reviews if no market data
    // Industry heuristic: reviews/year × 3-5 ≈ bookings/year
    // Average stay ≈ 3 nights → bookings × 3 / 365 = occupancy
    let estimatedOccupancy = defaultOccupancy;
    if (listing.reviewsCount > 0 && !marketOccupancy) {
      // Assume listing has been active ~2 years, reviews = ~1/3 of stays
      const estimatedBookingsPerYear = (listing.reviewsCount / 2) * 3;
      const estimatedNightsPerYear = estimatedBookingsPerYear * 3;
      estimatedOccupancy = Math.min(85, Math.max(30, Math.round((estimatedNightsPerYear / 365) * 100)));
    }

    const occupancy = marketOccupancy || estimatedOccupancy;
    const annualRevenue = Math.round(nightPrice * 365 * (occupancy / 100));
    const monthlyRevenue = Math.round(annualRevenue / 12);

    // Calculate distance from target
    const distance = calcDistance(targetLat, targetLng, listing.latitude, listing.longitude);

    return {
      ...listing,
      occupancy,
      annualRevenue,
      monthlyRevenue,
      distance: Math.round(distance * 10) / 10,
      amenities: listing.amenities || listing._raw?.amenities || [],
      hostName: listing.hostName || listing._raw?.hostName || "",
      isSuperhost: listing.isSuperhost || listing._raw?.isSuperhost || false,
    };
  });
}

// POST endpoint — called by the calculator to get comparable listings
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`airbnb-comps:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const {
      latitude,
      longitude,
      bedrooms = 3,
      // Optional: market data from PriceLabs/Airbtics to enrich comps
      marketOccupancy = 0,
      marketAdr = 0,
      checkIn,
      checkOut,
    } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Step 1: Check cache
    const cacheKey = getCacheKey(latitude, longitude, bedrooms);
    const cachedListings = await getCachedComps(cacheKey);

    if (cachedListings && cachedListings.length > 0) {
      console.log(`[CompAPI] Cache hit for ${cacheKey}: ${cachedListings.length} listings`);

      // Enrich cached listings with current market data
      const enriched = enrichCompsWithRevenue(
        cachedListings,
        marketOccupancy,
        marketAdr,
        latitude,
        longitude
      );

      return NextResponse.json({
        success: true,
        source: "cache",
        listings: enriched,
        count: enriched.length,
      });
    }

    // Step 2: Scrape from Apify
    console.log(`[CompAPI] Cache miss for ${cacheKey}, scraping from Apify...`);
    const scrapeResult = await scrapeAirbnbComps(latitude, longitude, bedrooms, checkIn, checkOut);

    if (!scrapeResult.success || scrapeResult.listings.length === 0) {
      console.warn(`[CompAPI] Apify returned no results: ${scrapeResult.error}`);
      return NextResponse.json({
        success: false,
        source: "apify",
        error: scrapeResult.error || "No listings found in this area",
        listings: [],
        count: 0,
      });
    }

    // Step 3: Cache the raw results (before enrichment, so market data can be re-applied)
    await cacheComps(cacheKey, latitude, longitude, bedrooms, scrapeResult.listings);

    // Step 4: Enrich with revenue estimates
    const enriched = enrichCompsWithRevenue(
      scrapeResult.listings,
      marketOccupancy,
      marketAdr,
      latitude,
      longitude
    );

    return NextResponse.json({
      success: true,
      source: "apify",
      listings: enriched,
      count: enriched.length,
    });
  } catch (error) {
    console.error("[CompAPI] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint — check if comps are cached for a location
export async function GET(request: NextRequest) {
  try {
    const lat = parseFloat(request.nextUrl.searchParams.get("lat") || "0");
    const lng = parseFloat(request.nextUrl.searchParams.get("lng") || "0");
    const bedrooms = parseInt(request.nextUrl.searchParams.get("bedrooms") || "3");

    if (!lat || !lng) {
      return NextResponse.json({ success: false, error: "lat and lng required" }, { status: 400 });
    }

    const cacheKey = getCacheKey(lat, lng, bedrooms);
    const cached = await getCachedComps(cacheKey);

    return NextResponse.json({
      success: true,
      cached: !!cached,
      count: cached?.length || 0,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
