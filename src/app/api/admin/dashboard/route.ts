import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Simple admin password check — not user-facing, just internal protection
const ADMIN_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "teeco-edge-2026";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const password = authHeader?.replace("Bearer ", "");
  
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parallel fetch all data
    const [
      usersResult,
      analysisLogResult,
      savedPropsResult,
      propertyCacheResult,
      creditPurchasesResult,
      sharedAnalysesResult,
      // Aggregates from analysis_log
      topStatesResult,
      topCitiesResult,
      revenueStatsResult,
      dailyAnalysesResult,
      bedroomDistResult,
      dataProviderResult,
    ] = await Promise.all([
      // Users
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      // Analysis log (most recent 200)
      supabase.from("analysis_log").select("*").order("created_at", { ascending: false }).limit(200),
      // Saved properties
      supabase.from("saved_properties").select("*").order("saved_at", { ascending: false }),
      // Property cache count
      supabase.from("property_cache").select("id, address, created_at").order("created_at", { ascending: false }),
      // Credit purchases
      supabase.from("credit_purchases").select("*").order("purchased_at", { ascending: false }),
      // Shared analyses
      supabase.from("shared_analyses").select("*").order("created_at", { ascending: false }),
      
      // Aggregates from analysis_log (wrapped in Promise.resolve to allow .catch)
      Promise.resolve(supabase.rpc("get_top_states_from_log")).catch(() => ({ data: null })),
      Promise.resolve(supabase.rpc("get_top_cities_from_log")).catch(() => ({ data: null })),
      Promise.resolve(supabase.rpc("get_revenue_stats_from_log")).catch(() => ({ data: null })),
      Promise.resolve(supabase.rpc("get_daily_analyses_from_log")).catch(() => ({ data: null })),
      Promise.resolve(supabase.rpc("get_bedroom_dist_from_log")).catch(() => ({ data: null })),
      Promise.resolve(supabase.rpc("get_data_provider_dist_from_log")).catch(() => ({ data: null })),
    ]);

    const users = usersResult.data || [];
    const analysisLogs = analysisLogResult.data || [];
    const savedProperties = savedPropsResult.data || [];
    const propertyCache = propertyCacheResult.data || [];
    const creditPurchases = creditPurchasesResult.data || [];
    const sharedAnalyses = sharedAnalysesResult.data || [];

    // Compute aggregates from analysis_log in JS if RPCs don't exist yet
    const topStates: Record<string, number> = {};
    const topCities: Record<string, number> = {};
    const bedroomDist: Record<string, number> = {};
    const dataProviderDist: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};
    let totalRevenue = 0;
    let totalAdr = 0;
    let totalOccupancy = 0;
    let revenueCount = 0;

    for (const log of analysisLogs) {
      // State distribution
      if (log.state) {
        topStates[log.state] = (topStates[log.state] || 0) + 1;
      }
      // City distribution
      const cityKey = log.city && log.state ? `${log.city}, ${log.state}` : log.city;
      if (cityKey) {
        topCities[cityKey] = (topCities[cityKey] || 0) + 1;
      }
      // Bedroom distribution
      if (log.bedrooms != null) {
        bedroomDist[`${log.bedrooms}BR`] = (bedroomDist[`${log.bedrooms}BR`] || 0) + 1;
      }
      // Data provider distribution
      if (log.data_provider) {
        dataProviderDist[log.data_provider] = (dataProviderDist[log.data_provider] || 0) + 1;
      }
      // Daily analyses
      if (log.created_at) {
        const day = log.created_at.split("T")[0];
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
      // Revenue stats
      if (log.annual_revenue && Number(log.annual_revenue) > 0) {
        totalRevenue += Number(log.annual_revenue);
        totalAdr += Number(log.adr || 0);
        totalOccupancy += Number(log.occupancy_rate || 0);
        revenueCount++;
      }
    }

    // Sort and take top 10
    const sortedStates = Object.entries(topStates).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const sortedCities = Object.entries(topCities).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const sortedBedrooms = Object.entries(bedroomDist).sort((a, b) => {
      const aNum = parseInt(a[0]);
      const bNum = parseInt(b[0]);
      return aNum - bNum;
    });
    const sortedProviders = Object.entries(dataProviderDist).sort((a, b) => b[1] - a[1]);
    const sortedDaily = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);

    // Revenue percentile analysis from logs
    const revenues = analysisLogs
      .map((l: any) => Number(l.annual_revenue))
      .filter((r: number) => r > 0)
      .sort((a: number, b: number) => a - b);
    
    const getPercentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, idx)];
    };

    return NextResponse.json({
      // Summary KPIs
      summary: {
        totalUsers: users.length,
        totalAnalyses: analysisLogs.length,
        totalCachedAnalyses: propertyCache.length,
        totalSavedProperties: savedProperties.length,
        totalSharedAnalyses: sharedAnalyses.length,
        totalCreditPurchases: creditPurchases.length,
        totalRevenuePurchased: creditPurchases.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0),
        avgRevenue: revenueCount > 0 ? Math.round(totalRevenue / revenueCount) : 0,
        avgAdr: revenueCount > 0 ? Math.round(totalAdr / revenueCount) : 0,
        avgOccupancy: revenueCount > 0 ? Math.round((totalOccupancy / revenueCount) * 10) / 10 : 0,
        revenueP25: getPercentile(revenues, 25),
        revenueP50: getPercentile(revenues, 50),
        revenueP75: getPercentile(revenues, 75),
        revenueP90: getPercentile(revenues, 90),
      },
      
      // Charts data
      charts: {
        topStates: sortedStates.map(([state, count]) => ({ state, count })),
        topCities: sortedCities.map(([city, count]) => ({ city, count })),
        bedroomDistribution: sortedBedrooms.map(([br, count]) => ({ bedrooms: br, count })),
        dataProviders: sortedProviders.map(([provider, count]) => ({ provider, count })),
        dailyAnalyses: sortedDaily.map(([date, count]) => ({ date, count })),
      },
      
      // Recent activity
      recentAnalyses: analysisLogs.slice(0, 20).map((log: any) => ({
        address: log.address,
        city: log.city,
        state: log.state,
        bedrooms: log.bedrooms,
        annualRevenue: log.annual_revenue,
        adr: log.adr,
        occupancy: log.occupancy_rate,
        compCount: log.comp_count,
        compStrength: log.comp_set_strength,
        dataProvider: log.data_provider,
        revenueSource: log.revenue_source,
        createdAt: log.created_at,
      })),
      
      // Users list
      users: users.map((u: any) => ({
        email: u.email,
        createdAt: u.created_at,
        lastLogin: u.last_login_at,
        creditsUsed: u.credits_used,
        creditsLimit: u.credits_limit,
        isUnlimited: u.is_unlimited,
      })),
      
      // Saved properties
      savedProperties: savedProperties.map((p: any) => ({
        address: p.address,
        userEmail: p.user_email,
        annualRevenue: p.annual_revenue,
        cashOnCash: p.cash_on_cash,
        savedAt: p.saved_at,
      })),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
