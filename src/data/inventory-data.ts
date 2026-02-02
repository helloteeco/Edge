// State-level housing inventory data
// Source: ResiClub analysis of Realtor.com data (Dec 2025)

export interface InventoryData {
  inventoryLevel: 'low' | 'moderate' | 'high' | 'very-high';
  inventoryGrowthYoY: number; // Year-over-year % change (Dec 2024 to Dec 2025)
  inventoryVs2019: number; // % change vs pre-pandemic Dec 2019
  priceCutPercent: number; // % of listings with price cuts
  daysOnMarket: number; // Median days on market
}

// Inventory data by state code
export const inventoryData: Record<string, InventoryData> = {
  AL: { inventoryLevel: 'moderate', inventoryGrowthYoY: 7, inventoryVs2019: 6, priceCutPercent: 18.5, daysOnMarket: 52 },
  AK: { inventoryLevel: 'moderate', inventoryGrowthYoY: 23, inventoryVs2019: 4, priceCutPercent: 14.2, daysOnMarket: 68 },
  AZ: { inventoryLevel: 'high', inventoryGrowthYoY: 13, inventoryVs2019: 21, priceCutPercent: 28.4, daysOnMarket: 71 },
  AR: { inventoryLevel: 'moderate', inventoryGrowthYoY: 3, inventoryVs2019: 8, priceCutPercent: 15.8, daysOnMarket: 48 },
  CA: { inventoryLevel: 'low', inventoryGrowthYoY: -2, inventoryVs2019: -3, priceCutPercent: 19.6, daysOnMarket: 42 },
  CO: { inventoryLevel: 'high', inventoryGrowthYoY: 19, inventoryVs2019: 12, priceCutPercent: 26.8, daysOnMarket: 58 },
  CT: { inventoryLevel: 'low', inventoryGrowthYoY: 11, inventoryVs2019: -24, priceCutPercent: 12.4, daysOnMarket: 38 },
  DE: { inventoryLevel: 'moderate', inventoryGrowthYoY: 27, inventoryVs2019: 4, priceCutPercent: 16.2, daysOnMarket: 45 },
  FL: { inventoryLevel: 'very-high', inventoryGrowthYoY: 5, inventoryVs2019: 39, priceCutPercent: 32.1, daysOnMarket: 78 },
  GA: { inventoryLevel: 'high', inventoryGrowthYoY: 18, inventoryVs2019: 23, priceCutPercent: 24.6, daysOnMarket: 56 },
  HI: { inventoryLevel: 'high', inventoryGrowthYoY: 18, inventoryVs2019: 46, priceCutPercent: 22.8, daysOnMarket: 85 },
  ID: { inventoryLevel: 'moderate', inventoryGrowthYoY: 22, inventoryVs2019: 4, priceCutPercent: 25.2, daysOnMarket: 62 },
  IL: { inventoryLevel: 'low', inventoryGrowthYoY: 10, inventoryVs2019: -4, priceCutPercent: 14.8, daysOnMarket: 35 },
  IN: { inventoryLevel: 'low', inventoryGrowthYoY: 3, inventoryVs2019: -24, priceCutPercent: 13.2, daysOnMarket: 32 },
  IA: { inventoryLevel: 'low', inventoryGrowthYoY: 11, inventoryVs2019: -12, priceCutPercent: 11.8, daysOnMarket: 34 },
  KS: { inventoryLevel: 'low', inventoryGrowthYoY: 18, inventoryVs2019: -17, priceCutPercent: 12.6, daysOnMarket: 28 },
  KY: { inventoryLevel: 'low', inventoryGrowthYoY: 16, inventoryVs2019: -8, priceCutPercent: 14.4, daysOnMarket: 36 },
  LA: { inventoryLevel: 'low', inventoryGrowthYoY: 3, inventoryVs2019: -8, priceCutPercent: 16.8, daysOnMarket: 55 },
  ME: { inventoryLevel: 'low', inventoryGrowthYoY: 21, inventoryVs2019: -37, priceCutPercent: 10.2, daysOnMarket: 42 },
  MD: { inventoryLevel: 'low', inventoryGrowthYoY: 21, inventoryVs2019: -6, priceCutPercent: 15.4, daysOnMarket: 28 },
  MA: { inventoryLevel: 'low', inventoryGrowthYoY: 5, inventoryVs2019: -36, priceCutPercent: 9.8, daysOnMarket: 22 },
  MI: { inventoryLevel: 'low', inventoryGrowthYoY: 12, inventoryVs2019: -34, priceCutPercent: 12.2, daysOnMarket: 30 },
  MN: { inventoryLevel: 'low', inventoryGrowthYoY: 18, inventoryVs2019: -36, priceCutPercent: 11.4, daysOnMarket: 26 },
  MS: { inventoryLevel: 'low', inventoryGrowthYoY: 8, inventoryVs2019: -11, priceCutPercent: 17.2, daysOnMarket: 58 },
  MO: { inventoryLevel: 'low', inventoryGrowthYoY: 15, inventoryVs2019: -9, priceCutPercent: 13.6, daysOnMarket: 32 },
  MT: { inventoryLevel: 'low', inventoryGrowthYoY: 9, inventoryVs2019: -7, priceCutPercent: 21.4, daysOnMarket: 72 },
  NE: { inventoryLevel: 'moderate', inventoryGrowthYoY: 10, inventoryVs2019: 17, priceCutPercent: 12.8, daysOnMarket: 28 },
  NV: { inventoryLevel: 'moderate', inventoryGrowthYoY: 16, inventoryVs2019: 16, priceCutPercent: 24.6, daysOnMarket: 54 },
  NH: { inventoryLevel: 'moderate', inventoryGrowthYoY: 3, inventoryVs2019: 40, priceCutPercent: 10.6, daysOnMarket: 32 },
  NJ: { inventoryLevel: 'low', inventoryGrowthYoY: 31, inventoryVs2019: -1, priceCutPercent: 11.2, daysOnMarket: 34 },
  NM: { inventoryLevel: 'low', inventoryGrowthYoY: 11, inventoryVs2019: -8, priceCutPercent: 18.8, daysOnMarket: 62 },
  NY: { inventoryLevel: 'low', inventoryGrowthYoY: 15, inventoryVs2019: -36, priceCutPercent: 13.4, daysOnMarket: 48 },
  NC: { inventoryLevel: 'moderate', inventoryGrowthYoY: 16, inventoryVs2019: 6, priceCutPercent: 20.2, daysOnMarket: 46 },
  ND: { inventoryLevel: 'low', inventoryGrowthYoY: 8, inventoryVs2019: -41, priceCutPercent: 14.6, daysOnMarket: 52 },
  OH: { inventoryLevel: 'low', inventoryGrowthYoY: 13, inventoryVs2019: -24, priceCutPercent: 12.8, daysOnMarket: 28 },
  OK: { inventoryLevel: 'high', inventoryGrowthYoY: 20, inventoryVs2019: 34, priceCutPercent: 19.4, daysOnMarket: 48 },
  OR: { inventoryLevel: 'moderate', inventoryGrowthYoY: 11, inventoryVs2019: 8, priceCutPercent: 22.6, daysOnMarket: 52 },
  PA: { inventoryLevel: 'low', inventoryGrowthYoY: 16, inventoryVs2019: -41, priceCutPercent: 11.8, daysOnMarket: 36 },
  RI: { inventoryLevel: 'low', inventoryGrowthYoY: 11, inventoryVs2019: -34, priceCutPercent: 10.4, daysOnMarket: 28 },
  SC: { inventoryLevel: 'moderate', inventoryGrowthYoY: 18, inventoryVs2019: 6, priceCutPercent: 21.8, daysOnMarket: 52 },
  SD: { inventoryLevel: 'low', inventoryGrowthYoY: -2, inventoryVs2019: -26, priceCutPercent: 13.2, daysOnMarket: 42 },
  TN: { inventoryLevel: 'high', inventoryGrowthYoY: 18, inventoryVs2019: 36, priceCutPercent: 23.4, daysOnMarket: 54 },
  TX: { inventoryLevel: 'very-high', inventoryGrowthYoY: 11, inventoryVs2019: 46, priceCutPercent: 29.8, daysOnMarket: 68 },
  UT: { inventoryLevel: 'high', inventoryGrowthYoY: 18, inventoryVs2019: 30, priceCutPercent: 27.2, daysOnMarket: 58 },
  VT: { inventoryLevel: 'low', inventoryGrowthYoY: 10, inventoryVs2019: -37, priceCutPercent: 9.2, daysOnMarket: 48 },
  VA: { inventoryLevel: 'low', inventoryGrowthYoY: 21, inventoryVs2019: -27, priceCutPercent: 14.8, daysOnMarket: 32 },
  WA: { inventoryLevel: 'high', inventoryGrowthYoY: 23, inventoryVs2019: 29, priceCutPercent: 24.2, daysOnMarket: 48 },
  WV: { inventoryLevel: 'low', inventoryGrowthYoY: 13, inventoryVs2019: -34, priceCutPercent: 15.6, daysOnMarket: 62 },
  WI: { inventoryLevel: 'low', inventoryGrowthYoY: 15, inventoryVs2019: -58, priceCutPercent: 10.8, daysOnMarket: 26 },
  WY: { inventoryLevel: 'low', inventoryGrowthYoY: 16, inventoryVs2019: -6, priceCutPercent: 18.2, daysOnMarket: 68 },
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
