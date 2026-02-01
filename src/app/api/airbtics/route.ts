import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

const AIRBTICS_API_KEY = process.env.AIRBTICS_API_KEY || "";
const AIRBTICS_BASE_URL = "https://crap0y5bx5.execute-api.us-east-1.amazonaws.com/prod";

// Cache for Airbtics reports (60 minutes per TOS)
const reportCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes in milliseconds

interface AirbticsReportRequest {
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms?: number;
  accommodates?: number;
  fullReport?: boolean; // true = $0.50, false = $0.10
}

// Generate cache key from request params
function getCacheKey(params: AirbticsReportRequest): string {
  // Round coordinates to 3 decimal places for cache key (about 100m precision)
  const lat = params.latitude.toFixed(3);
  const lng = params.longitude.toFixed(3);
  return `${lat}_${lng}_${params.bedrooms}_${params.fullReport ? 'full' : 'summary'}`;
}

// Call Airbtics API
async function callAirbticsAPI(params: AirbticsReportRequest): Promise<{ success: boolean; data?: any; error?: string; fromCache?: boolean }> {
  const cacheKey = getCacheKey(params);
  
  // Check cache first
  const cached = reportCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("Airbtics cache hit for:", cacheKey);
    return { success: true, data: cached.data, fromCache: true };
  }

  if (!AIRBTICS_API_KEY) {
    return { success: false, error: "Airbtics API key not configured" };
  }

  try {
    // Step 1: Request a report
    const endpoint = params.fullReport ? "/report/all" : "/report/summary";
    const requestBody = {
      lat: params.latitude,
      lng: params.longitude,
      bedrooms: params.bedrooms,
      bathrooms: params.bathrooms || Math.ceil(params.bedrooms / 2),
      accommodates: params.accommodates || params.bedrooms * 2,
    };

    console.log("Airbtics API request:", endpoint, requestBody);

    const createResponse = await fetch(`${AIRBTICS_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AIRBTICS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Airbtics API error:", createResponse.status, errorText);
      return { success: false, error: `Airbtics API error: ${createResponse.status}` };
    }

    const createResult = await createResponse.json();
    console.log("Airbtics create response:", createResult);

    if (!createResult.report_id) {
      return { success: false, error: "No report_id returned from Airbtics" };
    }

    // Step 2: Fetch the report (free call)
    const reportResponse = await fetch(`${AIRBTICS_BASE_URL}/report?id=${createResult.report_id}`, {
      method: "GET",
      headers: {
        "X-API-Key": AIRBTICS_API_KEY,
      },
    });

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.error("Airbtics report fetch error:", reportResponse.status, errorText);
      return { success: false, error: `Failed to fetch report: ${reportResponse.status}` };
    }

    const reportData = await reportResponse.json();
    console.log("Airbtics report data:", reportData);

    // Cache the result
    reportCache.set(cacheKey, { data: reportData, timestamp: Date.now() });

    return { success: true, data: reportData, fromCache: false };
  } catch (error) {
    console.error("Airbtics API call failed:", error);
    return { success: false, error: `API call failed: ${error}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, bedrooms = 3, bathrooms, accommodates, fullReport = false } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    const result = await callAirbticsAPI({
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      accommodates,
      fullReport,
    });

    if (!result.success || !result.data) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to get Airbtics data",
        source: "airbtics",
      });
    }

    const report = result.data;

    // Build response based on report type
    const response: any = {
      success: true,
      source: "airbtics",
      fromCache: result.fromCache,
      
      // Core metrics - these are ANNUAL values from Airbtics
      annualRevenue: report.revenue || 0,
      monthlyRevenue: Math.round((report.revenue || 0) / 12),
      nightlyRate: report.nightly_rate || 0,
      occupancyRate: report.occupancy_rate || 0,
      
      // Property details
      bedrooms: report.bedrooms || bedrooms,
      bathrooms: report.bathrooms || bathrooms,
      accommodates: report.accommodates || bedrooms * 2,
      searchRadius: report.radius || 0,
      
      // Metadata
      reportId: report.id,
      createdAt: report.created_at,
    };

    // Add percentiles if available (full report only)
    if (report.kpi) {
      response.percentiles = {
        revenue: {
          p25: report.kpi["25"]?.ltm_revenue || 0,
          p50: report.kpi["50"]?.ltm_revenue || response.annualRevenue,
          p75: report.kpi["75"]?.ltm_revenue || 0,
          p90: report.kpi["90"]?.ltm_revenue || 0,
        },
        occupancy: {
          p25: report.kpi["25"]?.ltm_occupancy_rate || 0,
          p50: report.kpi["50"]?.ltm_occupancy_rate || response.occupancyRate,
          p75: report.kpi["75"]?.ltm_occupancy_rate || 0,
          p90: report.kpi["90"]?.ltm_occupancy_rate || 0,
        },
        adr: {
          p25: report.kpi["25"]?.ltm_nightly_rate || 0,
          p50: report.kpi["50"]?.ltm_nightly_rate || response.nightlyRate,
          p75: report.kpi["75"]?.ltm_nightly_rate || 0,
          p90: report.kpi["90"]?.ltm_nightly_rate || 0,
        },
        listingsAnalyzed: report.comps?.length || 0,
      };
    }

    // Add comparable listings if available (full report only)
    if (report.comps && report.comps.length > 0) {
      response.comparables = report.comps.slice(0, 10).map((comp: any) => ({
        id: comp.listing_id,
        name: comp.title,
        url: comp.url,
        image: comp.image_url,
        bedrooms: comp.bedrooms,
        bathrooms: comp.bathrooms,
        accommodates: comp.accommodates,
        nightPrice: comp.ltm_nightly_rate,
        occupancy: comp.ltm_occupancy_rate,
        annualRevenue: comp.ltm_revenue,
        monthlyRevenue: Math.round(comp.ltm_revenue / 12),
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Airbtics route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
