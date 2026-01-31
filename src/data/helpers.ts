import { cityData as cityDataByState, CityData } from "./city-data";
import { stateData as stateDataByCode, StateData } from "./state-data";
import { calculateScore, calculateStateScore, calculateCashOnCash, ScoringBreakdown } from "@/lib/scoring";

// Flatten city data into array with state code
export interface FlatCity {
  id: string;
  name: string;
  county: string;
  stateCode: string;
  population: number;
  cashOnCash: number; // Cash-on-Cash return percentage
  dsi: boolean;
  marketScore: number;
  avgADR: number;
  occupancy: number;
  strMonthlyRevenue: number;
  medianHomeValue: number;
  regulation: string;
  saturation: number;
  listingsPerThousand: number;
  scores: {
    demand: number;
    affordability: number;
    regulation: number;
    seasonality: number;
    saturation: number;
  };
  incomeBySize: Record<string, number>;
  amenityDelta: Array<{ name: string; boost: number; priority: string }>;
  marketType: string;
  // New transparent scoring
  scoring: ScoringBreakdown;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  verdict: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
}

export interface FlatState {
  abbreviation: string;
  name: string;
  marketScore: number;
  regulation: string;
  avgADR: number;
  medianHomeValue: number;
  appreciation: number;
  netMigration: number;
  cityCount: number;
  scores: {
    demand: number;
    affordability: number;
    regulation: number;
    seasonality: number;
  };
  // New transparent scoring
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  verdict: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  cityGrades: { grade: string; count: number }[];
}

// Get state appreciation for a given state code
function getStateAppreciation(stateCode: string): number {
  const state = stateDataByCode[stateCode];
  return state?.appreciation?.oneYear || 3; // Default to 3% if not found
}

// Calculate city score using new transparent model with Cash-on-Cash
function calculateCityScore(city: CityData, stateCode: string): ScoringBreakdown {
  return calculateScore({
    monthlyRevenue: city.rental.monthlyRevenue,
    medianHomePrice: city.rental.medianHomePrice,
    strStatus: city.strStatus,
    permitRequired: city.permitRequired,
    stateCode: stateCode,
    listingsPerThousand: city.saturationRisk.listingsPerThousand,
    oneYearAppreciation: getStateAppreciation(stateCode),
  });
}

// Convert city data to flat array with new scoring
export function getAllCities(): FlatCity[] {
  const cities: FlatCity[] = [];
  
  for (const [stateCode, stateCities] of Object.entries(cityDataByState)) {
    for (const city of stateCities) {
      const scoring = calculateCityScore(city, stateCode);
      
      // Calculate Cash-on-Cash return
      const cashOnCash = calculateCashOnCash(city.rental.monthlyRevenue, city.rental.medianHomePrice);
      
      cities.push({
        id: city.id,
        name: city.name,
        county: city.county,
        stateCode,
        population: city.population,
        cashOnCash, // Use Cash-on-Cash instead of RPR
        dsi: city.dsi,
        marketScore: scoring.totalScore, // Use new score
        avgADR: city.rental.avgADR,
        occupancy: city.rental.occupancyRate,
        strMonthlyRevenue: city.rental.monthlyRevenue,
        medianHomeValue: city.rental.medianHomePrice,
        regulation: city.strStatus === "legal" ? "Legal" : "Restricted",
        saturation: 100 - city.marketScore.saturation,
        listingsPerThousand: city.saturationRisk.listingsPerThousand,
        scores: {
          demand: city.marketScore.demand,
          affordability: city.marketScore.affordability,
          regulation: city.marketScore.regulation,
          seasonality: city.marketScore.seasonality,
          saturation: city.marketScore.saturation,
        },
        incomeBySize: {
          "1BR": city.incomeBySize.oneBR,
          "2BR": city.incomeBySize.twoBR,
          "3BR": city.incomeBySize.threeBR,
          "4BR": city.incomeBySize.fourBR,
          "5BR": city.incomeBySize.fiveBR,
          "6BR+": city.incomeBySize.sixPlusBR,
        },
        amenityDelta: city.amenityDelta.topAmenities.map(a => ({
          name: a.name,
          boost: a.revenueBoost,
          priority: a.priority === "must-have" ? "MUST HAVE" : a.priority === "high-impact" ? "HIGH IMPACT" : "NICE TO HAVE",
        })),
        marketType: city.amenityDelta.marketType,
        // New transparent scoring
        scoring,
        grade: scoring.grade,
        verdict: scoring.verdict,
      });
    }
  }
  
  return cities;
}

// Get grade from score
function getGradeFromScore(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 65) return 'B+';
  if (score >= 55) return 'B';
  if (score >= 45) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

// Get verdict from grade
function getVerdictFromGrade(grade: string): 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid' {
  switch (grade) {
    case 'A+': return 'strong-buy';
    case 'A': return 'buy';
    case 'B+': return 'buy';
    case 'B': return 'hold';
    case 'C': return 'hold';
    case 'D': return 'caution';
    default: return 'avoid';
  }
}

// Convert state data to flat array with new scoring
export function getAllStates(): FlatState[] {
  const states: FlatState[] = [];
  const allCities = getAllCities();
  
  for (const [code, state] of Object.entries(stateDataByCode)) {
    const citiesInState = allCities.filter(c => c.stateCode === code);
    const cityScores = citiesInState.map(c => c.marketScore);
    
    // Calculate state score as average of top 50% cities
    const stateScore = calculateStateScore(cityScores);
    const grade = getGradeFromScore(stateScore);
    const verdict = getVerdictFromGrade(grade);
    
    // Count grades in this state
    const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    citiesInState.forEach(c => {
      gradeCounts[c.grade] = (gradeCounts[c.grade] || 0) + 1;
    });
    
    const cityGrades = Object.entries(gradeCounts)
      .filter(([, count]) => count > 0)
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => {
        const order = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });
    
    states.push({
      abbreviation: code,
      name: state.name,
      marketScore: stateScore,
      regulation: state.strRegulation.status === "legal" ? "Legal" : "Restricted",
      avgADR: state.rental.avgADR,
      medianHomeValue: state.appreciation.medianValue,
      appreciation: state.appreciation.oneYear,
      netMigration: state.migration.netMigration,
      cityCount: citiesInState.length,
      scores: {
        demand: state.marketScore.demand,
        affordability: state.marketScore.affordability,
        regulation: state.marketScore.regulation,
        seasonality: state.marketScore.seasonality,
      },
      grade,
      verdict,
      cityGrades,
    });
  }
  
  return states;
}

// Get city by ID
export function getCityById(id: string): FlatCity | undefined {
  return getAllCities().find(c => c.id === id);
}

// Get state by abbreviation
export function getStateByCode(code: string): FlatState | undefined {
  return getAllStates().find(s => s.abbreviation.toLowerCase() === code.toLowerCase());
}

// Get cities by state code
export function getCitiesByState(stateCode: string): FlatCity[] {
  return getAllCities().filter(c => c.stateCode.toLowerCase() === stateCode.toLowerCase());
}

// Search cities by name, county, or state
export function searchCities(query: string): FlatCity[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  return getAllCities().filter(c => 
    c.name.toLowerCase().includes(q) ||
    c.county.toLowerCase().includes(q) ||
    c.stateCode.toLowerCase() === q
  );
}

// Parse address to extract city, county, state
export function parseAddress(address: string): { city?: string; county?: string; state?: string } | null {
  if (!address) return null;
  
  // Common patterns:
  // "123 Main St, City, ST 12345"
  // "123 Main St, City, State 12345"
  // "City, ST"
  // "City, State"
  
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length < 2) return null;
  
  // State abbreviations
  const stateAbbreviations: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  };
  
  // Reverse lookup
  const stateNames: Record<string, string> = {};
  for (const [abbr, name] of Object.entries(stateAbbreviations)) {
    stateNames[name.toLowerCase()] = abbr;
  }
  
  // Try to find state in last part
  const lastPart = parts[parts.length - 1];
  const stateMatch = lastPart.match(/([A-Z]{2})\s*\d{0,5}$/i) || lastPart.match(/^([A-Z]{2})$/i);
  
  let stateCode: string | undefined;
  let city: string | undefined;
  
  if (stateMatch) {
    const abbr = stateMatch[1].toUpperCase();
    if (stateAbbreviations[abbr]) {
      stateCode = abbr;
    }
  } else {
    // Try full state name
    const cleanLast = lastPart.replace(/\d+/g, '').trim().toLowerCase();
    if (stateNames[cleanLast]) {
      stateCode = stateNames[cleanLast];
    }
  }
  
  // City is usually second to last part (or first if only 2 parts)
  if (parts.length >= 2) {
    city = parts[parts.length - 2].replace(/\d+/g, '').trim();
  }
  
  return { city, state: stateCode };
}

// Find best matching city for an address
export function findCityForAddress(address: string): FlatCity | null {
  const parsed = parseAddress(address);
  if (!parsed || !parsed.city) return null;
  
  const allCities = getAllCities();
  const cityName = parsed.city.toLowerCase();
  
  // First try exact match with state
  if (parsed.state) {
    const exactMatch = allCities.find(
      c => c.name.toLowerCase() === cityName && c.stateCode === parsed.state
    );
    if (exactMatch) return exactMatch;
    
    // Try partial match in same state
    const partialMatch = allCities.find(
      c => c.name.toLowerCase().includes(cityName) && c.stateCode === parsed.state
    );
    if (partialMatch) return partialMatch;
    
    // Try county match
    const countyMatch = allCities.find(
      c => c.county.toLowerCase().includes(cityName) && c.stateCode === parsed.state
    );
    if (countyMatch) return countyMatch;
  }
  
  // Try any city match
  const anyMatch = allCities.find(c => c.name.toLowerCase() === cityName);
  if (anyMatch) return anyMatch;
  
  return null;
}

// Export pre-computed arrays for direct import
export const cityData = getAllCities();
export const stateData = getAllStates();
