import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Allow up to 30s for the full chain

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

// ─── Static FMR fallback (FY2025 state averages from HUD/RentData.org) ──────
// This ensures we ALWAYS have data even if both HUD API and RentData.org are down.
// Format: [0BR, 1BR, 2BR, 3BR, 4BR]
const STATE_FMR_FALLBACK: Record<string, [number, number, number, number, number]> = {
  AL: [703, 758, 924, 1196, 1372],
  AK: [1058, 1170, 1461, 1936, 2239],
  AZ: [1055, 1163, 1431, 1918, 2165],
  AR: [674, 716, 901, 1184, 1339],
  CA: [1429, 1565, 1955, 2626, 3034],
  CO: [1062, 1137, 1408, 1835, 2162],
  CT: [1208, 1392, 1732, 2147, 2551],
  DE: [1192, 1253, 1564, 2005, 2314],
  DC: [2012, 2056, 2314, 2893, 3413],
  FL: [1134, 1216, 1446, 1879, 2183],
  GA: [932, 972, 1151, 1465, 1712],
  HI: [1630, 1684, 2201, 2941, 3417],
  ID: [836, 908, 1127, 1565, 1872],
  IL: [736, 814, 1015, 1315, 1484],
  IN: [764, 836, 1042, 1327, 1510],
  IA: [693, 746, 938, 1215, 1344],
  KS: [674, 735, 928, 1200, 1358],
  KY: [705, 776, 969, 1259, 1419],
  LA: [799, 867, 1054, 1357, 1577],
  ME: [893, 958, 1206, 1571, 1748],
  MD: [1354, 1445, 1716, 2214, 2547],
  MA: [1566, 1679, 2086, 2564, 2885],
  MI: [755, 837, 1046, 1338, 1492],
  MN: [775, 862, 1081, 1432, 1644],
  MS: [796, 828, 995, 1267, 1392],
  MO: [691, 730, 918, 1200, 1383],
  MT: [814, 889, 1116, 1488, 1766],
  NE: [653, 741, 938, 1191, 1317],
  NV: [983, 1080, 1360, 1864, 2255],
  NH: [1131, 1212, 1575, 2041, 2209],
  NJ: [1466, 1627, 1973, 2476, 2797],
  NM: [755, 853, 1039, 1389, 1649],
  NY: [1130, 1219, 1465, 1837, 2036],
  NC: [927, 969, 1158, 1501, 1781],
  ND: [776, 798, 967, 1300, 1590],
  OH: [747, 807, 1014, 1290, 1440],
  OK: [715, 763, 962, 1250, 1449],
  OR: [994, 1090, 1356, 1879, 2209],
  PA: [854, 942, 1158, 1482, 1658],
  RI: [1270, 1344, 1656, 2023, 2441],
  SC: [919, 969, 1150, 1458, 1697],
  SD: [638, 729, 920, 1215, 1440],
  TN: [887, 925, 1120, 1447, 1654],
  TX: [857, 905, 1109, 1447, 1689],
  UT: [874, 977, 1187, 1586, 1870],
  VT: [1045, 1094, 1350, 1744, 1894],
  VA: [1117, 1151, 1345, 1758, 2107],
  WA: [1060, 1157, 1441, 1971, 2302],
  WV: [697, 754, 927, 1215, 1378],
  WI: [754, 832, 1052, 1349, 1511],
  WY: [764, 790, 1010, 1352, 1660],
};

function getStateFallback(state: string): {
  success: boolean;
  areaName: string;
  countyName: string;
  fipsCode: string;
  year: number;
  fmr: Record<string, number>;
  byBedrooms: Record<number, number>;
  source: string;
} | null {
  const data = STATE_FMR_FALLBACK[state];
  if (!data) return null;
  const stateName = STATE_NAMES[state];
  const displayName = stateName ? stateName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : state;
  return {
    success: true,
    areaName: `${displayName} (State Average)`,
    countyName: `${displayName} (State Average)`,
    fipsCode: "state-average-fallback",
    year: 2025,
    fmr: {
      efficiency: data[0],
      oneBedroom: data[1],
      twoBedroom: data[2],
      threeBedroom: data[3],
      fourBedroom: data[4],
    },
    byBedrooms: {
      0: data[0],
      1: data[1],
      2: data[2],
      3: data[3],
      4: data[4],
    },
    source: "state-average",
  };
}

async function resolveCountyFromCity(city: string, state: string): Promise<string | null> {
  try {
    const query = `${city}, ${state}, USA`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EdgeByTeeco/1.0 (hello@teeco.co)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
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
      { headers, signal: AbortSignal.timeout(6000) }
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
      { headers, signal: AbortSignal.timeout(6000) }
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

    // Determine which years to try — start with the most likely available year
    const now = new Date();
    const currentYear = now.getFullYear();
    // RentData.org publishes FY data; FY2026 may not be available yet in early 2026
    // Try current year first, then previous year, then next year
    const yearsToTry = [currentYear, currentYear - 1, currentYear + 1];

    for (const year of yearsToTry) {
      const url = `https://www.rentdata.org/states/${stateName}/${year}`;
      console.log(`[hud-fmr] Trying RentData.org: ${url}`);

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const html = await response.text();
          const result = parseRentDataHtml(html, state, county, city, year);
          if (result) {
            console.log(`[hud-fmr] RentData.org success for year ${year}: ${result.areaName}`);
            return result;
          }
        } else {
          console.log(`[hud-fmr] RentData.org ${year} returned ${response.status}, trying next year...`);
        }
      } catch (fetchErr) {
        console.log(`[hud-fmr] RentData.org ${year} fetch error, trying next year...`);
      }
    }

    return null;
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

    // Fallback 1: scrape RentData.org
    console.log(`[hud-fmr] HUD API failed, falling back to RentData.org for ${county || city}, ${state}`);
    const rentDataResult = await fetchFromRentData(state, county ?? null, city ?? null);
    if (rentDataResult) {
      console.log(`[hud-fmr] RentData.org success: ${rentDataResult.areaName}`);
      return NextResponse.json(rentDataResult);
    }

    // Fallback 2: Static state-level FMR averages (NEVER fails for valid US states)
    console.log(`[hud-fmr] Both HUD API and RentData.org failed, using static state average for ${state}`);
    const staticResult = getStateFallback(state);
    if (staticResult) {
      console.log(`[hud-fmr] Static fallback success: ${staticResult.areaName}`);
      return NextResponse.json(staticResult);
    }

    // This should only happen for non-US states/territories not in our table
    return NextResponse.json(
      { error: "Unable to fetch FMR data from any source" },
      { status: 502 }
    );
  } catch (error) {
    console.error("[hud-fmr] Error:", error);
    
    // Even on unexpected errors, try the static fallback
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state")?.trim().toUpperCase();
    if (state) {
      const staticResult = getStateFallback(state);
      if (staticResult) {
        console.log(`[hud-fmr] Error recovery with static fallback: ${staticResult.areaName}`);
        return NextResponse.json(staticResult);
      }
    }
    
    return NextResponse.json({ error: "HUD FMR lookup failed" }, { status: 500 });
  }
}
