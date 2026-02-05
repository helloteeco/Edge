import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

// Mashvisor API key - MUST be set in environment variables
const MASHVISOR_API_KEY = process.env.MASHVISOR_API_KEY;

if (!MASHVISOR_API_KEY) {
  console.error("MASHVISOR_API_KEY environment variable is not set");
}
const MASHVISOR_HOST = "mashvisor-api.p.rapidapi.com";

// Airbtics API configuration (primary data source for accurate STR data)
const AIRBTICS_API_KEY = process.env.AIRBTICS_API_KEY || "";
const AIRBTICS_BASE_URL = "https://crap0y5bx5.execute-api.us-east-2.amazonaws.com/prod";

// Helper function to determine market type based on location
function getMarketType(lat: number, lng: number): string {
  // Mountain markets (Colorado, Utah mountains, Smokies, etc.)
  if ((lat >= 35 && lat <= 37 && lng >= -84 && lng <= -82) || // Smokies
      (lat >= 38 && lat <= 41 && lng >= -107 && lng <= -104) || // Colorado
      (lat >= 40 && lat <= 42 && lng >= -112 && lng <= -110)) { // Utah
    return 'mountain';
  }
  // Beach markets (Florida, Gulf Coast, California coast)
  if ((lat >= 24 && lat <= 31 && lng >= -88 && lng <= -80) || // Florida/Gulf
      (lat >= 32 && lat <= 38 && lng >= -124 && lng <= -117)) { // California coast
    return 'beach';
  }
  // Lake markets (common lake areas)
  if ((lat >= 35 && lat <= 37 && lng >= -86 && lng <= -84) || // Tennessee lakes
      (lat >= 42 && lat <= 47 && lng >= -90 && lng <= -82)) { // Great Lakes
    return 'lake';
  }
  // Desert markets (Arizona, Nevada)
  if ((lat >= 31 && lat <= 37 && lng >= -115 && lng <= -109)) {
    return 'desert';
  }
  // Urban markets (major metros - simplified check)
  if ((lat >= 40.5 && lat <= 41 && lng >= -74.5 && lng <= -73.5) || // NYC
      (lat >= 33.5 && lat <= 34.5 && lng >= -118.5 && lng <= -117.5) || // LA
      (lat >= 41.5 && lat <= 42 && lng >= -88 && lng <= -87)) { // Chicago
    return 'urban';
  }
  return 'rural';
}

// Get recommended amenities based on market type and top performers
function getRecommendedAmenities(lat: number, lng: number, comps: any[]): any[] {
  const marketType = getMarketType(lat, lng);
  
  // Base amenities that boost revenue across all markets
  const baseAmenities = [
    { name: 'High-Speed WiFi', boost: 5, priority: 'MUST HAVE', icon: '📶' },
    { name: 'Smart TV with Streaming', boost: 3, priority: 'MUST HAVE', icon: '📺' },
  ];
  
  // Market-specific amenities
  const marketAmenities: Record<string, any[]> = {
    mountain: [
      { name: 'Hot Tub', boost: 22, priority: 'MUST HAVE', icon: '♨️' },
      { name: 'Fireplace', boost: 15, priority: 'HIGH IMPACT', icon: '🔥' },
      { name: 'Game Room', boost: 12, priority: 'HIGH IMPACT', icon: '🎮' },
      { name: 'Mountain Views', boost: 10, priority: 'HIGH IMPACT', icon: '🏔️' },
      { name: 'Fire Pit', boost: 8, priority: 'NICE TO HAVE', icon: '🪵' },
    ],
    beach: [
      { name: 'Pool', boost: 25, priority: 'MUST HAVE', icon: '🏊' },
      { name: 'Ocean View', boost: 20, priority: 'HIGH IMPACT', icon: '🌊' },
      { name: 'Beach Gear', boost: 10, priority: 'HIGH IMPACT', icon: '🏖️' },
      { name: 'Outdoor Shower', boost: 8, priority: 'NICE TO HAVE', icon: '🚿' },
      { name: 'Kayaks/Paddleboards', boost: 7, priority: 'NICE TO HAVE', icon: '🛶' },
    ],
    lake: [
      { name: 'Boat Dock', boost: 28, priority: 'MUST HAVE', icon: '⚓' },
      { name: 'Kayaks/Canoes', boost: 15, priority: 'HIGH IMPACT', icon: '🛶' },
      { name: 'Lake View', boost: 12, priority: 'HIGH IMPACT', icon: '🏞️' },
      { name: 'Fire Pit', boost: 10, priority: 'HIGH IMPACT', icon: '🪵' },
      { name: 'Fishing Gear', boost: 6, priority: 'NICE TO HAVE', icon: '🎣' },
    ],
    desert: [
      { name: 'Pool', boost: 30, priority: 'MUST HAVE', icon: '🏊' },
      { name: 'Outdoor Kitchen', boost: 15, priority: 'HIGH IMPACT', icon: '🍳' },
      { name: 'Fire Pit', boost: 12, priority: 'HIGH IMPACT', icon: '🪵' },
      { name: 'Mountain Views', boost: 10, priority: 'HIGH IMPACT', icon: '🏜️' },
      { name: 'Hot Tub', boost: 8, priority: 'NICE TO HAVE', icon: '♨️' },
    ],
    urban: [
      { name: 'Parking', boost: 20, priority: 'MUST HAVE', icon: '🅿️' },
      { name: 'Workspace', boost: 15, priority: 'HIGH IMPACT', icon: '💼' },
      { name: 'Gym Access', boost: 10, priority: 'HIGH IMPACT', icon: '🏋️' },
      { name: 'Rooftop/Balcony', boost: 12, priority: 'HIGH IMPACT', icon: '🌆' },
      { name: 'Washer/Dryer', boost: 8, priority: 'NICE TO HAVE', icon: '🧺' },
    ],
    rural: [
      { name: 'Hot Tub', boost: 18, priority: 'MUST HAVE', icon: '♨️' },
      { name: 'Fire Pit', boost: 12, priority: 'HIGH IMPACT', icon: '🪵' },
      { name: 'Outdoor Space', boost: 10, priority: 'HIGH IMPACT', icon: '🌳' },
      { name: 'Game Room', boost: 8, priority: 'NICE TO HAVE', icon: '🎮' },
      { name: 'Grill/BBQ', boost: 6, priority: 'NICE TO HAVE', icon: '🍖' },
    ],
  };
  
  const specificAmenities = marketAmenities[marketType] || marketAmenities.rural;
  
  return [
    ...baseAmenities,
    ...specificAmenities,
  ].slice(0, 7); // Return top 7 amenities
}

// Cache for Airbtics reports (60 minutes per TOS)
const airbticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

// Geocode address to get lat/lng for Airbtics
// Falls back to city-level geocoding if full address fails
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Use Nominatim (OpenStreetMap) for geocoding - free and no API key needed
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    console.log("Geocoding address:", address);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EdgeByTeeco/1.0 (contact@teeco.co)",
      },
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
      console.log("Geocoded coordinates (full address):", coords);
      return coords;
    }
    
    // Fallback: Try city-level geocoding if full address fails
    const addressParts = address.split(",").map((p: string) => p.trim());
    if (addressParts.length >= 2) {
      const city = addressParts[1];
      const stateCountry = addressParts.slice(2).join(", ");
      const cityQuery = `${city}, ${stateCountry}`;
      console.log("Falling back to city-level geocoding:", cityQuery);
      
      const cityUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1`;
      const cityResponse = await fetch(cityUrl, {
        headers: {
          "User-Agent": "EdgeByTeeco/1.0 (contact@teeco.co)",
        },
      });
      const cityData = await cityResponse.json();
      
      if (cityData && cityData.length > 0) {
        const result = cityData[0];
        const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        console.log("Geocoded coordinates (city-level):", coords);
        return coords;
      }
    }
    
    console.log("No geocoding results for:", address);
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Call Airbtics API for accurate STR data
// Uses report/all ($0.50) to get 30+ comparable listings for investor-grade analysis
async function fetchAirbticsData(lat: number, lng: number, bedrooms: number, bathrooms: number, accommodates: number = 6): Promise<any | null> {
  if (!AIRBTICS_API_KEY) {
    console.log("Airbtics API key not configured, skipping...");
    return null;
  }

  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${bedrooms}`;
  const cached = airbticsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("Airbtics cache hit for:", cacheKey);
    return cached.data;
  }

  try {
    console.log("Calling Airbtics API (report/all) for:", { lat, lng, bedrooms });
    
    // Step 1: Request a full report with comparables ($0.50 per call)
    const createResponse = await fetch(`${AIRBTICS_BASE_URL}/report/all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AIRBTICS_API_KEY,
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        bedrooms,
        bathrooms: bathrooms || Math.ceil(bedrooms / 2),
        accommodates: accommodates || bedrooms * 2,
      }),
    });

    if (!createResponse.ok) {
      console.error("Airbtics create error:", createResponse.status);
      return null;
    }

    const createResult = await createResponse.json();
    // The API returns { message: { report_id: "..." } }
    const reportId = createResult.report_id || createResult.message?.report_id;
    
    if (!reportId) {
      console.error("No report_id from Airbtics, response:", JSON.stringify(createResult));
      return null;
    }
    
    console.log("Airbtics report_id:", reportId);

    // Step 2: Fetch the report (free call)
    const reportResponse = await fetch(`${AIRBTICS_BASE_URL}/report?id=${reportId}`, {
      method: "GET",
      headers: { "x-api-key": AIRBTICS_API_KEY },
    });

    if (!reportResponse.ok) {
      console.error("Airbtics report fetch error:", reportResponse.status);
      return null;
    }

    const reportResponse2 = await reportResponse.json();
    // The API wraps the data in a 'message' object
    const rawData = reportResponse2.message || reportResponse2;
    
    // Extract data from the correct structure (kpis contains percentile data)
    const kpis = rawData.kpis || {};
    const p50 = kpis["50"] || {};
    const p25 = kpis["25"] || {};
    const p75 = kpis["75"] || {};
    const p90 = kpis["90"] || {};
    
    // Transform to a normalized structure
    const reportData = {
      revenue: p50.ltm_revenue || 0,
      nightly_rate: p50.ltm_nightly_rate || 0,
      occupancy_rate: p50.ltm_occupancy_rate || 0,
      percentiles: {
        revenue: {
          p25: p25.ltm_revenue || 0,
          p50: p50.ltm_revenue || 0,
          p75: p75.ltm_revenue || 0,
          p90: p90.ltm_revenue || 0,
        },
        adr: {
          p25: p25.ltm_nightly_rate || 0,
          p50: p50.ltm_nightly_rate || 0,
          p75: p75.ltm_nightly_rate || 0,
          p90: p90.ltm_nightly_rate || 0,
        },
        occupancy: {
          p25: p25.ltm_occupancy_rate || 0,
          p50: p50.ltm_occupancy_rate || 0,
          p75: p75.ltm_occupancy_rate || 0,
          p90: p90.ltm_occupancy_rate || 0,
        },
      },
      comps: rawData.comps || [],
      monthly_occupancy: p50.monthly_occupancy_rate || {},
      monthly_adr: p50.monthly_adr || {},
      monthly_revenue: p50.monthly_revenue || {},
    };
    
    console.log("Airbtics data received:", {
      revenue: reportData.revenue,
      nightlyRate: reportData.nightly_rate,
      occupancy: reportData.occupancy_rate,
      comparablesCount: reportData.comps?.length || 0,
      percentiles: reportData.percentiles.revenue,
      monthlyRevenueKeys: Object.keys(reportData.monthly_revenue || {}),
      monthlyOccKeys: Object.keys(reportData.monthly_occupancy || {}),
      monthlyAdrKeys: Object.keys(reportData.monthly_adr || {}),
    });
    
    // Log sample monthly data for debugging
    if (Object.keys(reportData.monthly_revenue || {}).length > 0) {
      const sampleKey = Object.keys(reportData.monthly_revenue)[0];
      console.log("Sample monthly_revenue:", sampleKey, "=", reportData.monthly_revenue[sampleKey]);
    }

    // Cache the result
    airbticsCache.set(cacheKey, { data: reportData, timestamp: Date.now() });
    return reportData;
  } catch (error) {
    console.error("Airbtics API error:", error);
    return null;
  }
}

// Helper to make Mashvisor API calls
async function mashvisorFetch(endpoint: string) {
  const url = `https://${MASHVISOR_HOST}${endpoint}`;
  console.log("Mashvisor API call:", url);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": MASHVISOR_API_KEY || "",
      "x-rapidapi-host": MASHVISOR_HOST,
    },
  });
  return response.json();
}

// Calculate percentiles from an array of numbers
function calculatePercentiles(values: number[]) {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * 0.25)] || 0;
  const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
  const p75 = sorted[Math.floor(sorted.length * 0.75)] || 0;
  const p90 = sorted[Math.floor(sorted.length * 0.90)] || 0;
  return { p25, p50, p75, p90 };
}

// Rural/vacation market states and keywords that typically have underestimated data
const RURAL_VACATION_STATES = ["WV", "VT", "ME", "NH", "MT", "WY", "ID", "AK"];
const VACATION_KEYWORDS = ["gorge", "mountain", "lake", "beach", "ski", "resort", "cabin", "lodge", "retreat"];

// Check if this is likely a rural/vacation market
function isRuralVacationMarket(state: string, city: string, neighborhoodName: string): boolean {
  const stateUpper = state.toUpperCase();
  const searchText = `${city} ${neighborhoodName}`.toLowerCase();
  
  if (RURAL_VACATION_STATES.includes(stateUpper)) return true;
  if (VACATION_KEYWORDS.some(kw => searchText.includes(kw))) return true;
  return false;
}

// Bedroom-based ADR multipliers (relative to 3BR baseline)
const BEDROOM_ADR_MULTIPLIERS: Record<number, number> = {
  1: 0.55,  // Studios/1BR are much cheaper
  2: 0.75,  // 2BR is below average
  3: 1.0,   // 3BR is baseline
  4: 1.35,  // 4BR commands premium
  5: 1.70,  // 5BR is significantly higher
  6: 2.10,  // 6+ BR is luxury tier
};

// Get bedroom multiplier
function getBedroomMultiplier(bedrooms: number): number {
  if (bedrooms >= 6) return BEDROOM_ADR_MULTIPLIERS[6];
  return BEDROOM_ADR_MULTIPLIERS[bedrooms] || 1.0;
}

// REMOVED: Rural market correction multipliers
// These were causing inflated values. Now using Airbtics for accurate data.
// const RURAL_CORRECTION = { adr: 2.5, occupancy: 1.8, revenue: 3.0 };

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for property analysis (uses credits)
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
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Parse address to extract components
    const addressParts = address.split(",").map((p: string) => p.trim());
    const street = addressParts[0] || "";
    const city = addressParts[1] || "";
    const stateZip = addressParts[2] || "";
    const state = stateZip.split(" ")[0] || "";
    const zip = stateZip.split(" ")[1] || "";

    console.log("Parsed address:", { street, city, state, zip, bedrooms, bathrooms });

    // =========================================================================
    // STEP 0: Try Airbtics first for accurate STR data (primary source)
    // =========================================================================
    let airbticsData = null;
    const coords = await geocodeAddress(address);
    
    // Store coordinates for distance calculations and amenity recommendations
    let latitude = 0;
    let longitude = 0;
    
    if (coords) {
      console.log("Geocoded coordinates:", coords);
      latitude = coords.lat;
      longitude = coords.lng;
      airbticsData = await fetchAirbticsData(coords.lat, coords.lng, bedrooms, bathrooms, accommodates);
    }

    let property = null;
    let neighborhoodId = null;
    let neighborhoodData = null;
    let dataSource = airbticsData ? "airbtics" : "neighborhood";

    // =========================================================================
    // STEP 1: Try to get property info (may fail for many addresses)
    // =========================================================================
    try {
      const propertyData = await mashvisorFetch(
        `/property?address=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip_code=${encodeURIComponent(zip)}`
      );

      if (propertyData.status === "success" && propertyData.content) {
        property = propertyData.content;
        neighborhoodId = property.neighborhood?.id;
        dataSource = "property";
        console.log("Found property, neighborhood ID:", neighborhoodId);
      }
    } catch (e) {
      console.log("Property lookup failed (expected for many addresses):", e);
    }

    // =========================================================================
    // STEP 2: FALLBACK - Search neighborhoods by city/state
    // =========================================================================
    if (!neighborhoodId && city && state) {
      console.log("Property not found, falling back to city neighborhood search...");
      try {
        const searchData = await mashvisorFetch(
          `/city/neighborhoods/${encodeURIComponent(state)}/${encodeURIComponent(city)}?page=1&items=10`
        );
        
        if (searchData.status === "success" && searchData.content?.results?.length > 0) {
          neighborhoodId = searchData.content.results[0].id;
          console.log("Found neighborhood via city search:", neighborhoodId, searchData.content.results[0].name);
        }
      } catch (e) {
        console.log("Neighborhood search failed:", e);
      }
    }

    // =========================================================================
    // STEP 3: SECOND FALLBACK - Try city-level data directly
    // =========================================================================
    if (!neighborhoodId && city && state) {
      console.log("No neighborhood found, trying city-level data...");
      try {
        const cityData = await mashvisorFetch(
          `/city/overview/${encodeURIComponent(state)}/${encodeURIComponent(city)}`
        );
        
        if (cityData.status === "success" && cityData.content) {
          neighborhoodData = {
            name: city,
            city: city,
            state: state,
            airbnb_rental: {
              night_price: cityData.content.airbnb_night_price,
              occupancy: cityData.content.airbnb_occupancy,
              rental_income: cityData.content.airbnb_rental,
            },
            num_of_airbnb_properties: cityData.content.num_of_airbnb_listings,
            median_price: cityData.content.median_price,
            walkscore: cityData.content.walk_score,
            transitscore: cityData.content.transit_score,
            bikescore: cityData.content.bike_score,
          };
          dataSource = "city";
          console.log("Using city-level data for:", city);
        }
      } catch (e) {
        console.log("City data fetch failed:", e);
      }
    }

    // =========================================================================
    // STEP 4: Get neighborhood bar data (main STR metrics)
    // =========================================================================
    if (neighborhoodId && !neighborhoodData) {
      try {
        const nbData = await mashvisorFetch(
          `/neighborhood/${neighborhoodId}/bar?state=${encodeURIComponent(state)}`
        );
        if (nbData.status === "success" && nbData.content) {
          neighborhoodData = nbData.content;
          console.log("Got neighborhood bar data:", neighborhoodData.name);
        }
      } catch (e) {
        console.log("Neighborhood bar fetch failed:", e);
      }
    }

    // =========================================================================
    // STEP 5: Get active listings and FILTER BY BEDROOM COUNT
    // =========================================================================
    let listingsData = null;
    let percentileData = {
      revenue: { p25: 0, p50: 0, p75: 0, p90: 0 },
      adr: { p25: 0, p50: 0, p75: 0, p90: 0 },
      occupancy: { p25: 0, p50: 0, p75: 0, p90: 0 },
    };
    let comparableListings: any[] = [];
    let totalListingsInArea = 0;
    let filteredListingsCount = 0;

    // Track bedroom-specific metrics from filtered listings
    let bedroomSpecificAdr = 0;
    let bedroomSpecificOccupancy = 0;
    let bedroomSpecificRevenue = 0;

    if (city && state) {
      try {
        let listingsEndpoint = `/airbnb-property/active-listings?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}&page=1&items=200`;
        
        if (neighborhoodId) {
          listingsEndpoint += `&neighborhood_id=${neighborhoodId}`;
        }

        console.log("Fetching listings for filtering...");
        const listingsResponse = await mashvisorFetch(listingsEndpoint);
        
        if (listingsResponse.status === "success" && listingsResponse.content?.properties?.length > 0) {
          listingsData = listingsResponse.content;
          const allProps = listingsData.properties;
          totalListingsInArea = allProps.length;
          console.log(`Found ${allProps.length} total listings`);

          // =====================================================================
          // CRITICAL: Filter listings by bedroom count
          // =====================================================================
          const targetBedrooms = bedrooms;
          const filteredProps = allProps.filter((p: any) => {
            const listingBedrooms = p.num_of_rooms || 0;
            if (targetBedrooms >= 6) {
              return listingBedrooms >= 6;
            }
            // Allow +/- 1 bedroom for more data points
            return Math.abs(listingBedrooms - targetBedrooms) <= 1;
          });

          // Exact match filter for stricter comparison
          const exactMatchProps = allProps.filter((p: any) => {
            const listingBedrooms = p.num_of_rooms || 0;
            if (targetBedrooms >= 6) return listingBedrooms >= 6;
            return listingBedrooms === targetBedrooms;
          });

          filteredListingsCount = exactMatchProps.length;
          console.log(`Filtered to ${filteredProps.length} listings (${exactMatchProps.length} exact match) for ${targetBedrooms}${targetBedrooms >= 6 ? '+' : ''} bedrooms`);

          // Use filtered listings if we have enough, otherwise use all
          const propsForCalculation = filteredProps.length >= 3 ? filteredProps : allProps;
          
          // Extract values for percentile calculation
          const revenues = propsForCalculation.map((p: any) => (p.rental_income || 0) * 12).filter((v: number) => v > 0);
          const adrs = propsForCalculation.map((p: any) => p.night_price).filter((v: number) => v > 0);
          const occupancies = propsForCalculation.map((p: any) => p.occupancy).filter((v: number) => v > 0);

          // Calculate real percentiles (annual revenue)
          percentileData = {
            revenue: calculatePercentiles(revenues),
            adr: calculatePercentiles(adrs),
            occupancy: calculatePercentiles(occupancies),
          };

          // =====================================================================
          // CALCULATE BEDROOM-SPECIFIC AVERAGES from filtered listings
          // =====================================================================
          if (exactMatchProps.length > 0) {
            const validAdrs = exactMatchProps.map((p: any) => p.night_price).filter((v: number) => v > 0);
            const validOccs = exactMatchProps.map((p: any) => p.occupancy).filter((v: number) => v > 0);
            const validRevs = exactMatchProps.map((p: any) => p.rental_income).filter((v: number) => v > 0);
            
            if (validAdrs.length > 0) {
              bedroomSpecificAdr = validAdrs.reduce((a: number, b: number) => a + b, 0) / validAdrs.length;
            }
            if (validOccs.length > 0) {
              bedroomSpecificOccupancy = validOccs.reduce((a: number, b: number) => a + b, 0) / validOccs.length;
            }
            if (validRevs.length > 0) {
              bedroomSpecificRevenue = validRevs.reduce((a: number, b: number) => a + b, 0) / validRevs.length;
            }
          }

          console.log("Bedroom-specific metrics:", { bedroomSpecificAdr, bedroomSpecificOccupancy, bedroomSpecificRevenue });

          // Get top 20 comparable listings (prefer exact bedroom match)
          const compsSource = exactMatchProps.length >= 3 ? exactMatchProps : filteredProps.length >= 3 ? filteredProps : allProps;
          comparableListings = compsSource
            .filter((p: any) => p.rental_income > 0)
            .sort((a: any, b: any) => b.rental_income - a.rental_income)
            .slice(0, 30)
            .map((p: any) => {
              // Calculate bedroom and bathroom differences for match quality
              const bedroomDiff = Math.abs((p.num_of_rooms || 0) - bedrooms);
              const bathroomDiff = Math.abs((p.num_of_baths || 0) - bathrooms);
              
              // Determine match quality based on bedroom/bathroom similarity
              let matchQuality: 'excellent' | 'good' | 'fair' | 'weak' = 'weak';
              if (bedroomDiff === 0 && bathroomDiff <= 1) matchQuality = 'excellent';
              else if (bedroomDiff <= 1 && bathroomDiff <= 1) matchQuality = 'good';
              else if (bedroomDiff <= 2) matchQuality = 'fair';
              
              return {
                id: p.id,
                name: p.name || `${p.num_of_rooms} BR in ${city}`,
                url: p.url || `https://www.airbnb.com/rooms/${p.id}`,
                image: p.image,
                bedrooms: p.num_of_rooms,
                bathrooms: p.num_of_baths,
                sqft: p.sqft || 0,
                nightPrice: p.night_price,
                occupancy: p.occupancy,
                monthlyRevenue: p.rental_income,
                annualRevenue: p.rental_income * 12,
                rating: p.star_rating,
                reviewsCount: p.reviews_count,
                propertyType: p.property_type,
                // Add coordinates for map display
                latitude: p.latitude || p.lat || null,
                longitude: p.longitude || p.lng || p.lon || null,
                // Add match quality for confidence ranking
                matchQuality: matchQuality,
                bedroomDiff: bedroomDiff,
              };
            });
        } else {
          console.log("No listings found for this area");
        }
      } catch (e) {
        console.log("Listings fetch failed:", e);
      }
    }

    // =========================================================================
    // STEP 6: Get historical occupancy data for seasonality
    // =========================================================================
    let historicalData: any[] = [];
    if (neighborhoodId) {
      try {
        const histResponse = await mashvisorFetch(
          `/neighborhood/${neighborhoodId}/historical/airbnb?state=${encodeURIComponent(state)}`
        );
        if (histResponse.status === "success" && histResponse.content?.results) {
          // Transform Mashvisor historical data to include revenue calculations
          const rawHistorical = histResponse.content.results.slice(0, 12).reverse();
          historicalData = rawHistorical.map((item: any) => {
            const occ = item.value || item.occupancy || 50;
            const adr = adjustedAdr; // Use the bedroom-adjusted ADR
            const monthlyRev = Math.round(adr * (occ / 100) * 30);
            return {
              year: item.year || 2025,
              month: item.month || 1,
              occupancy: occ,
              adr: adr,
              revenue: monthlyRev,
            };
          });
          console.log("Mashvisor historical data transformed:", historicalData.length, "months");
        }
      } catch (e) {
        console.log("Historical data fetch failed:", e);
      }
    }

    // =========================================================================
    // FINAL CHECK: If we have no data at all, return helpful error
    // =========================================================================
    if (!neighborhoodData && !listingsData) {
      return NextResponse.json({
        success: false,
        error: "No STR data found for this location",
        message: `We couldn't find short-term rental data for ${city}, ${state}. Try a nearby larger city.`,
        suggestions: [
          "Nashville, TN",
          "Austin, TX", 
          "Denver, CO",
          "Miami, FL",
          "Phoenix, AZ",
        ],
      });
    }

    // =========================================================================
    // BUILD RESPONSE WITH BEDROOM-SPECIFIC AND RURAL-CORRECTED DATA
    // =========================================================================
    const airbnbRental = neighborhoodData?.airbnb_rental || {};
    const neighborhoodName = neighborhoodData?.name || city;

    // Base metrics from Mashvisor neighborhood data
    let baseOccupancy = airbnbRental.occupancy || neighborhoodData?.avg_occupancy || 50;
    let baseAdr = airbnbRental.night_price || 100;
    let baseMonthlyRevenue = airbnbRental.rental_income || 0;

    // =========================================================================
    // APPLY BEDROOM-SPECIFIC ADJUSTMENTS
    // If we have bedroom-specific data from listings, use it
    // Otherwise, apply multiplier to base data
    // =========================================================================
    const bedroomMultiplier = getBedroomMultiplier(bedrooms);
    
    let adjustedAdr = bedroomSpecificAdr > 0 ? bedroomSpecificAdr : baseAdr * bedroomMultiplier;
    let adjustedOccupancy = bedroomSpecificOccupancy > 0 ? bedroomSpecificOccupancy : baseOccupancy;
    let adjustedMonthlyRevenue = bedroomSpecificRevenue > 0 ? bedroomSpecificRevenue : baseMonthlyRevenue * bedroomMultiplier;

    // =========================================================================
    // RURAL MARKET DETECTION (for logging only - no corrections applied)
    // Airbtics provides accurate data, so no multipliers needed
    // =========================================================================
    const isRuralMarket = isRuralVacationMarket(state, city, neighborhoodName);
    const ruralCorrectionApplied = false; // No longer applying corrections

    if (isRuralMarket) {
      console.log("Rural/vacation market detected:", city, state, "- using raw Mashvisor data (Airbtics recommended for accuracy)");
    }

    // If we still have no monthly revenue, calculate from ADR and occupancy
    if (adjustedMonthlyRevenue === 0 && adjustedAdr > 0 && adjustedOccupancy > 0) {
      adjustedMonthlyRevenue = adjustedAdr * (adjustedOccupancy / 100) * 30;
    }

    // =========================================================================
    // USE AIRBTICS DATA IF AVAILABLE (more accurate than Mashvisor)
    // =========================================================================
    let annualRevenue: number;
    let revenueSource: 'comps_weighted' | 'airbtics_aggregate' | 'mashvisor' = 'mashvisor';
    
    if (airbticsData && airbticsData.revenue > 0) {
      // Start with Airbtics aggregate revenue as baseline
      let baseRevenue = airbticsData.revenue;
      adjustedAdr = airbticsData.nightly_rate || adjustedAdr;
      adjustedOccupancy = airbticsData.occupancy_rate || adjustedOccupancy;
      revenueSource = 'airbtics_aggregate';
      
      // Use Airbtics percentile data if available (from report/all)
      // Note: percentiles will be recalculated after comp-weighted revenue is determined
      if (airbticsData.percentiles) {
        percentileData.revenue = {
          p25: airbticsData.percentiles.revenue?.p25 || Math.round(baseRevenue * 0.7),
          p50: airbticsData.percentiles.revenue?.p50 || baseRevenue,
          p75: airbticsData.percentiles.revenue?.p75 || Math.round(baseRevenue * 1.28),
          p90: airbticsData.percentiles.revenue?.p90 || Math.round(baseRevenue * 1.45),
        };
      } else {
        // Estimate percentiles from their data
        percentileData.revenue = {
          p25: Math.round(baseRevenue * 0.7),
          p50: Math.round(baseRevenue),
          p75: Math.round(baseRevenue * 1.28),
          p90: Math.round(baseRevenue * 1.45),
        };
      }
      
      // Extract comparable listings from Airbtics (report/all returns 30+ comps)
      // Filter to top 5, similar bed/bath, sorted by distance (closest first)
      const airbticsComps = airbticsData.comps || [];
      
      // Debug: Log searched property coords and first few comp coords
      console.log(`Searched property coords: ${latitude}, ${longitude}`);
      if (airbticsComps.length > 0) {
        console.log(`First 3 comp coords:`);
        airbticsComps.slice(0, 3).forEach((c: any, i: number) => {
          console.log(`  Comp ${i + 1}: ${c.latitude}, ${c.longitude} - ${c.name || c.listingID}`);
        });
        // Calculate distance using Haversine formula
        const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          if (!lat2 || !lon2) return 999; // Unknown location = far away
          const R = 3959; // Earth radius in miles
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };
        
        // Filter and sort comps - IMPROVED: Prioritize guest capacity matching like AirDNA
        // Show all comps with bedroom labels, use weighted similarity scoring
        const allCompsWithScores = airbticsComps
          .filter((p: any) => {
            // Must have revenue data
            if (!(p.annual_revenue_ltm > 0 || p.revenue_potential > 0)) return false;
            
            // CRITICAL: Filter out comps with invalid/missing coordinates
            // or comps that are impossibly far away (data quality issue)
            const compLat = parseFloat(p.latitude) || 0;
            const compLon = parseFloat(p.longitude) || 0;
            if (compLat === 0 || compLon === 0) {
              console.log(`Skipping comp with missing coords: ${p.name || p.listingID}`);
              return false;
            }
            
            // Quick distance check - if lat/lon diff is huge, skip
            // 1 degree latitude ≈ 69 miles, so 2 degree diff = ~138 miles max
            const latDiff = Math.abs(compLat - latitude);
            const lonDiff = Math.abs(compLon - longitude);
            if (latDiff > 2 || lonDiff > 2) {
              console.log(`Skipping far comp (${latDiff.toFixed(1)}° lat, ${lonDiff.toFixed(1)}° lon): ${p.name || p.listingID}`);
              return false;
            }
            
            return true;
          })
          .map((p: any, index: number) => {
            // Calculate distance from target property
            const compLat = parseFloat(p.latitude) || 0;
            const compLon = parseFloat(p.longitude) || 0;
            const distance = calcDistance(latitude, longitude, compLat, compLon);
            
            // Calculate guest count similarity (most important factor)
            const compAccommodates = parseInt(p.accommodates) || (parseInt(p.bedrooms) || bedrooms) * 2;
            const guestDiff = Math.abs(compAccommodates - accommodates);
            
            // Calculate bedroom similarity
            const compBedrooms = parseInt(p.bedrooms) || 0;
            const bedroomDiff = Math.abs(compBedrooms - bedrooms);
            
            // Calculate bathroom similarity
            const compBathrooms = parseFloat(p.bathrooms) || Math.ceil(compBedrooms / 2);
            const bathroomDiff = Math.abs(compBathrooms - bathrooms);
            
            // WEIGHTED SIMILARITY SCORE (like AirDNA's Match Score)
            // Lower score = more similar
            // Guest capacity: 40% weight (most important for revenue)
            // Bedroom count: 30% weight
            // Distance: 20% weight
            // Bathroom count: 10% weight
            const guestScore = guestDiff * 2.0;      // 40% weight (0-2 diff = 0-4 points)
            const bedroomScore = bedroomDiff * 1.5;  // 30% weight (0-2 diff = 0-3 points)
            const distanceScore = Math.min(distance, 10) * 0.2; // 20% weight (0-10mi = 0-2 points)
            const bathroomScore = bathroomDiff * 0.5; // 10% weight (0-2 diff = 0-1 points)
            const similarityScore = guestScore + bedroomScore + distanceScore + bathroomScore;
            
            // Match quality label (like AirDNA)
            let matchQuality: 'excellent' | 'good' | 'fair' | 'weak' = 'weak';
            if (guestDiff <= 2 && bedroomDiff === 0 && distance <= 5) matchQuality = 'excellent';
            else if (guestDiff <= 4 && bedroomDiff <= 1 && distance <= 10) matchQuality = 'good';
            else if (guestDiff <= 6 && bedroomDiff <= 2 && distance <= 15) matchQuality = 'fair';
            
            return {
              id: p.listingID || p.id || index,
              name: p.name || `${compBedrooms} BR Listing`,
              url: p.listing_url || `https://www.airbnb.com/rooms/${p.listingID}`,
              image: p.thumbnail_url || p.thumbnail_url_extended || null,
              bedrooms: compBedrooms,
              bathrooms: compBathrooms,
              accommodates: compAccommodates,
              sqft: 0,
              nightPrice: p.avg_booked_daily_rate_ltm || adjustedAdr,
              occupancy: p.avg_occupancy_rate_ltm || adjustedOccupancy,
              monthlyRevenue: Math.round((p.annual_revenue_ltm || annualRevenue) / 12),
              annualRevenue: p.annual_revenue_ltm || annualRevenue,
              rating: p.reveiw_scores_rating || 0,  // Note: Airbtics has typo in field name
              reviewsCount: p.visible_review_count || 0,
              propertyType: p.room_type || "Entire home",
              distance: Math.round(distance * 10) / 10, // Round to 1 decimal
              guestDiff: guestDiff,
              bedroomDiff: bedroomDiff,
              similarityScore: Math.round(similarityScore * 100) / 100,
              matchQuality: matchQuality,
              // Coordinates for map display
              latitude: compLat,
              longitude: compLon,
            };
          })
          // Sort by similarity score first (for consistent ordering)
          .sort((a: any, b: any) => a.similarityScore - b.similarityScore);
        
        // Keep reference to all comps for expanding radius search
        const allCompsForRadius = allCompsWithScores;
        
        // =====================================================================
        // EXPANDING RADIUS SEARCH: Keep widening until we have enough comps
        // Minimum threshold: 5 comps for reliable data
        // Start at 5 miles, expand to 10, 15, 25, 50, then all
        // =====================================================================
        const MIN_COMPS_THRESHOLD = 5;
        const radiusLevels = [5, 10, 15, 25, 50, 100]; // Miles
        let finalRadius = 25; // Default
        let filteredByRadius = allCompsForRadius.filter((p: any) => p.distance <= 25);
        
        // If we don't have enough comps, expand the radius
        if (filteredByRadius.length < MIN_COMPS_THRESHOLD) {
          for (const radius of radiusLevels) {
            filteredByRadius = allCompsForRadius.filter((p: any) => p.distance <= radius);
            finalRadius = radius;
            if (filteredByRadius.length >= MIN_COMPS_THRESHOLD) {
              console.log(`Expanded radius to ${radius}mi to get ${filteredByRadius.length} comps`);
              break;
            }
          }
          // If still not enough, use all available comps
          if (filteredByRadius.length < MIN_COMPS_THRESHOLD) {
            filteredByRadius = allCompsForRadius;
            finalRadius = 999;
            console.log(`Using all ${filteredByRadius.length} comps (no radius limit)`);
          }
        }
        
        // Take top 30 for analysis
        const filteredComps = filteredByRadius.slice(0, 30);
        
        comparableListings = filteredComps;
        filteredListingsCount = airbticsComps.length;
        totalListingsInArea = airbticsComps.length;
        console.log(`Airbtics: ${airbticsComps.length} total comps, filtered to ${comparableListings.length} (within ${finalRadius}mi)`);
        
        // =====================================================================
        // CALCULATE WEIGHTED REVENUE FROM COMPS (like AirDNA)
        // Better comps (lower similarity score) get higher weight
        // This makes the estimate more accurate for the specific property
        // =====================================================================
        if (filteredComps.length >= 3) {
          // Only use comps with valid revenue data
          const compsWithRevenue = filteredComps.filter((c: any) => c.annualRevenue > 0);
          
          if (compsWithRevenue.length >= 3) {
            // Calculate weights inversely proportional to similarity score
            // Lower similarity score = more similar = higher weight
            const maxScore = Math.max(...compsWithRevenue.map((c: any) => c.similarityScore));
            const weights = compsWithRevenue.map((c: any) => {
              // Invert the score: lower score gets higher weight
              // Add 1 to avoid division by zero
              const invertedScore = maxScore - c.similarityScore + 1;
              // Excellent matches get 3x weight, good get 2x, fair get 1.5x
              const qualityMultiplier = c.matchQuality === 'excellent' ? 3 : 
                                        c.matchQuality === 'good' ? 2 : 
                                        c.matchQuality === 'fair' ? 1.5 : 1;
              return invertedScore * qualityMultiplier;
            });
            
            const totalWeight = weights.reduce((a: number, b: number) => a + b, 0);
            
            // Calculate weighted average revenue
            let weightedRevenue = 0;
            for (let i = 0; i < compsWithRevenue.length; i++) {
              weightedRevenue += compsWithRevenue[i].annualRevenue * (weights[i] / totalWeight);
            }
            
            // Use weighted revenue if it's reasonable (within 50% of Airbtics aggregate)
            const revenueRatio = weightedRevenue / baseRevenue;
            if (revenueRatio >= 0.5 && revenueRatio <= 2.0) {
              baseRevenue = Math.round(weightedRevenue);
              revenueSource = 'comps_weighted';
              console.log(`Using WEIGHTED COMP REVENUE: $${baseRevenue}/yr (from ${compsWithRevenue.length} comps, ratio: ${revenueRatio.toFixed(2)})`);
            } else {
              console.log(`Weighted revenue ($${Math.round(weightedRevenue)}) too different from Airbtics ($${airbticsData.revenue}), using Airbtics`);
            }
          }
        }
      }
      
      // Set final annual revenue
      annualRevenue = baseRevenue;
      adjustedMonthlyRevenue = Math.round(annualRevenue / 12);
      
      // Use Airbtics monthly data for seasonality if available
      // Prefer monthly_revenue directly if available, otherwise calculate from occupancy/ADR
      const monthlyRev = airbticsData.monthly_revenue || {};
      const monthlyOcc = airbticsData.monthly_occupancy || {};
      const monthlyAdr = airbticsData.monthly_adr || {};
      
      // Use monthly_revenue if available (most accurate)
      if (Object.keys(monthlyRev).length > 0) {
        const months = Object.keys(monthlyRev).sort().slice(-12);
        
        historicalData = months.map(monthKey => {
          const [year, month] = monthKey.split('-').map(Number);
          const rev = typeof monthlyRev[monthKey] === 'number' ? monthlyRev[monthKey] : 0;
          const occ = monthlyOcc[monthKey] || adjustedOccupancy;
          const adr = monthlyAdr[monthKey] || adjustedAdr;
          return {
            year,
            month,
            occupancy: typeof occ === 'number' ? occ : adjustedOccupancy,
            adr: typeof adr === 'number' ? adr : adjustedAdr,
            revenue: rev,
          };
        });
        console.log("Using Airbtics monthly REVENUE data for seasonality:", historicalData.length, "months");
      } else if (Object.keys(monthlyOcc).length > 0) {
        // Fallback to calculating from occupancy/ADR
        const months = Object.keys(monthlyOcc).sort().slice(-12);
        
        historicalData = months.map(monthKey => {
          const [year, month] = monthKey.split('-').map(Number);
          const occ = monthlyOcc[monthKey] || adjustedOccupancy;
          const adr = monthlyAdr[monthKey] || adjustedAdr;
          const monthlyRevCalc = Math.round(adr * (occ / 100) * 30);
          return {
            year,
            month,
            occupancy: occ,
            adr: adr,
            revenue: monthlyRevCalc,
          };
        });
        console.log("Using Airbtics monthly OCCUPANCY data for seasonality:", historicalData.length, "months");
      }
      
      // Log the historical data being generated
      if (historicalData.length > 0) {
        console.log("Historical data sample:", historicalData[0], historicalData[6]);
      } else {
        console.log("WARNING: No historical data generated from Airbtics monthly data");
      }
      
      console.log("Using Airbtics data:", { annualRevenue, adr: adjustedAdr, occupancy: adjustedOccupancy, comps: comparableListings.length, historicalMonths: historicalData.length });
    } else {
      // Fallback to Mashvisor data
      annualRevenue = adjustedMonthlyRevenue * 12;
      
      // Ensure percentiles make sense for Mashvisor data
      if (percentileData.revenue.p50 === 0 || percentileData.revenue.p50 < annualRevenue * 0.5) {
        percentileData.revenue = {
          p25: Math.round(annualRevenue * 0.7),
          p50: Math.round(annualRevenue),
          p75: Math.round(annualRevenue * 1.35),
          p90: Math.round(annualRevenue * 1.65),
        };
      }
    }

    const result = {
      success: true,
      dataSource: dataSource,
      revenueSource: revenueSource, // 'comps_weighted' | 'airbtics_aggregate' | 'mashvisor'
      bedroomsUsed: bedrooms,
      bathroomsUsed: bathrooms,
      bedroomMultiplier: bedroomMultiplier,
      ruralCorrectionApplied: ruralCorrectionApplied,
      isRuralMarket: isRuralMarket,
      
      // Searched property coordinates (for map display)
      searchedPropertyCoords: {
        latitude: latitude,
        longitude: longitude,
      },
      
      property: property ? {
        address: property.address || street,
        city: property.city || city,
        state: property.state || state,
        zipCode: property.zip_code || property.zip || zip,
        bedrooms: property.beds,
        bathrooms: property.baths,
        sqft: property.sqft || 0,
        yearBuilt: property.year_built,
        propertyType: property.property_type || property.homeType,
        listPrice: property.list_price,
        lastSalePrice: property.last_sale_price,
        lastSaleDate: property.last_sale_date,
        latitude: latitude,
        longitude: longitude,
      } : {
        address: street,
        city: city,
        state: state,
        zipCode: zip,
        sqft: 0,
        latitude: latitude,
        longitude: longitude,
      },
      
      neighborhood: {
        id: neighborhoodId,
        name: neighborhoodName,
        city: neighborhoodData?.city || city,
        state: neighborhoodData?.state || state,
        
        // BEDROOM-ADJUSTED STR metrics
        occupancy: Math.round(adjustedOccupancy * 10) / 10,
        adr: Math.round(adjustedAdr),
        monthlyRevenue: Math.round(adjustedMonthlyRevenue),
        annualRevenue: Math.round(adjustedMonthlyRevenue * 12),
        
        // Raw Mashvisor data (for transparency)
        rawOccupancy: baseOccupancy,
        rawAdr: baseAdr,
        rawMonthlyRevenue: baseMonthlyRevenue,
        
        // Market trends
        revenueChange: airbnbRental.rental_income_change || "stable",
        revenueChangePercent: airbnbRental.rental_income_change_percentage || 0,
        occupancyChange: airbnbRental.occupancy_change || "stable",
        occupancyChangePercent: airbnbRental.occupancy_change_percentage || 0,
        
        // Property counts
        listingsCount: neighborhoodData?.num_of_airbnb_properties || listingsData?.num_of_properties || 0,
        totalProperties: neighborhoodData?.num_of_properties || 0,
        
        // Scores
        mashMeter: neighborhoodData?.mashMeter || 0,
        mashMeterStars: neighborhoodData?.mashMeterStars || 0,
        walkScore: neighborhoodData?.walkscore || 0,
        transitScore: neighborhoodData?.transitscore || 0,
        bikeScore: neighborhoodData?.bikescore || 0,
        
        // Market data
        medianPrice: neighborhoodData?.median_price || 0,
        pricePerSqft: neighborhoodData?.price_per_sqft || 0,
        avgSoldPrice: neighborhoodData?.average_sold_price || 0,
        avgDaysOnMarket: neighborhoodData?.average_days_on_market || 0,
      },
      
      // REAL percentile data (adjusted for bedroom and rural markets)
      percentiles: {
        revenue: percentileData.revenue,
        adr: percentileData.adr,
        occupancy: percentileData.occupancy,
        listingsAnalyzed: filteredListingsCount,
        totalListingsInArea: totalListingsInArea,
      },
      
      // Comparable listings with match quality scores
      comparables: comparableListings,
      
      // CONFIDENCE INDICATOR (like AirDNA's Comp Set Strength)
      // Based on: number of comps, match quality distribution, and revenue variance
      compSetStrength: (() => {
        const comps = comparableListings;
        if (comps.length === 0) return { level: 'none', score: 0, message: 'No comparable listings found' };
        
        // Count comps by match quality
        const excellentCount = comps.filter((c: any) => c.matchQuality === 'excellent').length;
        const goodCount = comps.filter((c: any) => c.matchQuality === 'good').length;
        const fairCount = comps.filter((c: any) => c.matchQuality === 'fair').length;
        const exactBedroomMatch = comps.filter((c: any) => c.bedroomDiff === 0).length;
        
        // Calculate revenue variance (lower is better)
        const revenues = comps.map((c: any) => c.annualRevenue).filter((r: number) => r > 0);
        const avgRevenue = revenues.reduce((a: number, b: number) => a + b, 0) / revenues.length;
        const variance = revenues.reduce((sum: number, r: number) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = avgRevenue > 0 ? (stdDev / avgRevenue) * 100 : 100;
        
        // Calculate confidence score (0-100)
        let score = 0;
        score += Math.min(comps.length * 3, 30); // Up to 30 points for quantity (10+ comps = max)
        score += excellentCount * 5 + goodCount * 3 + fairCount * 1; // Up to ~30 points for quality
        score += exactBedroomMatch >= 5 ? 20 : exactBedroomMatch * 4; // Up to 20 points for exact matches
        score += coefficientOfVariation < 30 ? 20 : coefficientOfVariation < 50 ? 10 : 0; // Up to 20 points for consistency
        score = Math.min(score, 100);
        
        // Determine level and message
        let level: 'high' | 'medium' | 'low' = 'low';
        let message = '';
        if (score >= 70) {
          level = 'high';
          message = `Strong data: ${comps.length} comps with ${exactBedroomMatch} exact bedroom matches`;
        } else if (score >= 40) {
          level = 'medium';
          message = `Moderate data: ${comps.length} comps, ${exactBedroomMatch} exact matches. Verify with local research.`;
        } else {
          level = 'low';
          message = `Limited data: Only ${comps.length} comps found. Use estimates with caution.`;
        }
        
        return {
          level,
          score: Math.round(score),
          message,
          details: {
            totalComps: comps.length,
            excellentMatches: excellentCount,
            goodMatches: goodCount,
            fairMatches: fairCount,
            exactBedroomMatches: exactBedroomMatch,
            revenueVariation: Math.round(coefficientOfVariation),
          }
        };
      })(),
      
      // Historical data for seasonality chart
      historical: historicalData,
      
      // Recommended amenities to reach 90th percentile performance
      // Based on market type and top performer analysis
      recommendedAmenities: getRecommendedAmenities(latitude, longitude, airbticsData?.comps || []),
      
      // Estimated property value (for auto-populating purchase price)
      // Priority: property list price > median price > calculated estimate
      estimatedValue: property?.list_price || 
                      neighborhoodData?.median_price || 
                      Math.round((neighborhoodData?.price_per_sqft || 150) * (property?.sqft || 1500)),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mashvisor API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch property data",
        message: "An error occurred while fetching data. Please try again."
      },
      { status: 500 }
    );
  }
}
