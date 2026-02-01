import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

const MASHVISOR_API_KEY = process.env.MASHVISOR_API_KEY || "20f866598emsh7e1f8d0058d2271p1adc56jsn8653832f1320";
const MASHVISOR_HOST = "mashvisor-api.p.rapidapi.com";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");

    if (!state) {
      return NextResponse.json(
        { error: "State is required" },
        { status: 400 }
      );
    }

    // Get top cities in the state
    const url = `https://${MASHVISOR_HOST}/trends/cities?state=${encodeURIComponent(state)}&items=25`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": MASHVISOR_API_KEY,
        "x-rapidapi-host": MASHVISOR_HOST,
      },
    });

    const data = await response.json();

    if (data.status !== "success" || !data.content?.cities) {
      return NextResponse.json({
        success: false,
        error: "No city data found for this state",
        cities: [],
      });
    }

    const cities = data.content.cities.map((c: any) => ({
      name: c.city,
      state: c.state,
      occupancy: c.airbnb_occupancy,
      adr: c.night_price,
      monthlyRevenue: c.airbnb_rental,
      traditionalRent: c.traditional_rental,
      strCapRate: c.airbnb_cap,
      ltrCapRate: c.traditional_cap,
      medianPrice: c.median_price,
      mashMeter: c.mashMeter,
    }));

    return NextResponse.json({
      success: true,
      state,
      cities,
    });
  } catch (error) {
    console.error("Mashvisor cities API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
