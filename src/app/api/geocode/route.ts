import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    // Use Nominatim (OpenStreetMap) for free geocoding
    // Add "USA" to help with US-focused results
    const searchQuery = query.toLowerCase().includes("usa") || query.toLowerCase().includes("united states") 
      ? query 
      : `${query}, USA`;
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&countrycodes=us&limit=8`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "EdgeByTeeco/1.0 (contact@teeco.co)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Nominatim API error:", response.status);
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();

    // Map all results, not just houses - users might search for cities or streets
    const suggestions = data.slice(0, 5).map((item: any) => {
      const address = item.address || {};
      
      // Build street address
      let street = "";
      if (address.house_number && address.road) {
        street = `${address.house_number} ${address.road}`;
      } else if (address.road) {
        street = address.road;
      } else if (address.neighbourhood) {
        street = address.neighbourhood;
      }
      
      // Get city name
      const city = address.city || address.town || address.village || address.county || "";
      
      // Get state - convert full name to abbreviation if possible
      const stateAbbreviations: Record<string, string> = {
        "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
        "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
        "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
        "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
        "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
        "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
        "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
        "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
        "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
        "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
      };
      
      const stateFull = address.state || "";
      const state = stateAbbreviations[stateFull] || stateFull;
      
      return {
        displayName: item.display_name,
        address: {
          street: street || item.display_name.split(",")[0] || "",
          city,
          state,
          zipCode: address.postcode || "",
        },
        lat: item.lat,
        lon: item.lon,
        type: item.type,
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ suggestions: [], error: "Geocoding failed" });
  }
}
