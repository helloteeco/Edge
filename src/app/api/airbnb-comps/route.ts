import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Apify configuration
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
// tri_angle/airbnb-scraper is the most popular and reliable Airbnb scraper on Apify
const APIFY_ACTOR_ID = "tri_angle~airbnb-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

// Cache duration: 24 hours (Airbnb data doesn't change hourly)
const CACHE_DURATION_HOURS = 24;

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
    // Build Airbnb search URL with coordinates
    // Using Airbnb's map-based search which works for any location including rural areas
    const today = new Date();
    const defaultCheckIn = checkIn || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const defaultCheckOut = checkOut || new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Calculate bounding box (~10 mile radius for rural, ~5 mile for urban)
    // 0.1 degree ≈ 7 miles latitude
    const latDelta = 0.15; // ~10.5 miles
    const lngDelta = 0.15 / Math.cos((lat * Math.PI) / 180); // Adjust for latitude

    const neLat = lat + latDelta;
    const neLng = lng + lngDelta;
    const swLat = lat - latDelta;
    const swLng = lng - lngDelta;

    // Build the Airbnb search URL
    const searchUrl = `https://www.airbnb.com/s/homes?ne_lat=${neLat}&ne_lng=${neLng}&sw_lat=${swLat}&sw_lng=${swLng}&search_type=filter_change&tab_id=home_tab&refinement_paths[]=/homes&checkin=${defaultCheckIn}&checkout=${defaultCheckOut}&adults=1&room_types[]=Entire%20home/apt&min_bedrooms=${Math.max(1, bedrooms - 1)}`;

    console.log(`[Apify] Scraping Airbnb comps for ${lat},${lng} (${bedrooms}br)`);
    console.log(`[Apify] Search URL: ${searchUrl}`);

    // Start Apify actor run synchronously (waits for completion)
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: searchUrl }],
          maxListings: 30,
          // Only get search results, not individual listing pages (faster + cheaper)
          includeReviews: false,
          maxReviews: 0,
          calendarMonths: 0,
          // Proxy configuration (Apify handles this)
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"],
          },
        }),
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

    console.log(`[Apify] Run started: ${runId}`);

    // Poll for completion (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    let runStatus = "RUNNING";

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;

      const statusResponse = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      runStatus = statusData?.data?.status || "UNKNOWN";

      console.log(`[Apify] Run status (attempt ${attempts}): ${runStatus}`);
    }

    if (runStatus !== "SUCCEEDED") {
      console.error(`[Apify] Run did not succeed. Status: ${runStatus}`);
      return {
        success: false,
        listings: [],
        error: `Apify run ${runStatus === "RUNNING" ? "timed out" : "failed"}: ${runStatus}`,
      };
    }

    // Fetch results from the dataset
    const datasetId = runData?.data?.defaultDatasetId;
    const resultsResponse = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=30`
    );

    if (!resultsResponse.ok) {
      return { success: false, listings: [], error: "Failed to fetch Apify results" };
    }

    const rawListings = await resultsResponse.json();
    console.log(`[Apify] Got ${rawListings.length} raw listings`);

    // Transform Apify results to Edge's ComparableListing format
    const listings = rawListings
      .filter((item: any) => item.name && (item.pricing?.rate?.amount || item.price))
      .map((item: any, index: number) => {
        const nightlyPrice =
          item.pricing?.rate?.amount ||
          item.price ||
          0;

        const rating = item.rating || item.stars || 0;
        const reviewCount = item.reviewsCount || item.numberOfGuests || 0;
        const listingBedrooms = item.bedrooms || bedrooms;
        const listingBathrooms = item.bathrooms || 1;

        // Extract listing ID from URL
        const listingId =
          item.id ||
          item.url?.match(/rooms\/(\d+)/)?.[1] ||
          `apify_${index}`;

        // Get primary image
        const image =
          item.images?.[0]?.url ||
          item.images?.[0] ||
          item.thumbnail ||
          item.pictureUrl ||
          null;

        // Calculate lat/lng for the comp
        const compLat = item.location?.lat || item.lat || 0;
        const compLng = item.location?.lng || item.lng || 0;

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

    console.log(`[Apify] Transformed ${listings.length} listings`);
    return { success: true, listings };
  } catch (error) {
    console.error("[Apify] Scraping error:", error);
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
