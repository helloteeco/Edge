import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

const MASHVISOR_API_KEY = process.env.MASHVISOR_API_KEY || "20f866598emsh7e1f8d0058d2271p1adc56jsn8653832f1320";
const MASHVISOR_HOST = "mashvisor-api.p.rapidapi.com";

// Helper to make Mashvisor API calls
async function mashvisorFetch(endpoint: string) {
  const url = `https://${MASHVISOR_HOST}${endpoint}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": MASHVISOR_API_KEY,
      "x-rapidapi-host": MASHVISOR_HOST,
    },
  });
  return response.json();
}

// Calculate percentiles from an array of numbers
function calculatePercentiles(values: number[]) {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * 0.25)] || 0;
  const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
  const p75 = sorted[Math.floor(sorted.length * 0.75)] || 0;
  const p90 = sorted[Math.floor(sorted.length * 0.90)] || 0;
  return { p25, p50, p75, p90 };
}

export async function POST(request: NextRequest) {
  try {
    const { address, bedrooms = 3 } = await request.json();

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
    let neighborhoodData = null;

    // Step 1: Try to get property info to find neighborhood ID
    try {
      const propertyData = await mashvisorFetch(
        `/property?address=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip_code=${encodeURIComponent(zip)}`
      );

      if (propertyData.status === "success" && propertyData.content) {
        property = propertyData.content;
        neighborhoodId = property.neighborhood?.id;
      }
    } catch (e) {
      console.log("Property lookup failed:", e);
    }

    // Step 2: If no neighborhood ID from property, search neighborhoods by city
    if (!neighborhoodId && city && state) {
      try {
        const searchData = await mashvisorFetch(
          `/city/neighborhoods/${encodeURIComponent(state)}/${encodeURIComponent(city)}?page=1&items=5`
        );
        
        if (searchData.status === "success" && searchData.content?.results?.length > 0) {
          neighborhoodId = searchData.content.results[0].id;
        }
      } catch (e) {
        console.log("Neighborhood search failed:", e);
      }
    }

    // Step 3: Get neighborhood bar data (main STR metrics)
    if (neighborhoodId) {
      try {
        const nbData = await mashvisorFetch(
          `/neighborhood/${neighborhoodId}/bar?state=${encodeURIComponent(state)}`
        );
        if (nbData.status === "success" && nbData.content) {
          neighborhoodData = nbData.content;
        }
      } catch (e) {
        console.log("Neighborhood bar fetch failed:", e);
      }
    }

    // Step 4: Get active listings to calculate REAL percentiles
    let listingsData = null;
    let percentileData = {
      revenue: { p25: 0, p50: 0, p75: 0, p90: 0 },
      adr: { p25: 0, p50: 0, p75: 0, p90: 0 },
      occupancy: { p25: 0, p50: 0, p75: 0, p90: 0 },
    };
    let comparableListings: any[] = [];

    if (neighborhoodId || (city && state)) {
      try {
        // Fetch listings - try by neighborhood first, then by city
        let listingsEndpoint = neighborhoodId 
          ? `/airbnb-property/active-listings?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}&neighborhood_id=${neighborhoodId}&page=1&items=100`
          : `/airbnb-property/active-listings?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}&page=1&items=100`;
        
        // Filter by bedrooms if specified
        if (bedrooms) {
          listingsEndpoint += `&bedrooms=${bedrooms}`;
        }

        const listingsResponse = await mashvisorFetch(listingsEndpoint);
        
        if (listingsResponse.status === "success" && listingsResponse.content?.properties?.length > 0) {
          listingsData = listingsResponse.content;
          const props = listingsData.properties;

          // Extract values for percentile calculation
          const revenues = props.map((p: any) => p.rental_income).filter((v: number) => v > 0);
          const adrs = props.map((p: any) => p.night_price).filter((v: number) => v > 0);
          const occupancies = props.map((p: any) => p.occupancy).filter((v: number) => v > 0);

          // Calculate real percentiles from actual listings
          percentileData = {
            revenue: calculatePercentiles(revenues),
            adr: calculatePercentiles(adrs),
            occupancy: calculatePercentiles(occupancies),
          };

          // Get top 5 comparable listings for display
          comparableListings = props
            .filter((p: any) => p.rental_income > 0)
            .sort((a: any, b: any) => b.rental_income - a.rental_income)
            .slice(0, 5)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              url: p.url,
              image: p.image,
              bedrooms: p.num_of_rooms,
              bathrooms: p.num_of_baths,
              nightPrice: p.night_price,
              occupancy: p.occupancy,
              monthlyRevenue: p.rental_income,
              annualRevenue: p.rental_income * 12,
              rating: p.star_rating,
              reviewsCount: p.reviews_count,
              propertyType: p.property_type,
            }));
        }
      } catch (e) {
        console.log("Listings fetch failed:", e);
      }
    }

    // Step 5: Get historical occupancy data for seasonality
    let historicalData: any[] = [];
    if (neighborhoodId) {
      try {
        const histResponse = await mashvisorFetch(
          `/neighborhood/${neighborhoodId}/historical/airbnb?state=${encodeURIComponent(state)}`
        );
        if (histResponse.status === "success" && histResponse.content?.results) {
          historicalData = histResponse.content.results.slice(0, 12).reverse(); // Last 12 months
        }
      } catch (e) {
        console.log("Historical data fetch failed:", e);
      }
    }

    // If we have no data at all, return error
    if (!neighborhoodData && !listingsData) {
      return NextResponse.json({
        success: false,
        error: "No data found for this location",
        message: "This address or city may not have STR data available. Try a major city like Nashville, Austin, or Denver.",
      });
    }

    // Extract data from neighborhood bar response
    const airbnbRental = neighborhoodData?.airbnb_rental || {};
    const traditionalRental = neighborhoodData?.traditional_rental || {};

    // Use REAL data from Mashvisor - no fallbacks to fake numbers
    const avgOccupancy = airbnbRental.occupancy || neighborhoodData?.avg_occupancy || 0;
    const avgAdr = airbnbRental.night_price || 0;
    const avgMonthlyRevenue = airbnbRental.rental_income || 0;

    // Build comprehensive result
    const result = {
      success: true,
      property: property ? {
        address: property.address || street,
        city: property.city || city,
        state: property.state || state,
        zipCode: property.zip_code || property.zip || zip,
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
      },
      
      neighborhood: neighborhoodData ? {
        id: neighborhoodId,
        name: neighborhoodData.name || city,
        city: neighborhoodData.city || city,
        state: neighborhoodData.state || state,
        
        // Core STR metrics from Mashvisor
        occupancy: avgOccupancy,
        adr: avgAdr,
        monthlyRevenue: avgMonthlyRevenue,
        annualRevenue: avgMonthlyRevenue * 12,
        
        // Cap rates and ROI
        strCapRate: airbnbRental.cap_rate || 0,
        strRoi: airbnbRental.roi || 0,
        traditionalRent: traditionalRental.rental_income || 0,
        ltrCapRate: traditionalRental.cap_rate || 0,
        ltrRoi: traditionalRental.roi || 0,
        
        // Market trends
        revenueChange: airbnbRental.rental_income_change || "stable",
        revenueChangePercent: airbnbRental.rental_income_change_percentage || 0,
        occupancyChange: airbnbRental.occupancy_change || "stable",
        occupancyChangePercent: airbnbRental.occupancy_change_percentage || 0,
        
        // Property counts
        listingsCount: neighborhoodData.num_of_airbnb_properties || 0,
        traditionalCount: neighborhoodData.num_of_traditional_properties || 0,
        totalProperties: neighborhoodData.num_of_properties || 0,
        
        // Scores
        mashMeter: neighborhoodData.mashMeter || 0,
        mashMeterStars: neighborhoodData.mashMeterStars || 0,
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
      
      // REAL percentile data calculated from actual listings
      percentiles: {
        revenue: percentileData.revenue,
        adr: percentileData.adr,
        occupancy: percentileData.occupancy,
        listingsAnalyzed: listingsData?.properties?.length || 0,
        totalListingsInArea: listingsData?.num_of_properties || 0,
      },
      
      // Comparable listings for reference
      comparables: comparableListings,
      
      // Historical data for seasonality chart
      historical: historicalData.map((h: any) => ({
        year: h.year,
        month: h.month,
        occupancy: h.value,
      })),
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
