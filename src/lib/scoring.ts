/**
 * Edge by Teeco - STR Scoring Model
 * 
 * A simple scoring system that helps you filter good STR markets.
 * Think of it like a report card for rental markets!
 * 
 * SCORING WEIGHTS (Total: 100 points)
 * =====================================
 * 1. Cash-on-Cash Return     - 35 points (How much money you make back)
 * 2. Affordability           - 25 points (Can you afford to buy here?)
 * 3. Year-Round Income       - 15 points (Do people visit all year?)
 * 4. Landlord Friendly       - 10 points (Are the laws on your side?)
 * 5. Room to Grow            - 15 points (Is there space for more rentals?)
 * 
 * DISCLAIMER: This score helps you filter markets — it doesn't replace 
 * checking the actual deal. Always do your own research!
 */

export interface ScoringBreakdown {
  cashOnCash: { score: number; maxScore: 35; value: number; rating: string; tooltip: string };
  affordability: { score: number; maxScore: 25; value: number; rating: string; tooltip: string };
  yearRoundIncome: { score: number; maxScore: 15; value: number; rating: string; tooltip: string };
  landlordFriendly: { score: number; maxScore: 10; rating: string; tooltip: string };
  roomToGrow: { score: number; maxScore: 15; value: number; rating: string; tooltip: string };
  totalScore: number;
  maxPossibleScore: 100;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  verdict: 'passes-all-filters' | 'buy' | 'hold' | 'caution' | 'avoid';
}

/**
 * Calculate Cash-on-Cash Return from monthly revenue and home price
 * 
 * Simple explanation: If you put $50,000 into a rental and make $10,000 
 * profit in a year, your Cash-on-Cash is 20% ($10,000 ÷ $50,000 = 20%)
 */
export function calculateCashOnCash(monthlyRevenue: number, homePrice: number): number {
  if (homePrice <= 0 || monthlyRevenue <= 0) return 0;
  
  const annualGrossRevenue = monthlyRevenue * 12;
  const annualOperatingExpenses = annualGrossRevenue * 0.35;
  const annualNOI = annualGrossRevenue - annualOperatingExpenses;
  
  const loanAmount = homePrice * 0.80;
  const monthlyRate = 0.07 / 12;
  const numPayments = 30 * 12;
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualMortgage = monthlyMortgage * 12;
  
  const annualCashFlow = annualNOI - annualMortgage;
  const totalCashInvested = (homePrice * 0.20) + (homePrice * 0.03);
  const cashOnCash = (annualCashFlow / totalCashInvested) * 100;
  
  return Math.round(cashOnCash * 10) / 10;
}

/**
 * Cash-on-Cash score (35 points max)
 * How much money you make back each year compared to what you put in
 */
export function scoreCashOnCash(cashOnCashReturn: number): { score: number; rating: string } {
  if (cashOnCashReturn >= 20) return { score: 35, rating: 'Elite (20%+)' };
  if (cashOnCashReturn >= 15) return { score: 30, rating: 'Excellent (15%+)' };
  if (cashOnCashReturn >= 10) return { score: 25, rating: 'Good (10%+)' };
  if (cashOnCashReturn >= 5) return { score: 15, rating: 'Okay (5%+)' };
  if (cashOnCashReturn >= 0) return { score: 10, rating: 'Break-even' };
  return { score: 5, rating: 'Losing Money' };
}

/**
 * Affordability score (25 points max)
 * Can you afford to buy a home here?
 */
export function scoreAffordability(medianHomePrice: number): { score: number; rating: string } {
  if (medianHomePrice <= 150000) return { score: 25, rating: 'Very Cheap' };
  if (medianHomePrice <= 200000) return { score: 20, rating: 'Affordable' };
  if (medianHomePrice <= 250000) return { score: 15, rating: 'Average' };
  if (medianHomePrice <= 300000) return { score: 10, rating: 'Pricey' };
  if (medianHomePrice <= 400000) return { score: 5, rating: 'Expensive' };
  return { score: 0, rating: 'Very Expensive' };
}

/**
 * Year-Round Income score (15 points max) - NEW!
 * Can you still make money even in the slow months?
 * 
 * Based on seasonality score from market data:
 * - High seasonality score = consistent year-round demand
 * - Low seasonality score = very seasonal (risky slow months)
 */
export function scoreYearRoundIncome(seasonalityScore: number, occupancyRate: number): { score: number; rating: string; value: number } {
  // Combine seasonality score with occupancy to estimate year-round strength
  // Seasonality score: higher = more consistent (less seasonal variance)
  // Occupancy: higher = more bookings overall
  
  // Calculate a durability index (0-100)
  const durabilityIndex = Math.round((seasonalityScore * 0.6) + (occupancyRate * 0.4));
  
  if (durabilityIndex >= 65) return { score: 15, rating: 'Strong All Year', value: durabilityIndex };
  if (durabilityIndex >= 55) return { score: 10, rating: 'Good Most Months', value: durabilityIndex };
  if (durabilityIndex >= 45) return { score: 5, rating: 'Some Slow Months', value: durabilityIndex };
  return { score: 0, rating: 'Very Seasonal', value: durabilityIndex };
}

/**
 * Landlord Friendly score (10 points max)
 * Are the laws on your side if there's a problem?
 */
const landlordFriendlyStates: Record<string, number> = {
  // Very Landlord Friendly (10 points)
  TX: 10, FL: 10, AZ: 10, GA: 10, TN: 10, NC: 10, SC: 10, AL: 10, MS: 10, AR: 10,
  LA: 10, OK: 10, KY: 10, IN: 10, MO: 10, KS: 10, NE: 10, SD: 10, ND: 10, WY: 10,
  MT: 10, ID: 10, UT: 10, NV: 10, NM: 10, WV: 10,
  // Landlord Friendly (8 points)
  OH: 8, PA: 8, MI: 8, WI: 8, IA: 8, MN: 8, CO: 8, VA: 8, AK: 8, HI: 8,
  // Neutral (5 points)
  IL: 5, WA: 5, OR: 5, ME: 5, NH: 5, VT: 5, RI: 5, CT: 5, DE: 5, MD: 5, NJ: 5,
  // Tenant Friendly (2 points)
  NY: 2, CA: 2, MA: 2,
};

export function scoreLandlordFriendly(stateCode: string): { score: number; rating: string } {
  const score = landlordFriendlyStates[stateCode.toUpperCase()] || 5;
  if (score >= 10) return { score, rating: 'Very Friendly' };
  if (score >= 8) return { score, rating: 'Friendly' };
  if (score >= 5) return { score, rating: 'Neutral' };
  return { score, rating: 'Tough Laws' };
}

/**
 * Room to Grow score (15 points max)
 * Is there space for more rentals, or is this market already crowded?
 * 
 * We look at: how many rentals exist vs. how many people live there
 */
export function scoreRoomToGrow(listingsPerThousand: number, population?: number): { score: number; rating: string } {
  const isTourismTown = population !== undefined && population < 5000;
  
  if (isTourismTown) {
    if (listingsPerThousand < 15) return { score: 15, rating: 'Lots of Room' };
    if (listingsPerThousand < 30) return { score: 10, rating: 'Some Room' };
    if (listingsPerThousand < 50) return { score: 5, rating: 'Getting Crowded' };
    return { score: 0, rating: 'Very Crowded' };
  }
  
  if (listingsPerThousand < 3) return { score: 15, rating: 'Lots of Room' };
  if (listingsPerThousand < 6) return { score: 10, rating: 'Some Room' };
  if (listingsPerThousand < 10) return { score: 5, rating: 'Getting Crowded' };
  return { score: 0, rating: 'Very Crowded' };
}

/**
 * Convert total score to letter grade
 */
export function getGrade(totalScore: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' {
  if (totalScore >= 90) return 'A+';
  if (totalScore >= 80) return 'A';
  if (totalScore >= 70) return 'B+';
  if (totalScore >= 60) return 'B';
  if (totalScore >= 50) return 'C';
  if (totalScore >= 40) return 'D';
  return 'F';
}

/**
 * Convert grade to verdict
 * A+ = "Passes All Filters" (not "Strong Buy" - we're not giving financial advice!)
 */
export function getVerdict(grade: string): 'passes-all-filters' | 'buy' | 'hold' | 'caution' | 'avoid' {
  switch (grade) {
    case 'A+': return 'passes-all-filters';
    case 'A': return 'buy';
    case 'B+': return 'buy';
    case 'B': return 'hold';
    case 'C': return 'hold';
    case 'D': return 'caution';
    default: return 'avoid';
  }
}

/**
 * Calculate complete scoring breakdown for a market
 */
export interface MarketData {
  monthlyRevenue: number;
  medianHomePrice: number;
  stateCode: string;
  listingsPerThousand: number;
  population?: number;
  seasonalityScore?: number; // 0-100, higher = more consistent year-round
  occupancyRate?: number; // 0-100 percentage
}

export function calculateScore(data: MarketData): ScoringBreakdown {
  const cashOnCashReturn = calculateCashOnCash(data.monthlyRevenue, data.medianHomePrice);
  
  const cashOnCash = scoreCashOnCash(cashOnCashReturn);
  const affordability = scoreAffordability(data.medianHomePrice);
  const yearRoundIncome = scoreYearRoundIncome(
    data.seasonalityScore || 60, // Default to 60 if not provided
    data.occupancyRate || 55 // Default to 55% if not provided
  );
  const landlordFriendly = scoreLandlordFriendly(data.stateCode);
  const roomToGrow = scoreRoomToGrow(data.listingsPerThousand, data.population);
  
  const totalScore = 
    cashOnCash.score + 
    affordability.score + 
    yearRoundIncome.score +
    landlordFriendly.score + 
    roomToGrow.score;
  
  const grade = getGrade(totalScore);
  const verdict = getVerdict(grade);
  
  return {
    cashOnCash: { 
      score: cashOnCash.score, 
      maxScore: 35, 
      value: cashOnCashReturn, 
      rating: cashOnCash.rating,
      tooltip: 'How much money you make back each year compared to what you put in'
    },
    affordability: { 
      score: affordability.score, 
      maxScore: 25, 
      value: data.medianHomePrice, 
      rating: affordability.rating,
      tooltip: 'Can you afford to buy a home here?'
    },
    yearRoundIncome: { 
      score: yearRoundIncome.score, 
      maxScore: 15, 
      value: yearRoundIncome.value, 
      rating: yearRoundIncome.rating,
      tooltip: 'Can you still make money even in the slow months?'
    },
    landlordFriendly: { 
      score: landlordFriendly.score, 
      maxScore: 10, 
      rating: landlordFriendly.rating,
      tooltip: 'Are the laws on your side if there\'s a problem?'
    },
    roomToGrow: { 
      score: roomToGrow.score, 
      maxScore: 15, 
      value: data.listingsPerThousand, 
      rating: roomToGrow.rating,
      tooltip: 'Is there space for more rentals, or is this market already crowded?'
    },
    totalScore,
    maxPossibleScore: 100,
    grade,
    verdict,
  };
}

/**
 * Calculate state-level score as weighted average of city scores
 */
export function calculateStateScore(cityScores: number[]): number {
  if (cityScores.length === 0) return 0;
  
  const sorted = [...cityScores].sort((a, b) => b - a);
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  
  return Math.round(topHalf.reduce((sum, s) => sum + s, 0) / topHalf.length);
}

// Simple tooltip text for each category (3rd grade reading level)
export const SCORE_TOOLTIPS = {
  cashOnCash: 'How much money you make back each year compared to what you put in',
  affordability: 'Can you afford to buy a home here?',
  yearRoundIncome: 'Can you still make money even in the slow months?',
  landlordFriendly: 'Are the laws on your side if there\'s a problem?',
  roomToGrow: 'Is there space for more rentals, or is this market already crowded?',
};

// Disclaimer text
export const SCORE_DISCLAIMER = 'This score helps you filter markets — it doesn\'t replace checking the actual deal.';
