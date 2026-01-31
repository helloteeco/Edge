import { NextRequest, NextResponse } from "next/server";

const MASHVISOR_API_KEY = "20f866598emsh7e1f8d0058d2271p1adc56jsn8653832f1320";
const MASHVISOR_HOST = "mashvisor-api.p.rapidapi.com";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const state = searchParams.get("state");

    if (!city || !state) {
      return NextResponse.json(
        { error: "City and state are required" },
        { status: 400 }
      );
    }

    // Get top neighborhoods in the city
    const url = `https://${MASHVISOR_HOST}/trends/neighborhoods?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}&items=20`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": MASHVISOR_API_KEY,
        "x-rapidapi-host": MASHVISOR_HOST,
      },
    });

    const data = await response.json();

    if (data.status !== "success" || !data.content?.neighborhoods) {
      return NextResponse.json({
        success: false,
        error: "No neighborhood data found for this city",
        neighborhoods: [],
      });
    }

    const neighborhoods = data.content.neighborhoods.map((n: any) => ({
      id: n.id,
      name: n.name,
      city: n.city,
      state: n.state,
      occupancy: n.airbnb_occupancy,
      adr: n.night_price,
      monthlyRevenue: n.airbnb_rental,
      traditionalRent: n.traditional_rental,
      strCapRate: n.airbnb_cap,
      ltrCapRate: n.traditional_cap,
      listingsCount: n.num_of_listings,
      mashMeter: n.mashMeter,
      medianPrice: n.median_price,
    }));

    return NextResponse.json({
      success: true,
      city,
      state,
      neighborhoods,
    });
  } catch (error) {
    console.error("Mashvisor neighborhoods API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch neighborhoods" },
      { status: 500 }
    );
  }
}
