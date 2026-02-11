import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEOAPIFY_API_KEY = "6dc94b0b19644c79b3de0a187f0996f0";

/**
 * GET /api/geocode-latlng?address=62+Gatehouse+Ln,+Nettie,+WV,+USA
 * Returns { lat, lng } for the given address.
 * Uses Geoapify first, then Nominatim as fallback.
 * If the full address fails, progressively simplifies to city/state.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
    }

    // Try full address first, then progressively simplify
    const queries = buildFallbackQueries(address);

    for (const query of queries) {
      // Try Geoapify
      const geoapifyResult = await tryGeoapify(query);
      if (geoapifyResult) {
        return NextResponse.json(geoapifyResult);
      }

      // Try Nominatim
      const nominatimResult = await tryNominatim(query);
      if (nominatimResult) {
        return NextResponse.json(nominatimResult);
      }
    }

    return NextResponse.json({ error: "Could not geocode address" }, { status: 404 });
  } catch (error) {
    console.error("[geocode-latlng] Error:", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}

/**
 * Build progressively simpler queries from a full address.
 * "62 Gatehouse Ln, Nettie, WV, USA" → ["62 Gatehouse Ln, Nettie, WV, USA", "Nettie, WV, USA", "WV, USA"]
 */
function buildFallbackQueries(address: string): string[] {
  const queries = [address];
  
  // Remove street part: "62 Gatehouse Ln, Nettie, WV, USA" → "Nettie, WV, USA"
  const parts = address.split(",").map(p => p.trim());
  if (parts.length > 2) {
    queries.push(parts.slice(1).join(", "));
  }
  if (parts.length > 3) {
    queries.push(parts.slice(2).join(", "));
  }
  
  return queries;
}

async function tryGeoapify(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&filter=countrycode:us&format=json&limit=1&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      if (result.lat && result.lon) {
        console.log(`[geocode-latlng] Geoapify resolved "${query}" → ${result.lat}, ${result.lon}`);
        return { lat: result.lat, lng: result.lon };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function tryNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EdgeByTeeco/1.0 (contact@teeco.co)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length > 0 && data[0].lat && data[0].lon) {
      console.log(`[geocode-latlng] Nominatim resolved "${query}" → ${data[0].lat}, ${data[0].lon}`);
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}
