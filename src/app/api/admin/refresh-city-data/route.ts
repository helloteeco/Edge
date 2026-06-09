import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

/**
 * /api/admin/refresh-city-data
 * 
 * Option B: Reads the market_data cache table (populated by user searches + precache)
 * and updates city-data.ts with fresher ADR/occupancy/revenue values when available.
 * 
 * This is cost-free — it only reads data that was already fetched and cached.
 * Runs monthly on the 1st (after precache warms markets).
 * 
 * Also updates the Supabase cities table directly for immediate effect
 * without needing a redeploy.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Auth check
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  
  const secret = request.nextUrl.searchParams.get("secret")
    || request.headers.get("x-api-key")
    || authHeader?.replace("Bearer ", "");
  
  const adminSecret = process.env.ADMIN_API_KEY || process.env.PRECACHE_SECRET || "teeco-precache-2026";
  return secret === adminSecret;
}

// Map market_data city/state to city-data.ts city IDs
function toCityId(city: string, state: string): string {
  const stateCode = state.length === 2 ? state.toLowerCase() : "";
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${stateCode}-${citySlug}`;
}

interface CachedMarket {
  city: string;
  state: string;
  avg_adr: number;
  avg_occupancy: number;
  avg_monthly_revenue: number;
  avg_annual_revenue: number;
  updated_at: string;
  search_count: number;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Fetch all non-expired market_data entries grouped by city
    // We want the freshest data for each unique city/state combination
    const { data: cachedData, error } = await supabase
      .from("market_data")
      .select("city, state, avg_adr, avg_occupancy, avg_monthly_revenue, avg_annual_revenue, updated_at, search_count")
      .gt("expires_at", new Date().toISOString())
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to read market_data", details: error.message }, { status: 500 });
    }

    if (!cachedData || cachedData.length === 0) {
      return NextResponse.json({ message: "No cached market data found", updated: 0 });
    }

    // Step 2: Deduplicate — keep the freshest entry per city/state
    const freshestByCity = new Map<string, CachedMarket>();
    for (const row of cachedData) {
      if (!row.city || !row.state || !row.avg_adr || !row.avg_occupancy) continue;
      const key = `${row.city.toLowerCase()}_${row.state.toLowerCase()}`;
      if (!freshestByCity.has(key)) {
        freshestByCity.set(key, row);
      }
    }

    // Step 3: Update Supabase cities table directly (immediate effect, no redeploy needed)
    let updatedInDb = 0;
    let skippedNoMatch = 0;
    const updates: Array<{ id: string; city: string; state: string; adr: number; occ: number; rev: number }> = [];

    for (const [, market] of freshestByCity) {
      const cityId = toCityId(market.city, market.state);
      
      // Sanity checks — don't write garbage data
      if (market.avg_adr < 30 || market.avg_adr > 2000) continue;
      if (market.avg_occupancy < 10 || market.avg_occupancy > 100) continue;
      if (market.avg_monthly_revenue < 200 || market.avg_monthly_revenue > 100000) continue;

      // Update in Supabase cities table
      const { error: updateError, count } = await supabase
        .from("cities")
        .update({
          avg_adr: Math.round(market.avg_adr),
          occupancy: Math.round(market.avg_occupancy),
          str_monthly_revenue: Math.round(market.avg_monthly_revenue),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cityId)
        .select("id", { count: "exact" });

      if (!updateError && count && count > 0) {
        updatedInDb++;
        updates.push({
          id: cityId,
          city: market.city,
          state: market.state,
          adr: Math.round(market.avg_adr),
          occ: Math.round(market.avg_occupancy),
          rev: Math.round(market.avg_monthly_revenue),
        });
      } else {
        skippedNoMatch++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Refreshed ${updatedInDb} cities from cached market data`,
      stats: {
        cachedMarkets: cachedData.length,
        uniqueCities: freshestByCity.size,
        updatedInDb,
        skippedNoMatch,
      },
      updates: updates.slice(0, 20), // Show first 20 for debugging
    });
  } catch (err: any) {
    console.error("[refresh-city-data] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
