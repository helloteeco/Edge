import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for batch processing

// Top 50 US STR markets with representative addresses
// These are central addresses in the most popular short-term rental markets
const TOP_MARKETS = [
  // Florida
  { address: "100 Ocean Drive, Miami Beach, FL", market: "Miami Beach" },
  { address: "8600 International Drive, Orlando, FL", market: "Orlando" },
  { address: "500 S Atlantic Ave, Daytona Beach, FL", market: "Daytona Beach" },
  { address: "200 Eglin Pkwy, Fort Walton Beach, FL", market: "Destin/Fort Walton" },
  { address: "1 Beach Dr SE, St Petersburg, FL", market: "St. Petersburg" },
  { address: "100 Coastline Dr, Panama City Beach, FL", market: "Panama City Beach" },
  { address: "200 E Las Olas Blvd, Fort Lauderdale, FL", market: "Fort Lauderdale" },
  { address: "1 Duval St, Key West, FL", market: "Key West" },
  { address: "100 N Tampa St, Tampa, FL", market: "Tampa" },
  // Tennessee / Smoky Mountains
  { address: "100 The Island Dr, Pigeon Forge, TN", market: "Pigeon Forge" },
  { address: "321 Parkway, Gatlinburg, TN", market: "Gatlinburg" },
  { address: "200 Broadway, Nashville, TN", market: "Nashville" },
  { address: "100 Wears Valley Rd, Sevierville, TN", market: "Sevierville" },
  // Texas
  { address: "500 Congress Ave, Austin, TX", market: "Austin" },
  { address: "300 Alamo Plaza, San Antonio, TX", market: "San Antonio" },
  { address: "100 Seawall Blvd, Galveston, TX", market: "Galveston" },
  { address: "100 Main St, Dallas, TX", market: "Dallas" },
  { address: "1000 Main St, Houston, TX", market: "Houston" },
  // California
  { address: "100 Santa Monica Blvd, Santa Monica, CA", market: "Santa Monica/LA" },
  { address: "100 Broadway, San Diego, CA", market: "San Diego" },
  { address: "1 Fishermans Wharf, San Francisco, CA", market: "San Francisco" },
  { address: "100 N Palm Canyon Dr, Palm Springs, CA", market: "Palm Springs" },
  { address: "100 W Anapamu St, Santa Barbara, CA", market: "Santa Barbara" },
  { address: "100 Cannery Row, Monterey, CA", market: "Monterey" },
  { address: "100 Village Dr, Big Bear Lake, CA", market: "Big Bear Lake" },
  // Mountain / Ski
  { address: "100 E Meadow Dr, Vail, CO", market: "Vail" },
  { address: "100 E Main St, Breckenridge, CO", market: "Breckenridge" },
  { address: "100 E Cooper Ave, Aspen, CO", market: "Aspen" },
  { address: "100 N Cache St, Jackson, WY", market: "Jackson Hole" },
  { address: "100 Main St, Park City, UT", market: "Park City" },
  { address: "100 Canyon Blvd, Boulder, CO", market: "Boulder" },
  // Southeast
  { address: "100 E Bay St, Savannah, GA", market: "Savannah" },
  { address: "100 E Bay St, Charleston, SC", market: "Charleston" },
  { address: "100 N Lumina Ave, Wrightsville Beach, NC", market: "Wilmington/Wrightsville" },
  { address: "100 E Main St, Asheville, NC", market: "Asheville" },
  { address: "100 Gulf Shores Pkwy, Gulf Shores, AL", market: "Gulf Shores" },
  { address: "100 Poydras St, New Orleans, LA", market: "New Orleans" },
  // Northeast
  { address: "100 Commercial St, Provincetown, MA", market: "Cape Cod" },
  { address: "100 Thames St, Newport, RI", market: "Newport" },
  { address: "100 Main St, Lake Placid, NY", market: "Lake Placid" },
  { address: "100 Main St, Stowe, VT", market: "Stowe" },
  // Southwest / Desert
  { address: "100 E Route 66, Flagstaff, AZ", market: "Flagstaff" },
  { address: "100 N Central Ave, Phoenix, AZ", market: "Phoenix/Scottsdale" },
  { address: "100 E Main St, Sedona, AZ", market: "Sedona" },
  // Pacific Northwest
  { address: "100 Pike St, Seattle, WA", market: "Seattle" },
  { address: "100 SW Broadway, Portland, OR", market: "Portland" },
  { address: "100 NW Oregon Ave, Bend, OR", market: "Bend" },
  // Hawaii
  { address: "100 Kaiulani Ave, Honolulu, HI", market: "Honolulu/Waikiki" },
  { address: "100 Banyan Dr, Hilo, HI", market: "Big Island" },
  // Midwest / Other
  { address: "100 N Michigan Ave, Chicago, IL", market: "Chicago" },
  { address: "100 Wisconsin Dells Pkwy, Wisconsin Dells, WI", market: "Wisconsin Dells" },
];

// Simple auth check - use a secret key to prevent unauthorized access
const ADMIN_SECRET = process.env.PRECACHE_SECRET || process.env.ADMIN_API_KEY || "teeco-precache-2026";

function isAuthorized(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get("secret")
    || request.headers.get("x-api-key")
    || request.headers.get("authorization")?.replace("Bearer ", "");
  
  if (!secret) return false;
  
  // Check against admin secret
  if (secret === ADMIN_SECRET) return true;
  
  // Also check against PRICELABS_API_KEY
  const plKey = process.env.PRICELABS_API_KEY;
  if (plKey && secret === plKey) return true;
  
  return false;
}

export async function POST(request: NextRequest) {
  // Auth check
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const bedrooms = body.bedrooms || 3;
  const bathrooms = body.bathrooms || 2;
  const limit = body.limit || TOP_MARKETS.length; // How many markets to process
  const delayMs = body.delayMs || 3000; // Delay between requests to avoid rate limiting

  const markets = TOP_MARKETS.slice(0, limit);
  const results: Array<{
    market: string;
    address: string;
    status: "success" | "cached" | "error";
    dataSource?: string;
    revenue?: number;
    error?: string;
    timeMs?: number;
  }> = [];

  const baseUrl = request.nextUrl.origin;

  for (const market of markets) {
    const start = Date.now();
    try {
      // Call our own mashvisor/property endpoint
      const response = await fetch(`${baseUrl}/api/mashvisor/property`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: market.address,
          bedrooms,
          bathrooms,
        }),
      });

      const data = await response.json();
      const elapsed = Date.now() - start;

      if (data.success) {
        results.push({
          market: market.market,
          address: market.address,
          status: data.cached ? "cached" : "success",
          dataSource: data.dataSource || "unknown",
          revenue: data.analysis?.annualRevenue,
          timeMs: elapsed,
        });
      } else {
        results.push({
          market: market.market,
          address: market.address,
          status: "error",
          error: data.error || "Unknown error",
          timeMs: elapsed,
        });
      }
    } catch (error: any) {
      results.push({
        market: market.market,
        address: market.address,
        status: "error",
        error: error.message || "Fetch failed",
        timeMs: Date.now() - start,
      });
    }

    // Delay between requests to avoid rate limiting
    if (markets.indexOf(market) < markets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const summary = {
    total: results.length,
    success: results.filter((r) => r.status === "success").length,
    cached: results.filter((r) => r.status === "cached").length,
    errors: results.filter((r) => r.status === "error").length,
    avgTimeMs: Math.round(
      results.reduce((sum, r) => sum + (r.timeMs || 0), 0) / results.length
    ),
  };

  return NextResponse.json({
    success: true,
    summary,
    results,
    markets: TOP_MARKETS.map((m) => m.market),
  });
}

// GET - Trigger pre-caching (used by Vercel cron jobs)
// Processes markets in batches of 5 to stay within Hobby plan 60s limit
// Use ?batch=0 for first 5, ?batch=1 for next 5, etc.
// Without batch param, processes first 5 markets (cron will cycle through all)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const batchParam = request.nextUrl.searchParams.get("batch");
  const listOnly = request.nextUrl.searchParams.get("list");

  // If ?list=true, just return the market list
  if (listOnly === "true") {
    return NextResponse.json({
      totalMarkets: TOP_MARKETS.length,
      markets: TOP_MARKETS.map((m) => ({
        market: m.market,
        address: m.address,
      })),
    });
  }

  // Determine which batch to process (5 markets per batch)
  const BATCH_SIZE = 5;
  const totalBatches = Math.ceil(TOP_MARKETS.length / BATCH_SIZE);
  
  // Auto-rotate through batches based on day of week + week number
  // This ensures all markets get cached over time with weekly cron
  const now = new Date();
  const weekOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const autoBatch = (weekOfYear * 7 + now.getDay()) % totalBatches;
  
  const batch = batchParam !== null ? parseInt(batchParam, 10) : autoBatch;
  const startIdx = batch * BATCH_SIZE;
  const markets = TOP_MARKETS.slice(startIdx, startIdx + BATCH_SIZE);

  if (markets.length === 0) {
    return NextResponse.json({ success: true, message: "No markets in this batch", batch, totalBatches });
  }

  const baseUrl = request.nextUrl.origin;
  const results: Array<{
    market: string;
    status: "success" | "cached" | "error";
    dataSource?: string;
    revenue?: number;
    timeMs?: number;
    error?: string;
  }> = [];

  for (const market of markets) {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}/api/mashvisor/property`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: market.address,
          bedrooms: 3,
          bathrooms: 2,
        }),
      });
      const data = await response.json();
      results.push({
        market: market.market,
        status: data.cached ? "cached" : data.success ? "success" : "error",
        dataSource: data.dataSource,
        revenue: data.analysis?.annualRevenue,
        timeMs: Date.now() - start,
        error: data.success ? undefined : data.error,
      });
    } catch (error: any) {
      results.push({
        market: market.market,
        status: "error",
        error: error.message,
        timeMs: Date.now() - start,
      });
    }
    // Small delay between requests
    if (markets.indexOf(market) < markets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return NextResponse.json({
    success: true,
    batch,
    totalBatches,
    marketsProcessed: results.length,
    results,
  });
}
