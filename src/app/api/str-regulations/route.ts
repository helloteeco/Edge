import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabaseUrl = "https://izyfqnavncdcdwkldlih.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0";
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Regulation tier definitions
// legality_status: "legal" | "restricted" | "banned" | "unknown"
// permit_difficulty: "easy" | "moderate" | "hard" | "very_hard" | "unknown"

interface RegulationResult {
  legality_status: "legal" | "restricted" | "banned" | "unknown";
  permit_difficulty: "easy" | "moderate" | "hard" | "very_hard" | "unknown";
  max_nights_per_year: number | null;
  owner_occupied_required: boolean;
  permit_cap: boolean;
  summary: string;
  details: string;
}

/**
 * Use OpenAI to research STR regulations for a city
 */
async function researchRegulations(cityName: string, stateCode: string): Promise<RegulationResult> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `You are a short-term rental (STR/Airbnb) regulation expert. Research the current STR regulations for ${cityName}, ${stateCode}.

Classify the city based on these criteria:

LEGALITY STATUS:
- "legal": STRs are explicitly allowed, even if permits/licenses are required. Most cities fall here.
- "restricted": STRs are technically legal but with severe restrictions that make it very difficult (e.g., owner-occupied only, strict caps on permits, 90-day annual limits, specific zones only, moratoriums on new permits)
- "banned": STRs are effectively banned or prohibited (e.g., Irvine CA, most of NYC for whole-unit rentals, Santa Monica non-primary residence)

PERMIT DIFFICULTY:
- "easy": No permit required, or simple online registration with minimal requirements
- "moderate": Permit required with standard requirements (application, inspection, fees under $500)
- "hard": Permit required with significant requirements (multiple inspections, fees over $500, conditional use permits, neighborhood notification, long wait times)
- "very_hard": Extremely difficult to obtain (lottery system, very limited permits available, extensive approval process, moratorium on new permits)

IMPORTANT GUIDELINES:
- Be conservative: if a city has significant restrictions, classify as "restricted" not "legal"
- Cities that require owner-occupancy for ALL STRs should be "restricted" 
- Cities with annual night caps under 120 days should be "restricted"
- Cities that effectively banned non-owner-occupied STRs should be "banned"
- If you're unsure about a small town, check if the COUNTY or STATE has relevant regulations
- For unincorporated areas, use county-level regulations

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "legality_status": "legal" | "restricted" | "banned",
  "permit_difficulty": "easy" | "moderate" | "hard" | "very_hard",
  "max_nights_per_year": null or number (if there's an annual cap),
  "owner_occupied_required": true/false,
  "permit_cap": true/false (is there a limit on number of permits issued?),
  "summary": "One sentence summary of the regulation status",
  "details": "2-3 sentences with key details: what's required, any caps, fees, zones, recent changes"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert on US short-term rental regulations. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Parse JSON - handle potential markdown wrapping
  let cleaned = content;
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const result = JSON.parse(cleaned) as RegulationResult;
    // Validate fields
    const validLegality = ["legal", "restricted", "banned"];
    const validDifficulty = ["easy", "moderate", "hard", "very_hard"];
    if (!validLegality.includes(result.legality_status)) result.legality_status = "unknown";
    if (!validDifficulty.includes(result.permit_difficulty)) result.permit_difficulty = "unknown";
    return result;
  } catch {
    console.error("[STR Regulations] Failed to parse OpenAI response:", cleaned);
    return {
      legality_status: "unknown",
      permit_difficulty: "unknown",
      max_nights_per_year: null,
      owner_occupied_required: false,
      permit_cap: false,
      summary: "Unable to determine regulation status",
      details: content.slice(0, 200),
    };
  }
}

/**
 * GET /api/str-regulations?city=Irvine&state=CA
 * Returns cached regulation data or researches it fresh
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const state = searchParams.get("state");
  const forceRefresh = searchParams.get("refresh") === "true";

  if (!city || !state) {
    return NextResponse.json({ error: "city and state parameters required" }, { status: 400 });
  }

  const cityId = `${state.toLowerCase()}-${city.toLowerCase().replace(/\s+/g, "-")}`;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("str_regulations")
      .select("*")
      .eq("id", cityId)
      .single();

    if (cached) {
      // Check if data is stale (older than 90 days)
      const lastVerified = new Date(cached.last_verified);
      const daysSinceVerified = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceVerified < 90) {
        return NextResponse.json({
          ...cached,
          source: "cached",
          days_since_verified: Math.round(daysSinceVerified),
        });
      }
      // Data is stale, will re-research below
    }
  }

  // Research regulations using AI
  try {
    const result = await researchRegulations(city, state);

    // Store in Supabase
    const record = {
      id: cityId,
      city_name: city,
      state_code: state.toUpperCase(),
      legality_status: result.legality_status,
      permit_difficulty: result.permit_difficulty,
      max_nights_per_year: result.max_nights_per_year,
      owner_occupied_required: result.owner_occupied_required,
      permit_cap: result.permit_cap,
      summary: result.summary,
      details: result.details,
      last_verified: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("str_regulations").upsert(record, { onConflict: "id" });

    return NextResponse.json({
      ...record,
      source: "researched",
      days_since_verified: 0,
    });
  } catch (error) {
    console.error("[STR Regulations] Research error:", error);
    return NextResponse.json(
      { error: "Failed to research regulations", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/str-regulations/batch
 * Research regulations for multiple cities at once
 * Body: { cities: [{ city: "Irvine", state: "CA" }, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cities, adminKey } = body;

    // Require admin key for batch operations
    const expectedKey = process.env.ADMIN_API_KEY || "teeco-admin-2026";
    if (adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Array.isArray(cities) || cities.length === 0) {
      return NextResponse.json({ error: "cities array required" }, { status: 400 });
    }

    // Limit batch size
    const batch = cities.slice(0, 20);
    const results: Array<{ city: string; state: string; status: string; result?: unknown; error?: string }> = [];

    for (const { city, state } of batch) {
      try {
        const cityId = `${state.toLowerCase()}-${city.toLowerCase().replace(/\s+/g, "-")}`;

        // Check if already cached and fresh
        const { data: cached } = await supabase
          .from("str_regulations")
          .select("*")
          .eq("id", cityId)
          .single();

        if (cached) {
          const daysSince = (Date.now() - new Date(cached.last_verified).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < 90) {
            results.push({ city, state, status: "cached", result: cached });
            continue;
          }
        }

        // Research
        const result = await researchRegulations(city, state);
        const record = {
          id: cityId,
          city_name: city,
          state_code: state.toUpperCase(),
          legality_status: result.legality_status,
          permit_difficulty: result.permit_difficulty,
          max_nights_per_year: result.max_nights_per_year,
          owner_occupied_required: result.owner_occupied_required,
          permit_cap: result.permit_cap,
          summary: result.summary,
          details: result.details,
          last_verified: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from("str_regulations").upsert(record, { onConflict: "id" });
        results.push({ city, state, status: "researched", result: record });

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        results.push({ city, state, status: "error", error: String(error) });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
