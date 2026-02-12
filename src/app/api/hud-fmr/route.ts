import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HUD_API_TOKEN = process.env.HUD_API_TOKEN || "";

/**
 * GET /api/hud-fmr?state=WV&city=Oak+Hill
 * GET /api/hud-fmr?state=WV&county=Fayette
 * 
 * Returns HUD Fair Market Rent data for a given state + city or county.
 * Uses HUD User API: https://www.huduser.gov/portal/dataset/fmr-api.html
 * 
 * Flow:
 * 1. If county not provided, resolve it from city+state via Nominatim
 * 2. List all counties in the state via /fmr/listCounties/{stateAbbr}
 * 3. Find the matching county by name
 * 4. Fetch FMR data via /fmr/data/{fipsCode}
 * 5. Return bedroom-level monthly rent data
 */

async function resolveCountyFromCity(city: string, state: string): Promise<string | null> {
  try {
    const query = `${city}, ${state}, USA`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EdgeByTeeco/1.0 (hello@teeco.co)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.length > 0 && data[0].address?.county) {
      // Nominatim returns "Fayette County" — strip the word "County"
      return data[0].address.county.replace(/\s*County\s*/gi, "").replace(/\s*Parish\s*/gi, "").trim();
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state")?.trim().toUpperCase();
    const city = searchParams.get("city")?.trim();
    let county = searchParams.get("county")?.trim();

    if (!state) {
      return NextResponse.json({ error: "Missing state parameter" }, { status: 400 });
    }

    if (!HUD_API_TOKEN) {
      return NextResponse.json({ error: "HUD API token not configured" }, { status: 500 });
    }

    // If no county provided but city is available, resolve county from city
    if (!county && city) {
      const resolved = await resolveCountyFromCity(city, state);
      if (resolved) {
        county = resolved;
        console.log(`[hud-fmr] Resolved county from city: ${city}, ${state} → ${county}`);
      }
    }

    const headers = {
      Authorization: `Bearer ${HUD_API_TOKEN}`,
      Accept: "application/json",
    };

    // Step 1: List all counties in the state
    const listResponse = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/listCounties/${state}`,
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (!listResponse.ok) {
      console.error(`[hud-fmr] listCounties failed: ${listResponse.status}`);
      return NextResponse.json({ error: "Failed to fetch county list from HUD" }, { status: 502 });
    }

    const counties: Array<{
      fips_code: string;
      county_name: string;
      town_name?: string;
      category?: string;
    }> = await listResponse.json();

    if (!counties || counties.length === 0) {
      return NextResponse.json({ error: "No counties found for state" }, { status: 404 });
    }

    // Step 2: Find matching county
    let matchedCounty = null;

    if (county) {
      // Normalize county name for matching
      const normalizedSearch = county
        .toLowerCase()
        .replace(/\s*county\s*/gi, "")
        .replace(/\s*parish\s*/gi, "")
        .trim();

      // Try exact match first
      matchedCounty = counties.find((c) => {
        const countyName = (c.county_name || "")
          .toLowerCase()
          .replace(/\s*county\s*/gi, "")
          .replace(/\s*parish\s*/gi, "")
          .replace(/,.*$/, "") // Remove state suffix
          .trim();
        return countyName === normalizedSearch;
      });

      // Try partial match
      if (!matchedCounty) {
        matchedCounty = counties.find((c) => {
          const countyName = (c.county_name || "")
            .toLowerCase()
            .replace(/,.*$/, "")
            .trim();
          return countyName.includes(normalizedSearch) || normalizedSearch.includes(countyName.replace(/\s*county\s*/gi, "").replace(/\s*parish\s*/gi, "").trim());
        });
      }
    }

    // If no county match, use the first county (often the largest/default metro area)
    if (!matchedCounty) {
      matchedCounty = counties[0];
    }

    // Step 3: Fetch FMR data for the matched county
    const fmrResponse = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${matchedCounty.fips_code}`,
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (!fmrResponse.ok) {
      console.error(`[hud-fmr] FMR data fetch failed: ${fmrResponse.status}`);
      return NextResponse.json({ error: "Failed to fetch FMR data from HUD" }, { status: 502 });
    }

    const fmrData = await fmrResponse.json();
    const data = fmrData.data;

    if (!data || !data.basicdata) {
      return NextResponse.json({ error: "No FMR data available for this area" }, { status: 404 });
    }

    // Step 4: Parse FMR data
    // basicdata can be a dict (non-metro) or array (metro with zip-level data)
    let fmrRents: Record<string, number>;

    if (Array.isArray(data.basicdata)) {
      // Metro area: first entry is MSA-level, use that
      const msaLevel = data.basicdata.find((entry: any) => entry.zip_code === "MSA level") || data.basicdata[0];
      fmrRents = {
        efficiency: msaLevel["Efficiency"] || 0,
        oneBedroom: msaLevel["One-Bedroom"] || 0,
        twoBedroom: msaLevel["Two-Bedroom"] || 0,
        threeBedroom: msaLevel["Three-Bedroom"] || 0,
        fourBedroom: msaLevel["Four-Bedroom"] || 0,
      };
    } else {
      // Non-metro area: basicdata is a flat dict
      fmrRents = {
        efficiency: data.basicdata["Efficiency"] || 0,
        oneBedroom: data.basicdata["One-Bedroom"] || 0,
        twoBedroom: data.basicdata["Two-Bedroom"] || 0,
        threeBedroom: data.basicdata["Three-Bedroom"] || 0,
        fourBedroom: data.basicdata["Four-Bedroom"] || 0,
      };
    }

    return NextResponse.json({
      success: true,
      areaName: data.area_name || matchedCounty.county_name,
      countyName: matchedCounty.county_name,
      fipsCode: matchedCounty.fips_code,
      year: data.basicdata?.year || (Array.isArray(data.basicdata) ? data.basicdata[0]?.year : null) || new Date().getFullYear(),
      fmr: fmrRents,
      // Convenience: map by bedroom count (0-4)
      byBedrooms: {
        0: fmrRents.efficiency,
        1: fmrRents.oneBedroom,
        2: fmrRents.twoBedroom,
        3: fmrRents.threeBedroom,
        4: fmrRents.fourBedroom,
      },
    });
  } catch (error) {
    console.error("[hud-fmr] Error:", error);
    return NextResponse.json({ error: "HUD FMR lookup failed" }, { status: 500 });
  }
}
