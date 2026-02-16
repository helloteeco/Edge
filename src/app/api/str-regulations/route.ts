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

  const prompt = `You are a short-term rental (STR/Airbnb) regulation researcher. Your job is to determine the ACTUAL, CURRENT regulation status for ${cityName}, ${stateCode}.

CRITICAL RULES — READ CAREFULLY:

1. DEFAULT TO "legal" UNLESS YOU HAVE SPECIFIC EVIDENCE OTHERWISE.
   - The vast majority of US cities (especially small towns, rural areas, and unincorporated areas) have NO specific STR ordinance. This means STRs are LEGAL by default.
   - Do NOT classify a city as "restricted" or "banned" unless you can cite a specific municipal ordinance, county code, or state law that restricts STRs there.
   - If a city simply requires a business license, tax registration, or basic permit, that is "legal" with "easy" or "moderate" permit difficulty — NOT restricted.

2. ONLY classify as "restricted" if there are SEVERE, SPECIFIC restrictions:
   - Owner-occupied ONLY requirement (no investor rentals allowed)
   - Annual night cap under 120 days
   - Permit moratorium or lottery system
   - Specific zone-only restrictions that exclude most residential areas
   - Examples: parts of Denver CO, some Nashville TN zones

3. ONLY classify as "banned" if STRs are EFFECTIVELY PROHIBITED:
   - City has passed an ordinance banning or effectively banning non-owner-occupied STRs
   - Examples: Irvine CA, most of NYC for whole-unit rentals, Santa Monica non-primary residence

4. For SMALL TOWNS (population under 25,000) and RURAL/UNINCORPORATED AREAS:
   - Almost always "legal" — small towns rarely have STR-specific ordinances
   - Check if the COUNTY has regulations; if not, default to "legal"
   - State-level regulations (like tax collection requirements) do NOT make a city "restricted"

5. PERMIT DIFFICULTY:
   - "easy": No permit required, or simple online registration/tax signup
   - "moderate": Standard permit with application, basic inspection, fees under $500
   - "hard": Multiple inspections, fees over $500, conditional use permits, long waits
   - "very_hard": Lottery, very limited permits, moratorium on new permits

6. ACCURACY REQUIREMENTS:
   - Your summary and details MUST match what someone would find by Googling "${cityName} ${stateCode} short term rental regulations"
   - Do NOT invent restrictions that don't exist
   - If you're uncertain, lean toward "legal" with "moderate" difficulty and say so in the details
   - Include the county name in your response when relevant

LEGALITY STATUS:
- "legal": STRs are allowed (with or without permits/registration). This is the DEFAULT.
- "restricted": STRs face severe restrictions (specific ordinance required as evidence)
- "banned": STRs are effectively prohibited (specific ban ordinance required as evidence)

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "legality_status": "legal" | "restricted" | "banned",
  "permit_difficulty": "easy" | "moderate" | "hard" | "very_hard",
  "max_nights_per_year": null or number (if there's a documented annual cap),
  "owner_occupied_required": true/false,
  "permit_cap": true/false (is there a documented limit on number of permits?),
  "summary": "One sentence summary — be specific about what's required or allowed",
  "details": "2-3 sentences: what county this is in, what's specifically required, any documented restrictions. If no specific ordinance exists, say so clearly."
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
        { role: "system", content: "You are a factual researcher on US short-term rental regulations. You default to 'legal' unless you have specific evidence of restrictions. Most US cities allow STRs. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
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
  const providedCityId = searchParams.get("cityId");

  if (!city || !state) {
    return NextResponse.json({ error: "city and state parameters required" }, { status: 400 });
  }

  // Use provided cityId if available (more accurate), otherwise construct from city/state
  const cityId = providedCityId || `${state.toLowerCase()}-${city.toLowerCase().replace(/\s+/g, "-")}`;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("str_regulations")
      .select("*")
      .eq("id", cityId)
      .single();

    if (cached) {
      // Check if data is stale (older than 30 days)
      const lastVerified = new Date(cached.last_verified);
      const daysSinceVerified = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceVerified < 30) {
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
          if (daysSince < 30) {
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
