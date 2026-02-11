import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Vercel Pro: allow up to 300 seconds for Apify scraping
export const maxDuration = 300;

// Apify configuration
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_ACTOR_ID = "simpleapi~airbnb-occupancy-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

// Cache duration: 7 days (calendar data changes slowly)
const CACHE_DURATION_HOURS = 168; // 7 days

interface OccupancyData {
  roomId: string;
  occupancyRate: number; // 0-100
  bookedDays: number;
  totalDays: number;
  avgNightlyRate?: number;
  peakMonths: string[];
  lowMonths: string[];
  source: "calendar" | "estimated";
  dailyCalendar?: { date: string; available: boolean }[];
}

// Check Supabase cache for existing occupancy data
async function getCachedOccupancy(roomIds: string[]): Promise<Map<string, OccupancyData>> {
  const cached = new Map<string, OccupancyData>();
  try {
    const { data, error } = await supabase
      .from("airbnb_occupancy_cache")
      .select("room_id, occupancy_rate, booked_days, total_days, peak_months, low_months, created_at")
      .in("room_id", roomIds)
      .gt("expires_at", new Date().toISOString());

    if (error || !data) return cached;

    for (const row of data) {
      cached.set(row.room_id, {
        roomId: row.room_id,
        occupancyRate: row.occupancy_rate,
        bookedDays: row.booked_days,
        totalDays: row.total_days,
        peakMonths: row.peak_months || [],
        lowMonths: row.low_months || [],
        source: "calendar",
      });
    }
  } catch {
    // Ignore cache errors
  }
  return cached;
}

// Store occupancy data in Supabase cache
async function cacheOccupancy(data: OccupancyData): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    await supabase.from("airbnb_occupancy_cache").upsert(
      {
        room_id: data.roomId,
        occupancy_rate: data.occupancyRate,
        booked_days: data.bookedDays,
        total_days: data.totalDays,
        peak_months: data.peakMonths,
        low_months: data.lowMonths,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "room_id" }
    );
  } catch (err) {
    console.error("[OccupancyCache] Failed to cache:", err);
  }
}

// Call Apify to scrape Airbnb calendar data for specific listings
async function scrapeOccupancyData(
  roomIds: string[]
): Promise<{ success: boolean; data: OccupancyData[]; error?: string }> {
  if (!APIFY_API_TOKEN) {
    return { success: false, data: [], error: "APIFY_API_TOKEN not configured" };
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    console.log(`[OccupancyScraper] Scraping calendar for ${roomIds.length} listings`);

    // Start Apify actor run
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomIds: roomIds,
          month: currentMonth,
          year: currentYear,
          proxyConfiguration: {
            useApifyProxy: true,
          },
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error("[OccupancyScraper] Failed to start run:", runResponse.status, errorText);
      return { success: false, data: [], error: `Apify error: ${runResponse.status}` };
    }

    const runData = await runResponse.json();
    const runId = runData?.data?.id;

    if (!runId) {
      console.error("[OccupancyScraper] No run ID returned:", runData);
      return { success: false, data: [], error: "No run ID returned from Apify" };
    }

    console.log(`[OccupancyScraper] Run started: ${runId}`);

    // Poll for completion (max 90 seconds — calendar scraping takes longer)
    let attempts = 0;
    const maxAttempts = 45;
    let runStatus = "RUNNING";

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      runStatus = statusData?.data?.status || "UNKNOWN";

      if (attempts % 5 === 0) {
        console.log(`[OccupancyScraper] Run status (attempt ${attempts}): ${runStatus}`);
      }
    }

    if (runStatus !== "SUCCEEDED") {
      console.error(`[OccupancyScraper] Run did not succeed. Status: ${runStatus}`);
      return {
        success: false,
        data: [],
        error: `Apify run ${runStatus === "RUNNING" ? "timed out" : "failed"}: ${runStatus}`,
      };
    }

    // Fetch results from the dataset
    const datasetId = runData?.data?.defaultDatasetId;
    const resultsResponse = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=10000`
    );

    if (!resultsResponse.ok) {
      return { success: false, data: [], error: "Failed to fetch Apify results" };
    }

    const rawResults = await resultsResponse.json();
    console.log(`[OccupancyScraper] Got ${rawResults.length} calendar records`);

    // Process calendar data into occupancy metrics per room
    // Output format: { room_id, date, available: boolean }
    const roomCalendars = new Map<string, { booked: number; total: number; monthlyBooked: Map<number, number>; monthlyTotal: Map<number, number>; dailyCalendar: { date: string; available: boolean }[] }>();

    for (const record of rawResults) {
      const roomId = String(record.room_id);
      if (!roomCalendars.has(roomId)) {
        roomCalendars.set(roomId, {
          booked: 0,
          total: 0,
          monthlyBooked: new Map(),
          monthlyTotal: new Map(),
          dailyCalendar: [],
        });
      }

      const cal = roomCalendars.get(roomId)!;
      cal.total++;
      if (!record.available) {
        cal.booked++;
      }
      // Store daily calendar entry for heatmap
      if (record.date) {
        cal.dailyCalendar.push({ date: record.date, available: !!record.available });
      }

      // Track monthly breakdown for seasonality
      const dateObj = new Date(record.date);
      const month = dateObj.getMonth() + 1;
      cal.monthlyTotal.set(month, (cal.monthlyTotal.get(month) || 0) + 1);
      if (!record.available) {
        cal.monthlyBooked.set(month, (cal.monthlyBooked.get(month) || 0) + 1);
      }
    }

    // Convert to OccupancyData
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const occupancyResults: OccupancyData[] = [];

    for (const [roomId, cal] of Array.from(roomCalendars)) {
      if (cal.total === 0) continue;

      const occupancyRate = Math.round((cal.booked / cal.total) * 100);

      // Find peak and low months
      const monthlyRates: { month: number; rate: number }[] = [];
      for (const [month, total] of Array.from(cal.monthlyTotal)) {
        const booked = cal.monthlyBooked.get(month) || 0;
        monthlyRates.push({ month, rate: total > 0 ? (booked / total) * 100 : 0 });
      }
      monthlyRates.sort((a, b) => b.rate - a.rate);

      const peakMonths = monthlyRates.slice(0, 3).map((m) => monthNames[m.month]);
      const lowMonths = monthlyRates.slice(-3).reverse().map((m) => monthNames[m.month]);

      // Sort daily calendar by date
      cal.dailyCalendar.sort((a, b) => a.date.localeCompare(b.date));

      const result: OccupancyData = {
        roomId,
        occupancyRate,
        bookedDays: cal.booked,
        totalDays: cal.total,
        peakMonths,
        lowMonths,
        source: "calendar",
        dailyCalendar: cal.dailyCalendar,
      };

      occupancyResults.push(result);

      // Cache each result
      await cacheOccupancy(result);
    }

    console.log(`[OccupancyScraper] Processed ${occupancyResults.length} rooms`);
    return { success: true, data: occupancyResults };
  } catch (error) {
    console.error("[OccupancyScraper] Error:", error);
    return { success: false, data: [], error: `Scraping failed: ${error}` };
  }
}

// POST endpoint — get real occupancy data for specific listings
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`occupancy:${clientIP}`, RATE_LIMITS.standard);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { roomIds } = body;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "roomIds array is required" },
        { status: 400 }
      );
    }

    // Limit to 8 rooms per request to control costs
    const limitedRoomIds = roomIds.slice(0, 8).map(String);

    // Step 1: Check cache
    const cachedData = await getCachedOccupancy(limitedRoomIds);
    const uncachedIds = limitedRoomIds.filter((id) => !cachedData.has(id));

    console.log(`[OccupancyAPI] ${cachedData.size} cached, ${uncachedIds.length} need scraping`);

    let scrapedData: OccupancyData[] = [];

    // Step 2: Scrape uncached listings
    if (uncachedIds.length > 0) {
      const scrapeResult = await scrapeOccupancyData(uncachedIds);
      if (scrapeResult.success) {
        scrapedData = scrapeResult.data;
      } else {
        console.warn(`[OccupancyAPI] Scraping failed: ${scrapeResult.error}`);
      }
    }

    // Step 3: Combine cached + scraped results
    const allResults: Record<string, OccupancyData> = {};

    for (const [roomId, data] of Array.from(cachedData)) {
      allResults[roomId] = data;
    }
    for (const data of scrapedData) {
      allResults[data.roomId] = data;
    }

    return NextResponse.json({
      success: true,
      occupancy: allResults,
      cached: cachedData.size,
      scraped: scrapedData.length,
      total: Object.keys(allResults).length,
    });
  } catch (error) {
    console.error("[OccupancyAPI] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
