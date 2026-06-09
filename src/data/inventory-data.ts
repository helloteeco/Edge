// State-level housing inventory data
// Source: Redfin Data Center (Jan 2026) + ResiClub analysis

export interface InventoryData {
  inventoryLevel: 'low' | 'moderate' | 'high' | 'very-high';
  inventoryGrowthYoY: number; // Year-over-year % change (Dec 2024 to Dec 2025)
  inventoryVs2019: number; // % change vs pre-pandemic Dec 2019
  priceCutPercent: number; // % of listings with price cuts
  daysOnMarket: number; // Median days on market
}

// Inventory data by state code
export const inventoryData: Record<string, InventoryData> = {
  AL: { inventoryLevel: 'moderate', inventoryGrowthYoY: 1, inventoryVs2019: 6, priceCutPercent: 24.7, daysOnMarket: 57 },
  AK: { inventoryLevel: 'low', inventoryGrowthYoY: -21, inventoryVs2019: 4, priceCutPercent: 26.8, daysOnMarket: 22 },
  AZ: { inventoryLevel: 'high', inventoryGrowthYoY: -10, inventoryVs2019: 21, priceCutPercent: 30.9, daysOnMarket: 62 },
  AR: { inventoryLevel: 'moderate', inventoryGrowthYoY: 0, inventoryVs2019: 8, priceCutPercent: 26.0, daysOnMarket: 53 },
  CA: { inventoryLevel: 'low', inventoryGrowthYoY: -14, inventoryVs2019: -3, priceCutPercent: 26.1, daysOnMarket: 33 },
  CO: { inventoryLevel: 'low', inventoryGrowthYoY: -8, inventoryVs2019: 12, priceCutPercent: 33.9, daysOnMarket: 35 },
  CT: { inventoryLevel: 'low', inventoryGrowthYoY: -10, inventoryVs2019: -24, priceCutPercent: 18.6, daysOnMarket: 31 },
  DE: { inventoryLevel: 'low', inventoryGrowthYoY: 10, inventoryVs2019: 4, priceCutPercent: 28.8, daysOnMarket: 33 },
  FL: { inventoryLevel: 'high', inventoryGrowthYoY: -17, inventoryVs2019: 39, priceCutPercent: 28.5, daysOnMarket: 66 },
  GA: { inventoryLevel: 'moderate', inventoryGrowthYoY: -12, inventoryVs2019: 23, priceCutPercent: 31.7, daysOnMarket: 49 },
  HI: { inventoryLevel: 'moderate', inventoryGrowthYoY: -8, inventoryVs2019: 46, priceCutPercent: 17.3, daysOnMarket: 86 },
  ID: { inventoryLevel: 'low', inventoryGrowthYoY: -26, inventoryVs2019: 4, priceCutPercent: 32.3, daysOnMarket: 35 },
  IL: { inventoryLevel: 'moderate', inventoryGrowthYoY: -2, inventoryVs2019: -4, priceCutPercent: 17.7, daysOnMarket: 43 },
  IN: { inventoryLevel: 'low', inventoryGrowthYoY: -7, inventoryVs2019: -24, priceCutPercent: 36.5, daysOnMarket: 26 },
  IA: { inventoryLevel: 'low', inventoryGrowthYoY: -8, inventoryVs2019: -12, priceCutPercent: 30.2, daysOnMarket: 37 },
  KS: { inventoryLevel: 'low', inventoryGrowthYoY: -9, inventoryVs2019: -17, priceCutPercent: 31.1, daysOnMarket: 19 },
  KY: { inventoryLevel: 'moderate', inventoryGrowthYoY: 7, inventoryVs2019: -8, priceCutPercent: 30.3, daysOnMarket: 45 },
  LA: { inventoryLevel: 'moderate', inventoryGrowthYoY: -14, inventoryVs2019: -8, priceCutPercent: 28.1, daysOnMarket: 55 },
  ME: { inventoryLevel: 'moderate', inventoryGrowthYoY: -7, inventoryVs2019: -37, priceCutPercent: 23.5, daysOnMarket: 45 },
  MD: { inventoryLevel: 'low', inventoryGrowthYoY: 8, inventoryVs2019: -6, priceCutPercent: 29.0, daysOnMarket: 34 },
  MA: { inventoryLevel: 'low', inventoryGrowthYoY: 5, inventoryVs2019: -36, priceCutPercent: 26.9, daysOnMarket: 21 },
  MI: { inventoryLevel: 'low', inventoryGrowthYoY: 2, inventoryVs2019: -34, priceCutPercent: 27.9, daysOnMarket: 24 },
  MN: { inventoryLevel: 'low', inventoryGrowthYoY: 0, inventoryVs2019: -36, priceCutPercent: 32.5, daysOnMarket: 25 },
  MS: { inventoryLevel: 'moderate', inventoryGrowthYoY: 2, inventoryVs2019: -11, priceCutPercent: 27.0, daysOnMarket: 47 },
  MO: { inventoryLevel: 'low', inventoryGrowthYoY: 0, inventoryVs2019: -9, priceCutPercent: 29.4, daysOnMarket: 27 },
  MT: { inventoryLevel: 'moderate', inventoryGrowthYoY: -2, inventoryVs2019: -7, priceCutPercent: 19.2, daysOnMarket: 69 },
  NE: { inventoryLevel: 'low', inventoryGrowthYoY: -27, inventoryVs2019: 17, priceCutPercent: 31.5, daysOnMarket: 27 },
  NV: { inventoryLevel: 'moderate', inventoryGrowthYoY: -10, inventoryVs2019: 16, priceCutPercent: 26.8, daysOnMarket: 52 },
  NH: { inventoryLevel: 'low', inventoryGrowthYoY: 11, inventoryVs2019: 40, priceCutPercent: 20.4, daysOnMarket: 38 },
  NJ: { inventoryLevel: 'low', inventoryGrowthYoY: 2, inventoryVs2019: -1, priceCutPercent: 19.1, daysOnMarket: 35 },
  NM: { inventoryLevel: 'moderate', inventoryGrowthYoY: -2, inventoryVs2019: -8, priceCutPercent: 22.6, daysOnMarket: 53 },
  NY: { inventoryLevel: 'moderate', inventoryGrowthYoY: -5, inventoryVs2019: -36, priceCutPercent: 21.9, daysOnMarket: 42 },
  NC: { inventoryLevel: 'moderate', inventoryGrowthYoY: 7, inventoryVs2019: 6, priceCutPercent: 29.6, daysOnMarket: 52 },
  ND: { inventoryLevel: 'moderate', inventoryGrowthYoY: -2, inventoryVs2019: -41, priceCutPercent: 23.3, daysOnMarket: 44 },
  OH: { inventoryLevel: 'low', inventoryGrowthYoY: 3, inventoryVs2019: -24, priceCutPercent: 25.9, daysOnMarket: 36 },
  OK: { inventoryLevel: 'low', inventoryGrowthYoY: -6, inventoryVs2019: 34, priceCutPercent: 29.1, daysOnMarket: 39 },
  OR: { inventoryLevel: 'low', inventoryGrowthYoY: -8, inventoryVs2019: 8, priceCutPercent: 32.8, daysOnMarket: 28 },
  PA: { inventoryLevel: 'low', inventoryGrowthYoY: 0, inventoryVs2019: -41, priceCutPercent: 28.1, daysOnMarket: 30 },
  RI: { inventoryLevel: 'low', inventoryGrowthYoY: -10, inventoryVs2019: -34, priceCutPercent: 20.0, daysOnMarket: 26 },
  SC: { inventoryLevel: 'high', inventoryGrowthYoY: 2, inventoryVs2019: 6, priceCutPercent: 28.8, daysOnMarket: 72 },
  SD: { inventoryLevel: 'moderate', inventoryGrowthYoY: -6, inventoryVs2019: -26, priceCutPercent: 20.3, daysOnMarket: 49 },
  TN: { inventoryLevel: 'high', inventoryGrowthYoY: 4, inventoryVs2019: 36, priceCutPercent: 27.2, daysOnMarket: 61 },
  TX: { inventoryLevel: 'moderate', inventoryGrowthYoY: -10, inventoryVs2019: 46, priceCutPercent: 33.9, daysOnMarket: 56 },
  UT: { inventoryLevel: 'moderate', inventoryGrowthYoY: -1, inventoryVs2019: 30, priceCutPercent: 30.4, daysOnMarket: 41 },
  VT: { inventoryLevel: 'moderate', inventoryGrowthYoY: 17, inventoryVs2019: -37, priceCutPercent: 19.2, daysOnMarket: 64 },
  VA: { inventoryLevel: 'low', inventoryGrowthYoY: -1, inventoryVs2019: -27, priceCutPercent: 27.4, daysOnMarket: 28 },
  WA: { inventoryLevel: 'low', inventoryGrowthYoY: 4, inventoryVs2019: 29, priceCutPercent: 33.8, daysOnMarket: 19 },
  WV: { inventoryLevel: 'moderate', inventoryGrowthYoY: -6, inventoryVs2019: -34, priceCutPercent: 24.6, daysOnMarket: 50 },
  WI: { inventoryLevel: 'moderate', inventoryGrowthYoY: 0, inventoryVs2019: -58, priceCutPercent: 17.3, daysOnMarket: 44 },
  WY: { inventoryLevel: 'moderate', inventoryGrowthYoY: -10, inventoryVs2019: -6, priceCutPercent: 20.8, daysOnMarket: 51 },
};

// Get inventory level label
export function getInventoryLevelLabel(level: InventoryData['inventoryLevel']): string {
  switch (level) {
    case 'low': return 'Low';
    case 'moderate': return 'Moderate';
    case 'high': return 'High';
    case 'very-high': return 'Very High';
  }
}

// Get inventory data for a state
export function getInventoryByState(stateCode: string): InventoryData | undefined {
  return inventoryData[stateCode.toUpperCase()];
}
