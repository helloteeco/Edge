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
    const { address, bedrooms = 3, bathrooms = 2 } = await request.json();

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

    console.log("Parsed address:", { street, city, state, zip, bedrooms, bathrooms });

    let property = null;
    let neighborhoodId = null;
    let neighborhoodData = null;
    let dataSource = "neighborhood";

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
    // =========================================================================
    if (!neighborhoodId && city && state) {
      console.log("Property not found, falling back to city neighborhood search...");
      try {
        const searchData = await mashvisorFetch(
          `/city/neighborhoods/${encodeURIComponent(state)}/${encodeURIComponent(city)}?page=1&items=10`
        );
        
        if (searchData.status === "success" && searchData.content?.results?.length > 0) {
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
        const cityData = await mashvisorFetch(
          `/city/overview/${encodeURIComponent(state)}/${encodeURIComponent(city)}`
        );
        
        if (cityData.status === "success" && cityData.content) {
          neighborhoodData = {
            name: city,
            city: city,
            state: state,
            airbnb_rental: {
              night_price: cityData.content.airbnb_night_price,
              occupancy: cityData.content.airbnb_occupancy,
              rental_income: cityData.content.airbnb_rental,
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
    // STEP 5: Get active listings and FILTER BY BEDROOM COUNT
    // NOTE: Mashvisor's bedrooms parameter doesn't work, so we filter client-side
    // =========================================================================
    let listingsData = null;
    let percentileData = {
      revenue: { p25: 0, p50: 0, p75: 0, p90: 0 },
      adr: { p25: 0, p50: 0, p75: 0, p90: 0 },
      occupancy: { p25: 0, p50: 0, p75: 0, p90: 0 },
    };
    let comparableListings: any[] = [];
    let totalListingsInArea = 0;
    let filteredListingsCount = 0;

    if (city && state) {
      try {
        // Fetch MORE listings to ensure we get enough of the right bedroom count
        let listingsEndpoint = `/airbnb-property/active-listings?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}&page=1&items=200`;
        
        if (neighborhoodId) {
          listingsEndpoint += `&neighborhood_id=${neighborhoodId}`;
        }

        console.log("Fetching listings for filtering...");
        const listingsResponse = await mashvisorFetch(listingsEndpoint);
        
        if (listingsResponse.status === "success" && listingsResponse.content?.properties?.length > 0) {
          listingsData = listingsResponse.content;
          const allProps = listingsData.properties;
          totalListingsInArea = allProps.length;
          console.log(`Found ${allProps.length} total listings`);

          // =====================================================================
          // CRITICAL FIX: Filter listings by bedroom count
          // For 6+ bedrooms, include all listings with 6 or more bedrooms
          // =====================================================================
          const targetBedrooms = bedrooms;
          const filteredProps = allProps.filter((p: any) => {
            const listingBedrooms = p.num_of_rooms || 0;
            if (targetBedrooms >= 6) {
              return listingBedrooms >= 6;
            }
            return listingBedrooms === targetBedrooms;
          });

          filteredListingsCount = filteredProps.length;
          console.log(`Filtered to ${filteredProps.length} listings with ${targetBedrooms}${targetBedrooms >= 6 ? '+' : ''} bedrooms`);

          // If we have filtered listings, use them for percentiles
          const propsForCalculation = filteredProps.length >= 3 ? filteredProps : allProps;
          
          // Extract values for percentile calculation
          const revenues = propsForCalculation.map((p: any) => p.rental_income).filter((v: number) => v > 0);
          const adrs = propsForCalculation.map((p: any) => p.night_price).filter((v: number) => v > 0);
          const occupancies = propsForCalculation.map((p: any) => p.occupancy).filter((v: number) => v > 0);

          // Calculate real percentiles
          percentileData = {
            revenue: calculatePercentiles(revenues),
            adr: calculatePercentiles(adrs),
            occupancy: calculatePercentiles(occupancies),
          };

          console.log("Calculated percentiles from filtered listings:", percentileData);

          // Get top 5 comparable listings (from filtered set if available)
          const compsSource = filteredProps.length >= 3 ? filteredProps : allProps;
          comparableListings = compsSource
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
              sqft: p.sqft || 0,
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

    // Use REAL data from Mashvisor - STR ONLY (no LTR)
    const avgOccupancy = airbnbRental.occupancy || neighborhoodData?.avg_occupancy || 0;
    const avgAdr = airbnbRental.night_price || 0;
    const avgMonthlyRevenue = airbnbRental.rental_income || 0;

    const result = {
      success: true,
      dataSource: dataSource,
      bedroomsUsed: bedrooms,
      bathroomsUsed: bathrooms,
      
      property: property ? {
        address: property.address || street,
        city: property.city || city,
        state: property.state || state,
        zipCode: property.zip_code || property.zip || zip,
        bedrooms: property.beds,
        bathrooms: property.baths,
        sqft: property.sqft || 0,
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
        sqft: 0,
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
        
        // Market trends
        revenueChange: airbnbRental.rental_income_change || "stable",
        revenueChangePercent: airbnbRental.rental_income_change_percentage || 0,
        occupancyChange: airbnbRental.occupancy_change || "stable",
        occupancyChangePercent: airbnbRental.occupancy_change_percentage || 0,
        
        // Property counts
        listingsCount: neighborhoodData?.num_of_airbnb_properties || listingsData?.num_of_properties || 0,
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
      },
      
      // REAL percentile data calculated from actual listings filtered by bedroom
      percentiles: {
        revenue: percentileData.revenue,
        adr: percentileData.adr,
        occupancy: percentileData.occupancy,
        listingsAnalyzed: filteredListingsCount,
        totalListingsInArea: totalListingsInArea,
      },
      
      // Comparable listings (filtered by bedroom count)
      comparables: comparableListings,
      
      // Historical data for seasonality chart
      historical: historicalData,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mashvisor API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch property data",
        message: "An error occurred while fetching data. Please try again."
      },
      { status: 500 }
    );
  }
}
