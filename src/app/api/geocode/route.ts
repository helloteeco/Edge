import { NextRequest, NextResponse } from "next/server";

// Google Places API key - you need to enable Places API in Google Cloud Console
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

// Fallback to Geoapify if no Google API key
const GEOAPIFY_API_KEY = "6dc94b0b19644c79b3de0a187f0996f0";

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
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  "District of Columbia": "DC"
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    // Try Google Places API first if key is available
    if (GOOGLE_PLACES_API_KEY) {
      const googleResult = await fetchGooglePlaces(query);
      if (googleResult.suggestions.length > 0) {
        return NextResponse.json(googleResult);
      }
    }

    // Fallback to Geoapify
    const geoapifyResult = await fetchGeoapify(query);
    if (geoapifyResult.suggestions.length > 0) {
      return NextResponse.json(geoapifyResult);
    }

    // Final fallback to Nominatim
    return await fallbackToNominatim(query);
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ suggestions: [], error: "Geocoding failed" });
  }
}

// Google Places Autocomplete (New API)
async function fetchGooglePlaces(query: string) {
  try {
    // Use Places API (New) - Autocomplete endpoint
    const url = "https://places.googleapis.com/v1/places:autocomplete";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ["us"],
        includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
        languageCode: "en",
      }),
    });

    if (!response.ok) {
      console.error("Google Places API error:", response.status);
      return { suggestions: [] };
    }

    const data = await response.json();

    if (!data.suggestions || data.suggestions.length === 0) {
      return { suggestions: [] };
    }

    // Map Google Places results to our format
    const suggestions = data.suggestions
      .filter((s: any) => s.placePrediction)
      .slice(0, 5)
      .map((item: any) => {
        const prediction = item.placePrediction;
        const mainText = prediction.structuredFormat?.mainText?.text || "";
        const secondaryText = prediction.structuredFormat?.secondaryText?.text || "";
        
        // Parse secondary text to extract city, state, zip
        // Format is usually "City, State ZIP, USA" or "City, State, USA"
        const parts = secondaryText.split(",").map((p: string) => p.trim());
        const city = parts[0] || "";
        
        // State and zip are usually in the second part
        let state = "";
        let zip = "";
        if (parts[1]) {
          const stateZipMatch = parts[1].match(/([A-Z]{2})\s*(\d{5})?/);
          if (stateZipMatch) {
            state = stateZipMatch[1];
            zip = stateZipMatch[2] || "";
          } else {
            // Try to get state abbreviation from full name
            state = stateAbbreviations[parts[1]] || parts[1];
          }
        }

        return {
          display: prediction.text?.text || `${mainText}, ${secondaryText}`,
          street: mainText,
          city,
          state,
          zip,
          streetLine: mainText,
          locationLine: secondaryText.replace(", USA", ""),
          placeId: prediction.placeId,
        };
      });

    return { suggestions };
  } catch (error) {
    console.error("Google Places error:", error);
    return { suggestions: [] };
  }
}

// Geoapify Autocomplete
async function fetchGeoapify(query: string) {
  try {
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:us&format=json&limit=5&type=amenity,street,housenumber&apiKey=${GEOAPIFY_API_KEY}`;

    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      return { suggestions: [] };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return { suggestions: [] };
    }

    const suggestions = data.results.map((item: any) => {
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
      
      const city = item.city || item.town || item.village || item.county || "";
      const stateFull = item.state || "";
      const state = stateAbbreviations[stateFull] || stateFull;
      const zip = item.postcode || "";
      
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
    }).filter((s: any) => s.street && s.city);

    return { suggestions };
  } catch (error) {
    console.error("Geoapify error:", error);
    return { suggestions: [] };
  }
}

// Nominatim fallback
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
