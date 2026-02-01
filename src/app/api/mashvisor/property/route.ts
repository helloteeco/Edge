import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

const MASHVISOR_API_KEY = process.env.MASHVISOR_API_KEY || "20f866598emsh7e1f8d0058d2271p1adc56jsn8653832f1320";
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

    let property = null;
    let neighborhoodId = null;

    // First, try to get property info to find neighborhood ID
    const propertyUrl = `https://${MASHVISOR_HOST}/property?address=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip_code=${encodeURIComponent(zip)}`;

    try {
      const propertyResponse = await fetch(propertyUrl, {
        method: "GET",
        headers: {
          "x-rapidapi-key": MASHVISOR_API_KEY,
          "x-rapidapi-host": MASHVISOR_HOST,
        },
      });

      const propertyData = await propertyResponse.json();

      if (propertyData.status === "success" && propertyData.content) {
        property = propertyData.content;
        neighborhoodId = property.neighborhood?.id;
      }
    } catch (e) {
      console.log("Property lookup failed, will try neighborhood search:", e);
    }

    // If no neighborhood ID from property, try to find neighborhood by city search
    if (!neighborhoodId && city && state) {
      try {
        const searchUrl = `https://${MASHVISOR_HOST}/city/neighborhoods/${encodeURIComponent(state)}/${encodeURIComponent(city)}?page=1&items=5`;
        
        const searchResponse = await fetch(searchUrl, {
          method: "GET",
          headers: {
            "x-rapidapi-key": MASHVISOR_API_KEY,
            "x-rapidapi-host": MASHVISOR_HOST,
          },
        });

        const searchData = await searchResponse.json();
        
        if (searchData.status === "success" && searchData.content?.results?.length > 0) {
          // Use the first neighborhood (usually the main one)
          neighborhoodId = searchData.content.results[0].id;
        }
      } catch (e) {
        console.log("Neighborhood search failed:", e);
      }
    }

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

    // If we have no data at all, return error
    if (!property && !neighborhoodData) {
      return NextResponse.json({
        success: false,
        error: "No data found for this location",
        message: "This address or city may not have STR data available. Try a major city like Nashville, Austin, or Denver.",
      });
    }

    // Extract relevant data with CORRECT field mapping from Mashvisor API
    // The neighborhood/bar endpoint returns data in this structure:
    // - airbnb_rental: { night_price, occupancy, rental_income, cap_rate, roi }
    // - traditional_rental: { night_price, occupancy, rental_income, cap_rate, roi }
    // - walkscore, transitscore, bikescore (not walk_score, transit_score, bike_score)
    // - num_of_airbnb_properties (not num_of_airbnb_listings)
    
    const airbnbRental = neighborhoodData?.airbnb_rental || {};
    const traditionalRental = neighborhoodData?.traditional_rental || {};

    const result = {
      success: true,
      property: property ? {
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zip_code || property.zip,
        bedrooms: property.beds,
        bathrooms: property.baths,
        sqft: property.sqft,
        yearBuilt: property.year_built,
        propertyType: property.property_type || property.homeType,
        listPrice: property.list_price,
        lastSalePrice: property.last_sale_price,
        lastSaleDate: property.last_sale_date,
      } : {
        address: street,
        city: city,
        state: state,
        zipCode: zip,
        bedrooms: null,
        bathrooms: null,
        sqft: null,
        yearBuilt: null,
        propertyType: null,
        listPrice: null,
        lastSalePrice: null,
        lastSaleDate: null,
      },
      neighborhood: neighborhoodData ? {
        id: neighborhoodId,
        name: neighborhoodData.name || city,
        city: neighborhoodData.city || city,
        state: neighborhoodData.state || state,
        // CORRECT field mapping for STR data
        occupancy: airbnbRental.occupancy || neighborhoodData.avg_occupancy || 0,
        adr: airbnbRental.night_price || 0,
        monthlyRevenue: airbnbRental.rental_income || 0,
        strCapRate: airbnbRental.cap_rate || 0,
        strRoi: airbnbRental.roi || 0,
        // Traditional rental data
        traditionalRent: traditionalRental.rental_income || 0,
        ltrCapRate: traditionalRental.cap_rate || 0,
        ltrRoi: traditionalRental.roi || 0,
        // Property counts
        listingsCount: neighborhoodData.num_of_airbnb_properties || 0,
        traditionalCount: neighborhoodData.num_of_traditional_properties || 0,
        totalProperties: neighborhoodData.num_of_properties || 0,
        // Scores - CORRECT field names (no underscores)
        mashMeter: neighborhoodData.mashMeter || 0,
        walkScore: neighborhoodData.walkscore || 0,
        transitScore: neighborhoodData.transitscore || 0,
        bikeScore: neighborhoodData.bikescore || 0,
        // Market data
        medianPrice: neighborhoodData.median_price || 0,
        pricePerSqft: neighborhoodData.price_per_sqft || 0,
        avgSoldPrice: neighborhoodData.average_sold_price || 0,
        avgDaysOnMarket: neighborhoodData.average_days_on_market || 0,
        strategy: neighborhoodData.strategy || "airbnb",
      } : null,
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
