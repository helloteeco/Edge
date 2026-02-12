import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HUD_API_TOKEN = process.env.HUD_API_TOKEN || "";

// State abbreviation to full name mapping for RentData.org URLs
const STATE_NAMES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california",
  CO: "colorado", CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia",
  HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa",
  KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland",
  MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi", MO: "missouri",
  MT: "montana", NE: "nebraska", NV: "nevada", NH: "new-hampshire", NJ: "new-jersey",
  NM: "new-mexico", NY: "new-york", NC: "north-carolina", ND: "north-dakota", OH: "ohio",
  OK: "oklahoma", OR: "oregon", PA: "pennsylvania", RI: "rhode-island", SC: "south-carolina",
  SD: "south-dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont",
  VA: "virginia", WA: "washington", WV: "west-virginia", WI: "wisconsin", WY: "wyoming",
  DC: "district-of-columbia",
};

/**
 * GET /api/hud-fmr?state=GA&city=Columbus
 * GET /api/hud-fmr?state=GA&county=Muscogee
 * 
 * Returns HUD Fair Market Rent data for a given state + city or county.
 * 
 * Primary: HUD User API (requires token)
 * Fallback: Scrapes RentData.org (free, always available)
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
      return data[0].address.county.replace(/\s*County\s*/gi, "").replace(/\s*Parish\s*/gi, "").trim();
    }
    return null;
  } catch {
    return null;
  }
}

// ─── HUD API (primary) ─────────────────────────────────────────────────────
async function fetchFromHudApi(state: string, county: string | null): Promise<{
  success: boolean;
  areaName?: string;
  countyName?: string;
  fipsCode?: string;
  year?: number;
  fmr?: Record<string, number>;
  byBedrooms?: Record<number, number>;
} | null> {
  if (!HUD_API_TOKEN) return null;

  try {
    const headers = {
      Authorization: `Bearer ${HUD_API_TOKEN}`,
      Accept: "application/json",
    };

    const listResponse = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/listCounties/${state}`,
      { headers, signal: AbortSignal.timeout(8000) }
    );

    if (!listResponse.ok) {
      console.error(`[hud-fmr] HUD API listCounties failed: ${listResponse.status}`);
      return null;
    }

    const counties: Array<{
      fips_code: string;
      county_name: string;
      town_name?: string;
      category?: string;
    }> = await listResponse.json();

    if (!counties || counties.length === 0) return null;

    let matchedCounty = null;

    if (county) {
      const normalizedSearch = county
        .toLowerCase()
        .replace(/\s*county\s*/gi, "")
        .replace(/\s*parish\s*/gi, "")
        .trim();

      matchedCounty = counties.find((c) => {
        const countyName = (c.county_name || "")
          .toLowerCase()
          .replace(/\s*county\s*/gi, "")
          .replace(/\s*parish\s*/gi, "")
          .replace(/,.*$/, "")
          .trim();
        return countyName === normalizedSearch;
      });

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

    if (!matchedCounty) {
      matchedCounty = counties[0];
    }

    const fmrResponse = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${matchedCounty.fips_code}`,
      { headers, signal: AbortSignal.timeout(8000) }
    );

    if (!fmrResponse.ok) return null;

    const fmrData = await fmrResponse.json();
    const data = fmrData.data;

    if (!data || !data.basicdata) return null;

    let fmrRents: Record<string, number>;

    if (Array.isArray(data.basicdata)) {
      const msaLevel = data.basicdata.find((entry: any) => entry.zip_code === "MSA level") || data.basicdata[0];
      fmrRents = {
        efficiency: msaLevel["Efficiency"] || 0,
        oneBedroom: msaLevel["One-Bedroom"] || 0,
        twoBedroom: msaLevel["Two-Bedroom"] || 0,
        threeBedroom: msaLevel["Three-Bedroom"] || 0,
        fourBedroom: msaLevel["Four-Bedroom"] || 0,
      };
    } else {
      fmrRents = {
        efficiency: data.basicdata["Efficiency"] || 0,
        oneBedroom: data.basicdata["One-Bedroom"] || 0,
        twoBedroom: data.basicdata["Two-Bedroom"] || 0,
        threeBedroom: data.basicdata["Three-Bedroom"] || 0,
        fourBedroom: data.basicdata["Four-Bedroom"] || 0,
      };
    }

    return {
      success: true,
      areaName: data.area_name || matchedCounty.county_name,
      countyName: matchedCounty.county_name,
      fipsCode: matchedCounty.fips_code,
      year: data.basicdata?.year || (Array.isArray(data.basicdata) ? data.basicdata[0]?.year : null) || new Date().getFullYear(),
      fmr: fmrRents,
      byBedrooms: {
        0: fmrRents.efficiency,
        1: fmrRents.oneBedroom,
        2: fmrRents.twoBedroom,
        3: fmrRents.threeBedroom,
        4: fmrRents.fourBedroom,
      },
    };
  } catch (error) {
    console.error("[hud-fmr] HUD API error:", error);
    return null;
  }
}

// ─── RentData.org scraper (fallback) ────────────────────────────────────────
function parseDollar(s: string): number {
  return parseInt(s.replace(/[$,\s]/g, ""), 10) || 0;
}

async function fetchFromRentData(state: string, county: string | null, city: string | null): Promise<{
  success: boolean;
  areaName?: string;
  countyName?: string;
  fipsCode?: string;
  year?: number;
  fmr?: Record<string, number>;
  byBedrooms?: Record<number, number>;
} | null> {
  try {
    const stateName = STATE_NAMES[state];
    if (!stateName) {
      console.error(`[hud-fmr] Unknown state abbreviation: ${state}`);
      return null;
    }

    // Use current fiscal year (FY2026 = Oct 2025 - Sep 2026)
    const now = new Date();
    const fy = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();

    const url = `https://www.rentdata.org/states/${stateName}/${fy}`;
    console.log(`[hud-fmr] Fetching RentData.org fallback: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EdgeByTeeco/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Try previous year
      const prevUrl = `https://www.rentdata.org/states/${stateName}/${fy - 1}`;
      console.log(`[hud-fmr] Trying previous year: ${prevUrl}`);
      const prevResponse = await fetch(prevUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EdgeByTeeco/1.0)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!prevResponse.ok) return null;
      return parseRentDataHtml(await prevResponse.text(), state, county, city, fy - 1);
    }

    return parseRentDataHtml(await response.text(), state, county, city, fy);
  } catch (error) {
    console.error("[hud-fmr] RentData.org error:", error);
    return null;
  }
}

function parseRentDataHtml(
  html: string,
  state: string,
  county: string | null,
  city: string | null,
  year: number
): {
  success: boolean;
  areaName?: string;
  countyName?: string;
  fipsCode?: string;
  year?: number;
  fmr?: Record<string, number>;
  byBedrooms?: Record<number, number>;
} | null {
  // Parse the HTML table - RentData.org has a county table with columns:
  // County | 0 BR | 1 BR | 2 BR | 3 BR | 4 BR | Est. Population
  // We use regex to extract table rows since we can't use DOM parser on the server easily

  // Extract all table rows from the second table (county data)
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables: string[] = [];
  let match;
  while ((match = tableRegex.exec(html)) !== null) {
    tables.push(match[1]);
  }

  // The county data is in the second table (index 1)
  const countyTable = tables.length >= 2 ? tables[1] : tables[0];
  if (!countyTable) return null;

  // Extract rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[] = [];
  while ((match = rowRegex.exec(countyTable)) !== null) {
    rows.push(match[1]);
  }

  // Parse each row into county data
  type CountyFmr = {
    name: string;
    fmr0: number;
    fmr1: number;
    fmr2: number;
    fmr3: number;
    fmr4: number;
  };

  const countyData: CountyFmr[] = [];

  for (const row of rows) {
    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      // Strip HTML tags from cell content
      cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
    }

    if (cells.length >= 6) {
      const name = cells[0].replace(/Metro$/, "").trim();
      countyData.push({
        name,
        fmr0: parseDollar(cells[1]),
        fmr1: parseDollar(cells[2]),
        fmr2: parseDollar(cells[3]),
        fmr3: parseDollar(cells[4]),
        fmr4: parseDollar(cells[5]),
      });
    }
  }

  if (countyData.length === 0) return null;

  // Find the best match
  const searchTerms: string[] = [];
  if (county) {
    searchTerms.push(county.toLowerCase().replace(/\s*county\s*/gi, "").replace(/\s*parish\s*/gi, "").trim());
  }
  if (city) {
    searchTerms.push(city.toLowerCase().trim());
  }

  let bestMatch: CountyFmr | null = null;

  for (const term of searchTerms) {
    if (bestMatch) break;

    // Try exact county name match
    bestMatch = countyData.find((c) => {
      const normalized = c.name.toLowerCase()
        .replace(/\s*county\s*/gi, "")
        .replace(/\s*parish\s*/gi, "")
        .replace(/,\s*[a-z]{2}(-[a-z]{2})?\s*(hud\s*)?metro\s*fmr\s*area/gi, "")
        .replace(/,\s*[a-z]{2}\s*msa/gi, "")
        .replace(/,\s*[a-z]{2}/gi, "")
        .trim();
      return normalized === term;
    }) || null;

    // Try partial match (city name appears in the county/metro area name)
    if (!bestMatch) {
      bestMatch = countyData.find((c) => {
        const normalized = c.name.toLowerCase();
        return normalized.includes(term);
      }) || null;
    }

    // Try matching just the first word of the city against county names
    if (!bestMatch && term.includes(" ")) {
      const firstWord = term.split(" ")[0];
      bestMatch = countyData.find((c) => {
        const normalized = c.name.toLowerCase();
        return normalized.includes(firstWord);
      }) || null;
    }
  }

  // If no match found, use the first entry (usually the largest metro area)
  if (!bestMatch) {
    bestMatch = countyData[0];
  }

  const fmrRents = {
    efficiency: bestMatch.fmr0,
    oneBedroom: bestMatch.fmr1,
    twoBedroom: bestMatch.fmr2,
    threeBedroom: bestMatch.fmr3,
    fourBedroom: bestMatch.fmr4,
  };

  return {
    success: true,
    areaName: bestMatch.name,
    countyName: bestMatch.name,
    fipsCode: "rentdata-fallback",
    year,
    fmr: fmrRents,
    byBedrooms: {
      0: fmrRents.efficiency,
      1: fmrRents.oneBedroom,
      2: fmrRents.twoBedroom,
      3: fmrRents.threeBedroom,
      4: fmrRents.fourBedroom,
    },
  };
}

// ─── Main handler ───────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state")?.trim().toUpperCase();
    const city = searchParams.get("city")?.trim();
    let county = searchParams.get("county")?.trim();

    if (!state) {
      return NextResponse.json({ error: "Missing state parameter" }, { status: 400 });
    }

    // If no county provided but city is available, resolve county from city
    if (!county && city) {
      const resolved = await resolveCountyFromCity(city, state);
      if (resolved) {
        county = resolved;
        console.log(`[hud-fmr] Resolved county from city: ${city}, ${state} → ${county}`);
      }
    }

    // Try HUD API first (primary source)
    const hudResult = await fetchFromHudApi(state, county ?? null);
    if (hudResult) {
      console.log(`[hud-fmr] HUD API success for ${county || city}, ${state}`);
      return NextResponse.json(hudResult);
    }

    // Fallback: scrape RentData.org
    console.log(`[hud-fmr] HUD API failed, falling back to RentData.org for ${county || city}, ${state}`);
    const rentDataResult = await fetchFromRentData(state, county ?? null, city ?? null);
    if (rentDataResult) {
      console.log(`[hud-fmr] RentData.org success: ${rentDataResult.areaName}`);
      return NextResponse.json(rentDataResult);
    }

    // Both sources failed
    return NextResponse.json(
      { error: "Unable to fetch FMR data from any source" },
      { status: 502 }
    );
  } catch (error) {
    console.error("[hud-fmr] Error:", error);
    return NextResponse.json({ error: "HUD FMR lookup failed" }, { status: 500 });
  }
}
