import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

const MASHVISOR_API_KEY = process.env.MASHVISOR_API_KEY || "20f866598emsh7e1f8d0058d2271p1adc56jsn8653832f1320";
const MASHVISOR_HOST = "mashvisor-api.p.rapidapi.com";

// Helper to make Mashvisor API calls
async function mashvisorFetch(endpoint: string) {
  const url = `https://${MASHVISOR_HOST}${endpoint}`;
  console.log("Mashvisor API call:", url);
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

    console.log("Parsed address:", { street, city, state, zip });

    let property = null;
    let neighborhoodId = null;
    let neighborhoodData = null;
    let dataSource = "neighborhood"; // Track where data came from

    // =========================================================================
    // STEP 1: Try to get property info (may fail for many addresses)
    // =========================================================================
    try {
      const propertyData = await mashvisorFetch(
        `/property?address=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip_code=${encodeURIComponent(zip)}`
      );

      if (propertyData.status === "success" && propertyData.content) {
        property = propertyData.content;
        neighborhoodId = property.neighborhood?.id;
        dataSource = "property";
        console.log("Found property, neighborhood ID:", neighborhoodId);
      }
    } catch (e) {
      console.log("Property lookup failed (expected for many addresses):", e);
    }

    // =========================================================================
    // STEP 2: FALLBACK - Search neighborhoods by city/state
    // This is the key fix for "Property Not Found" issue
    // =========================================================================
    if (!neighborhoodId && city && state) {
      console.log("Property not found, falling back to city neighborhood search...");
      try {
        const searchData = await mashvisorFetch(
          `/city/neighborhoods/${encodeURIComponent(state)}/${encodeURIComponent(city)}?page=1&items=10`
        );
        
        if (searchData.status === "success" && searchData.content?.results?.length > 0) {
          // Get the first (most relevant) neighborhood
          neighborhoodId = searchData.content.results[0].id;
          console.log("Found neighborhood via city search:", neighborhoodId, searchData.content.results[0].name);
        }
      } catch (e) {
        console.log("Neighborhood search failed:", e);
      }
    }

    // =========================================================================
    // STEP 3: SECOND FALLBACK - Try city-level data directly
    // =========================================================================
    if (!neighborhoodId && city && state) {
      console.log("No neighborhood found, trying city-level data...");
      try {
        // Try to get city overview data
        const cityData = await mashvisorFetch(
          `/city/overview/${encodeURIComponent(state)}/${encodeURIComponent(city)}`
        );
        
        if (cityData.status === "success" && cityData.content) {
          // Use city-level data as neighborhood data
          neighborhoodData = {
            name: city,
            city: city,
            state: state,
            airbnb_rental: {
              night_price: cityData.content.airbnb_night_price,
              occupancy: cityData.content.airbnb_occupancy,
              rental_income: cityData.content.airbnb_rental,
              cap_rate: cityData.content.airbnb_cap,
            },
            traditional_rental: {
              rental_income: cityData.content.traditional_rental,
              cap_rate: cityData.content.traditional_cap,
            },
            num_of_airbnb_properties: cityData.content.num_of_airbnb_listings,
            median_price: cityData.content.median_price,
            walkscore: cityData.content.walk_score,
            transitscore: cityData.content.transit_score,
            bikescore: cityData.content.bike_score,
          };
          dataSource = "city";
          console.log("Using city-level data for:", city);
        }
      } catch (e) {
        console.log("City data fetch failed:", e);
      }
    }

    // =========================================================================
    // STEP 4: Get neighborhood bar data (main STR metrics)
    // =========================================================================
    if (neighborhoodId && !neighborhoodData) {
      try {
        const nbData = await mashvisorFetch(
          `/neighborhood/${neighborhoodId}/bar?state=${encodeURIComponent(state)}`
        );
        if (nbData.status === "success" && nbData.content) {
          neighborhoodData = nbData.content;
          console.log("Got neighborhood bar data:", neighborhoodData.name);
        }
      } catch (e) {
        console.log("Neighborhood bar fetch failed:", e);
      }
    }

    // =========================================================================
    // STEP 5: Get active listings to calculate REAL percentiles
    // =========================================================================
    let listingsData = null;
    let percentileData = {
      revenue: { p25: 0, p50: 0, p75: 0, p90: 0 },
      adr: { p25: 0, p50: 0, p75: 0, p90: 0 },
      occupancy: { p25: 0, p50: 0, p75: 0, p90: 0 },
    };
    let comparableListings: any[] = [];

    if (city && state) {
      try {
        // Fetch listings by city (more reliable than neighborhood)
        let listingsEndpoint = `/airbnb-property/active-listings?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}&page=1&items=100`;
        
        // Add neighborhood filter if available
        if (neighborhoodId) {
          listingsEndpoint += `&neighborhood_id=${neighborhoodId}`;
        }
        
        // Filter by bedrooms if specified
        if (bedrooms) {
          listingsEndpoint += `&bedrooms=${bedrooms}`;
        }

        console.log("Fetching listings...");
        const listingsResponse = await mashvisorFetch(listingsEndpoint);
        
        if (listingsResponse.status === "success" && listingsResponse.content?.properties?.length > 0) {
          listingsData = listingsResponse.content;
          const props = listingsData.properties;
          console.log(`Found ${props.length} listings`);

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

          console.log("Calculated percentiles:", percentileData);

          // Get top 5 comparable listings for display
          comparableListings = props
            .filter((p: any) => p.rental_income > 0)
            .sort((a: any, b: any) => b.rental_income - a.rental_income)
            .slice(0, 5)
            .map((p: any) => ({
              id: p.id,
              name: p.name || `${p.num_of_rooms} BR in ${city}`,
              url: p.url || `https://www.airbnb.com/rooms/${p.id}`,
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
        } else {
          console.log("No listings found for this area");
        }
      } catch (e) {
        console.log("Listings fetch failed:", e);
      }
    }

    // =========================================================================
    // STEP 6: Get historical occupancy data for seasonality
    // =========================================================================
    let historicalData: any[] = [];
    if (neighborhoodId) {
      try {
        const histResponse = await mashvisorFetch(
          `/neighborhood/${neighborhoodId}/historical/airbnb?state=${encodeURIComponent(state)}`
        );
        if (histResponse.status === "success" && histResponse.content?.results) {
          historicalData = histResponse.content.results.slice(0, 12).reverse();
        }
      } catch (e) {
        console.log("Historical data fetch failed:", e);
      }
    }

    // =========================================================================
    // FINAL CHECK: If we have no data at all, return helpful error
    // =========================================================================
    if (!neighborhoodData && !listingsData) {
      return NextResponse.json({
        success: false,
        error: "No STR data found for this location",
        message: `We couldn't find short-term rental data for "${city}, ${state}". Try a major market like Nashville, Austin, Denver, or Miami.`,
        suggestions: [
          "Nashville, TN",
          "Austin, TX", 
          "Denver, CO",
          "Miami, FL",
          "Phoenix, AZ",
        ],
      });
    }

    // =========================================================================
    // BUILD RESPONSE
    // =========================================================================
    const airbnbRental = neighborhoodData?.airbnb_rental || {};
    const traditionalRental = neighborhoodData?.traditional_rental || {};

    // Use REAL data from Mashvisor
    const avgOccupancy = airbnbRental.occupancy || neighborhoodData?.avg_occupancy || 0;
    const avgAdr = airbnbRental.night_price || 0;
    const avgMonthlyRevenue = airbnbRental.rental_income || 0;

    const result = {
      success: true,
      dataSource: dataSource, // Tell frontend where data came from
      
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
      
      neighborhood: {
        id: neighborhoodId,
        name: neighborhoodData?.name || city,
        city: neighborhoodData?.city || city,
        state: neighborhoodData?.state || state,
        
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
        listingsCount: neighborhoodData?.num_of_airbnb_properties || listingsData?.num_of_properties || 0,
        traditionalCount: neighborhoodData?.num_of_traditional_properties || 0,
        totalProperties: neighborhoodData?.num_of_properties || 0,
        
        // Scores
        mashMeter: neighborhoodData?.mashMeter || 0,
        mashMeterStars: neighborhoodData?.mashMeterStars || 0,
        walkScore: neighborhoodData?.walkscore || 0,
        transitScore: neighborhoodData?.transitscore || 0,
        bikeScore: neighborhoodData?.bikescore || 0,
        
        // Market data
        medianPrice: neighborhoodData?.median_price || 0,
        pricePerSqft: neighborhoodData?.price_per_sqft || 0,
        avgSoldPrice: neighborhoodData?.average_sold_price || 0,
        avgDaysOnMarket: neighborhoodData?.average_days_on_market || 0,
        strategy: neighborhoodData?.strategy || "airbnb",
      },
      
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

    console.log("Returning result for:", city, state, "Data source:", dataSource);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Mashvisor API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch property data. Please try again." },
      { status: 500 }
    );
  }
}
