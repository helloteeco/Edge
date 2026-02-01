import { NextRequest, NextResponse } from "next/server";

// Using Geoapify Autocomplete API - free tier allows 3000 requests/day
// This provides better address autocomplete similar to Google Places
const GEOAPIFY_API_KEY = "6dc94b0b19644c79b3de0a187f0996f0"; // Free tier key

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    // Use Geoapify Autocomplete API for US addresses
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:us&format=json&limit=5&type=amenity,street,housenumber&apiKey=${GEOAPIFY_API_KEY}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Geoapify API error:", response.status);
      // Fallback to Nominatim if Geoapify fails
      return fallbackToNominatim(query);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      // Try Nominatim as fallback
      return fallbackToNominatim(query);
    }

    // State abbreviations mapping
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

    // Map results to the format expected by the calculator
    const suggestions = data.results.map((item: any) => {
      // Build street address
      let street = "";
      if (item.housenumber && item.street) {
        street = `${item.housenumber} ${item.street}`;
      } else if (item.street) {
        street = item.street;
      } else if (item.name) {
        street = item.name;
      } else if (item.address_line1) {
        street = item.address_line1;
      }
      
      // Get city
      const city = item.city || item.town || item.village || item.county || "";
      
      // Get state abbreviation
      const stateFull = item.state || "";
      const state = stateAbbreviations[stateFull] || stateFull;
      
      // Get zip code
      const zip = item.postcode || "";
      
      // Build full display string
      let display = street;
      if (city) display += `, ${city}`;
      if (state) display += `, ${state}`;
      if (zip) display += ` ${zip}`;
      
      return {
        display,
        street,
        city,
        state,
        zip,
        // For Rabbu-style display
        streetLine: street,
        locationLine: city && state ? `${city}, ${state}` : city || state,
      };
    }).filter((s: any) => s.street && s.city); // Only return results with street and city

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ suggestions: [], error: "Geocoding failed" });
  }
}

// Fallback to Nominatim (OpenStreetMap) if Geoapify fails
async function fallbackToNominatim(query: string) {
  try {
    const searchQuery = `${query}, USA`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&countrycodes=us&limit=5`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "EdgeByTeeco/1.0 (contact@teeco.co)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();

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

    const suggestions = data.slice(0, 5).map((item: any) => {
      const address = item.address || {};
      
      let street = "";
      if (address.house_number && address.road) {
        street = `${address.house_number} ${address.road}`;
      } else if (address.road) {
        street = address.road;
      } else {
        street = item.display_name.split(",")[0] || "";
      }
      
      const city = address.city || address.town || address.village || address.county || "";
      const stateFull = address.state || "";
      const state = stateAbbreviations[stateFull] || stateFull;
      const zip = address.postcode || "";
      
      let display = street;
      if (city) display += `, ${city}`;
      if (state) display += `, ${state}`;
      if (zip) display += ` ${zip}`;
      
      return {
        display,
        street,
        city,
        state,
        zip,
        streetLine: street,
        locationLine: city && state ? `${city}, ${state}` : city || state,
      };
    }).filter((s: any) => s.street);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Nominatim fallback error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
