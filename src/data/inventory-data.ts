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
  AL: { inventoryLevel: 'high', inventoryGrowthYoY: 2, inventoryVs2019: 6, priceCutPercent: 22.5, daysOnMarket: 84 },
  AK: { inventoryLevel: 'moderate', inventoryGrowthYoY: -19, inventoryVs2019: 4, priceCutPercent: 19.2, daysOnMarket: 56 },
  AZ: { inventoryLevel: 'high', inventoryGrowthYoY: 3, inventoryVs2019: 21, priceCutPercent: 28.5, daysOnMarket: 78 },
  AR: { inventoryLevel: 'moderate', inventoryGrowthYoY: 6, inventoryVs2019: 8, priceCutPercent: 19.3, daysOnMarket: 74 },
  CA: { inventoryLevel: 'high', inventoryGrowthYoY: -7, inventoryVs2019: -3, priceCutPercent: 21.1, daysOnMarket: 60 },
  CO: { inventoryLevel: 'very-high', inventoryGrowthYoY: 1, inventoryVs2019: 12, priceCutPercent: 27.3, daysOnMarket: 80 },
  CT: { inventoryLevel: 'moderate', inventoryGrowthYoY: -13, inventoryVs2019: -24, priceCutPercent: 15.5, daysOnMarket: 50 },
  DE: { inventoryLevel: 'moderate', inventoryGrowthYoY: 1, inventoryVs2019: 4, priceCutPercent: 21.8, daysOnMarket: 52 },
  FL: { inventoryLevel: 'very-high', inventoryGrowthYoY: -11, inventoryVs2019: 39, priceCutPercent: 29.2, daysOnMarket: 82 },
  GA: { inventoryLevel: 'very-high', inventoryGrowthYoY: 2, inventoryVs2019: 23, priceCutPercent: 25.4, daysOnMarket: 80 },
  HI: { inventoryLevel: 'moderate', inventoryGrowthYoY: 2, inventoryVs2019: 46, priceCutPercent: 17.8, daysOnMarket: 106 },
  ID: { inventoryLevel: 'high', inventoryGrowthYoY: -17, inventoryVs2019: 4, priceCutPercent: 31.6, daysOnMarket: 79 },
  IL: { inventoryLevel: 'moderate', inventoryGrowthYoY: -6, inventoryVs2019: -4, priceCutPercent: 17.8, daysOnMarket: 63 },
  IN: { inventoryLevel: 'moderate', inventoryGrowthYoY: 3, inventoryVs2019: -24, priceCutPercent: 29.9, daysOnMarket: 54 },
  IA: { inventoryLevel: 'high', inventoryGrowthYoY: -1, inventoryVs2019: -12, priceCutPercent: 23.1, daysOnMarket: 61 },
  KS: { inventoryLevel: 'moderate', inventoryGrowthYoY: 1, inventoryVs2019: -17, priceCutPercent: 24.4, daysOnMarket: 47 },
  KY: { inventoryLevel: 'high', inventoryGrowthYoY: 7, inventoryVs2019: -8, priceCutPercent: 23.6, daysOnMarket: 64 },
  LA: { inventoryLevel: 'very-high', inventoryGrowthYoY: -4, inventoryVs2019: -8, priceCutPercent: 25.4, daysOnMarket: 81 },
  ME: { inventoryLevel: 'moderate', inventoryGrowthYoY: 37, inventoryVs2019: -37, priceCutPercent: 16.0, daysOnMarket: 60 },
  MD: { inventoryLevel: 'high', inventoryGrowthYoY: 18, inventoryVs2019: -6, priceCutPercent: 23.5, daysOnMarket: 60 },
  MA: { inventoryLevel: 'moderate', inventoryGrowthYoY: 4, inventoryVs2019: -36, priceCutPercent: 19.2, daysOnMarket: 40 },
  MI: { inventoryLevel: 'moderate', inventoryGrowthYoY: 1, inventoryVs2019: -34, priceCutPercent: 23.7, daysOnMarket: 52 },
  MN: { inventoryLevel: 'moderate', inventoryGrowthYoY: 0, inventoryVs2019: -36, priceCutPercent: 23.1, daysOnMarket: 58 },
  MS: { inventoryLevel: 'high', inventoryGrowthYoY: 0, inventoryVs2019: -11, priceCutPercent: 22.3, daysOnMarket: 64 },
  MO: { inventoryLevel: 'moderate', inventoryGrowthYoY: 7, inventoryVs2019: -9, priceCutPercent: 22.9, daysOnMarket: 53 },
  MT: { inventoryLevel: 'moderate', inventoryGrowthYoY: 4, inventoryVs2019: -7, priceCutPercent: 15.1, daysOnMarket: 110 },
  NE: { inventoryLevel: 'moderate', inventoryGrowthYoY: -9, inventoryVs2019: 17, priceCutPercent: 24.5, daysOnMarket: 44 },
  NV: { inventoryLevel: 'high', inventoryGrowthYoY: 6, inventoryVs2019: 16, priceCutPercent: 23.3, daysOnMarket: 77 },
  NH: { inventoryLevel: 'moderate', inventoryGrowthYoY: 6, inventoryVs2019: 40, priceCutPercent: 15.7, daysOnMarket: 64 },
  NJ: { inventoryLevel: 'low', inventoryGrowthYoY: 5, inventoryVs2019: -1, priceCutPercent: 14.8, daysOnMarket: 58 },
  NM: { inventoryLevel: 'moderate', inventoryGrowthYoY: 1, inventoryVs2019: -8, priceCutPercent: 19.5, daysOnMarket: 81 },
  NY: { inventoryLevel: 'moderate', inventoryGrowthYoY: -6, inventoryVs2019: -36, priceCutPercent: 18.0, daysOnMarket: 47 },
  NC: { inventoryLevel: 'high', inventoryGrowthYoY: 13, inventoryVs2019: 6, priceCutPercent: 24.1, daysOnMarket: 85 },
  ND: { inventoryLevel: 'moderate', inventoryGrowthYoY: 5, inventoryVs2019: -41, priceCutPercent: 15.4, daysOnMarket: 67 },
  OH: { inventoryLevel: 'moderate', inventoryGrowthYoY: 4, inventoryVs2019: -24, priceCutPercent: 23.7, daysOnMarket: 58 },
  OK: { inventoryLevel: 'high', inventoryGrowthYoY: 5, inventoryVs2019: 34, priceCutPercent: 23.5, daysOnMarket: 63 },
  OR: { inventoryLevel: 'high', inventoryGrowthYoY: -1, inventoryVs2019: 8, priceCutPercent: 28.5, daysOnMarket: 73 },
  PA: { inventoryLevel: 'moderate', inventoryGrowthYoY: 0, inventoryVs2019: -41, priceCutPercent: 22.6, daysOnMarket: 50 },
  RI: { inventoryLevel: 'moderate', inventoryGrowthYoY: 3, inventoryVs2019: -34, priceCutPercent: 15.3, daysOnMarket: 42 },
  SC: { inventoryLevel: 'high', inventoryGrowthYoY: 8, inventoryVs2019: 6, priceCutPercent: 23.9, daysOnMarket: 93 },
  SD: { inventoryLevel: 'moderate', inventoryGrowthYoY: -10, inventoryVs2019: -26, priceCutPercent: 16.7, daysOnMarket: 74 },
  TN: { inventoryLevel: 'high', inventoryGrowthYoY: 9, inventoryVs2019: 36, priceCutPercent: 20.9, daysOnMarket: 88 },
  TX: { inventoryLevel: 'very-high', inventoryGrowthYoY: -2, inventoryVs2019: 46, priceCutPercent: 28.1, daysOnMarket: 88 },
  UT: { inventoryLevel: 'high', inventoryGrowthYoY: 8, inventoryVs2019: 30, priceCutPercent: 26.2, daysOnMarket: 76 },
  VT: { inventoryLevel: 'low', inventoryGrowthYoY: 13, inventoryVs2019: -37, priceCutPercent: 13.1, daysOnMarket: 91 },
  VA: { inventoryLevel: 'moderate', inventoryGrowthYoY: 5, inventoryVs2019: -27, priceCutPercent: 21.8, daysOnMarket: 55 },
  WA: { inventoryLevel: 'high', inventoryGrowthYoY: 11, inventoryVs2019: 29, priceCutPercent: 25.8, daysOnMarket: 63 },
  WV: { inventoryLevel: 'high', inventoryGrowthYoY: 4, inventoryVs2019: -34, priceCutPercent: 21.8, daysOnMarket: 72 },
  WI: { inventoryLevel: 'low', inventoryGrowthYoY: -5, inventoryVs2019: -58, priceCutPercent: 14.6, daysOnMarket: 69 },
  WY: { inventoryLevel: 'moderate', inventoryGrowthYoY: 4, inventoryVs2019: -6, priceCutPercent: 16.9, daysOnMarket: 83 },
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
