import { NextRequest, NextResponse } from "next/server";

const MASHVISOR_API_KEY = "20f866598emsh7e1f8d0058d2271p1adc56jsn8653832f1320";
const MASHVISOR_HOST = "mashvisor-api.p.rapidapi.com";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Parse address to extract components
    const addressParts = address.split(",").map((p: string) => p.trim());
    const street = addressParts[0] || "";
    const city = addressParts[1] || "";
    const stateZip = addressParts[2] || "";
    const state = stateZip.split(" ")[0] || "";
    const zip = stateZip.split(" ")[1] || "";

    // First, get property info to find neighborhood ID
    const propertyUrl = `https://${MASHVISOR_HOST}/property?address=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip_code=${encodeURIComponent(zip)}`;

    const propertyResponse = await fetch(propertyUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": MASHVISOR_API_KEY,
        "x-rapidapi-host": MASHVISOR_HOST,
      },
    });

    const propertyData = await propertyResponse.json();

    if (propertyData.status !== "success" || !propertyData.content) {
      return NextResponse.json({
        success: false,
        error: "Property not found in Mashvisor database",
        message: "This address may not have STR data available. Try a different address or enter data manually.",
      });
    }

    const property = propertyData.content;
    const neighborhoodId = property.neighborhood?.id;

    // Get neighborhood data for STR metrics
    let neighborhoodData = null;
    if (neighborhoodId) {
      const neighborhoodUrl = `https://${MASHVISOR_HOST}/neighborhood/${neighborhoodId}/bar?state=${encodeURIComponent(state)}`;

      const neighborhoodResponse = await fetch(neighborhoodUrl, {
        method: "GET",
        headers: {
          "x-rapidapi-key": MASHVISOR_API_KEY,
          "x-rapidapi-host": MASHVISOR_HOST,
        },
      });

      const nbData = await neighborhoodResponse.json();
      if (nbData.status === "success" && nbData.content) {
        neighborhoodData = nbData.content;
      }
    }

    // Extract relevant data
    const result = {
      success: true,
      property: {
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zip_code,
        bedrooms: property.beds,
        bathrooms: property.baths,
        sqft: property.sqft,
        yearBuilt: property.year_built,
        propertyType: property.property_type,
        listPrice: property.list_price,
        lastSalePrice: property.last_sale_price,
        lastSaleDate: property.last_sale_date,
      },
      neighborhood: neighborhoodData
        ? {
            id: neighborhoodId,
            name: neighborhoodData.name,
            occupancy: neighborhoodData.airbnb_occupancy,
            adr: neighborhoodData.airbnb_night_price,
            monthlyRevenue: neighborhoodData.airbnb_rental,
            traditionalRent: neighborhoodData.traditional_rental,
            strCapRate: neighborhoodData.airbnb_cap,
            ltrCapRate: neighborhoodData.traditional_cap,
            listingsCount: neighborhoodData.num_of_airbnb_listings,
            mashMeter: neighborhoodData.mashMeter,
            walkScore: neighborhoodData.walk_score,
            transitScore: neighborhoodData.transit_score,
            bikeScore: neighborhoodData.bike_score,
          }
        : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mashvisor API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch property data" },
      { status: 500 }
    );
  }
}
