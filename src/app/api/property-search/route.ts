import { NextRequest, NextResponse } from 'next/server';

const MASHVISOR_API_KEY = process.env.MASHVISOR_API_KEY || '20f866598emsh7e1f8d0058d2271p1adc56jsn8653832f1320';

// Parse city and state from search query
function parseLocation(query: string): { city: string; state: string } | null {
  // Common patterns: "Orlando FL", "Orlando, FL", "Orlando Florida"
  const stateAbbreviations: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
  };
  
  const allStates = Object.values(stateAbbreviations);
  
  // Clean and normalize query
  const cleaned = query.toLowerCase().replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  
  // Try to find state at the end
  const lastPart = parts[parts.length - 1]?.toUpperCase();
  const secondLastPart = parts.slice(-2).join(' ').toLowerCase();
  
  let state = '';
  let cityParts = parts;
  
  // Check if last part is a state abbreviation
  if (lastPart && allStates.includes(lastPart)) {
    state = lastPart;
    cityParts = parts.slice(0, -1);
  }
  // Check if last two parts form a state name
  else if (stateAbbreviations[secondLastPart]) {
    state = stateAbbreviations[secondLastPart];
    cityParts = parts.slice(0, -2);
  }
  // Check if last part is a full state name
  else if (stateAbbreviations[parts[parts.length - 1]]) {
    state = stateAbbreviations[parts[parts.length - 1]];
    cityParts = parts.slice(0, -1);
  }
  
  // Extract city - look for common city names or use remaining parts
  const city = cityParts
    .filter(p => !p.match(/^\d+$/)) // Remove numbers (street numbers)
    .filter(p => !['st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive', 'ln', 'lane', 'blvd', 'boulevard', 'ct', 'court', 'way', 'pl', 'place'].includes(p))
    .join(' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  
  if (city && state) {
    return { city, state };
  }
  
  // Default to some popular cities if we can extract a city name
  if (city) {
    // Try to match against popular STR cities
    const popularCities: Record<string, string> = {
      'orlando': 'FL', 'miami': 'FL', 'tampa': 'FL', 'jacksonville': 'FL',
      'nashville': 'TN', 'memphis': 'TN', 'gatlinburg': 'TN', 'pigeon forge': 'TN',
      'austin': 'TX', 'houston': 'TX', 'dallas': 'TX', 'san antonio': 'TX',
      'phoenix': 'AZ', 'scottsdale': 'AZ', 'tucson': 'AZ', 'sedona': 'AZ',
      'denver': 'CO', 'colorado springs': 'CO', 'boulder': 'CO',
      'las vegas': 'NV', 'reno': 'NV',
      'los angeles': 'CA', 'san diego': 'CA', 'san francisco': 'CA', 'palm springs': 'CA',
      'seattle': 'WA', 'portland': 'OR',
      'atlanta': 'GA', 'savannah': 'GA',
      'new orleans': 'LA', 'charleston': 'SC', 'myrtle beach': 'SC',
      'chicago': 'IL', 'indianapolis': 'IN', 'columbus': 'OH', 'cleveland': 'OH',
      'detroit': 'MI', 'minneapolis': 'MN', 'kansas city': 'MO', 'st louis': 'MO',
    };
    
    const cityLower = city.toLowerCase();
    if (popularCities[cityLower]) {
      return { city, state: popularCities[cityLower] };
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  
  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }
  
  try {
    const location = parseLocation(query);
    
    if (!location) {
      return NextResponse.json({ suggestions: [], message: 'Could not parse location. Try "City, State" format.' });
    }
    
    // Fetch active listings from Mashvisor for this city
    const response = await fetch(
      `https://mashvisor-api.p.rapidapi.com/airbnb-property/active-listings?state=${location.state}&city=${encodeURIComponent(location.city)}&page=1`,
      {
        headers: {
          'x-rapidapi-host': 'mashvisor-api.p.rapidapi.com',
          'x-rapidapi-key': MASHVISOR_API_KEY,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Mashvisor API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.content?.properties) {
      const suggestions = data.content.properties.slice(0, 5).map((prop: any) => ({
        address: {
          street: prop.name || `${prop.property_type} in ${prop.airbnb_neighborhood || location.city}`,
          city: prop.airbnb_city || location.city,
          state: prop.state || location.state,
          zipCode: prop.zip || '',
        },
        propertyId: prop.property_id,
        propertyType: prop.property_type,
        bedrooms: prop.num_of_rooms,
        bathrooms: prop.num_of_baths,
        nightPrice: prop.night_price,
        occupancy: prop.occupancy,
        monthlyRevenue: prop.rental_income,
        image: prop.image,
        neighborhood: prop.airbnb_neighborhood,
        lat: prop.lat,
        lon: prop.lon,
      }));
      
      return NextResponse.json({ 
        suggestions,
        totalProperties: data.content.num_of_properties,
        city: location.city,
        state: location.state,
      });
    }
    
    return NextResponse.json({ suggestions: [], message: 'No properties found in this area.' });
  } catch (error) {
    console.error('Property search error:', error);
    return NextResponse.json({ suggestions: [], error: 'Search failed' });
  }
}
