import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    // Use Nominatim (OpenStreetMap) for free geocoding
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=us&limit=5`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "EdgeByTeeco/1.0",
      },
    });

    const data = await response.json();

    const suggestions = data
      .filter((item: any) => {
        // Only include addresses with house numbers (actual properties)
        return item.address?.house_number || item.type === "house";
      })
      .map((item: any) => ({
        displayName: item.display_name,
        address: {
          street: item.address?.house_number
            ? `${item.address.house_number} ${item.address.road || ""}`
            : item.address?.road || "",
          city:
            item.address?.city ||
            item.address?.town ||
            item.address?.village ||
            "",
          state: item.address?.state || "",
          zipCode: item.address?.postcode || "",
        },
        lat: item.lat,
        lon: item.lon,
      }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
