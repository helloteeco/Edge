import { cityData as cityDataByState } from "./city-data";
import { stateData as stateDataByCode } from "./state-data";

// Flatten city data into array with state code
export interface FlatCity {
  id: string;
  name: string;
  county: string;
  stateCode: string;
  population: number;
  rpr: number;
  dsi: boolean;
  marketScore: number;
  avgADR: number;
  occupancy: number;
  strMonthlyRevenue: number;
  medianHomeValue: number;
  regulation: string;
  saturation: number;
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
}

// Convert city data to flat array
export function getAllCities(): FlatCity[] {
  const cities: FlatCity[] = [];
  
  for (const [stateCode, stateCities] of Object.entries(cityDataByState)) {
    for (const city of stateCities) {
      cities.push({
        id: city.id,
        name: city.name,
        county: city.county,
        stateCode,
        population: city.population,
        rpr: city.rpr,
        dsi: city.dsi,
        marketScore: city.marketScore.overall,
        avgADR: city.rental.avgADR,
        occupancy: city.rental.occupancyRate,
        strMonthlyRevenue: city.rental.monthlyRevenue,
        medianHomeValue: city.rental.medianHomePrice,
        regulation: city.strStatus === "legal" ? "Legal" : "Restricted",
        saturation: 100 - city.marketScore.saturation, // Invert so higher = more saturated
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
      });
    }
  }
  
  return cities;
}

// Convert state data to flat array
export function getAllStates(): FlatState[] {
  const states: FlatState[] = [];
  
  for (const [code, state] of Object.entries(stateDataByCode)) {
    const citiesInState = cityDataByState[code] || [];
    
    states.push({
      abbreviation: code,
      name: state.name,
      marketScore: state.marketScore.overall,
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

// Export pre-computed arrays for direct import
export const cityData = getAllCities();
export const stateData = getAllStates();
