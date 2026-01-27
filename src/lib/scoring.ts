/**
 * Edge by Teeco - STR Scoring Model
 * 
 * A transparent, defensible scoring system biased toward:
 * - Rural, affordable, self-managed STRs
 * - Cash flow over appreciation plays
 * - Markets under $250K median home price
 * 
 * SCORING WEIGHTS (Total: 100 points)
 * =====================================
 * 1. Cash-on-Cash Return (RPR)    - 35 points (heaviest weight)
 * 2. Affordability                - 25 points
 * 3. STR Legality                 - 15 points
 * 4. Landlord Friendliness        - 10 points
 * 5. Saturation Risk              - 10 points
 * 6. Appreciation Potential       - 5 points (lowest - we're not chasing appreciation)
 */

export interface ScoringBreakdown {
  cashOnCash: { score: number; maxScore: 35; value: number; rating: string };
  affordability: { score: number; maxScore: 25; value: number; rating: string };
  legality: { score: number; maxScore: 15; status: string; rating: string };
  landlordFriendly: { score: number; maxScore: 10; rating: string };
  saturation: { score: number; maxScore: 10; value: number; rating: string };
  appreciation: { score: number; maxScore: 5; value: number; rating: string };
  totalScore: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  verdict: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
}

/**
 * Calculate Cash-on-Cash score (35 points max)
 * Based on Revenue-to-Price Ratio (RPR)
 * 
 * RPR = Annual Gross Revenue / Purchase Price
 * Target: 20%+ for strong score
 * 
 * Scoring:
 * - RPR >= 0.20 (20%+): 35 points (Elite)
 * - RPR >= 0.18 (18%+): 30 points (Excellent)
 * - RPR >= 0.15 (15%+): 25 points (Good)
 * - RPR >= 0.12 (12%+): 18 points (Marginal)
 * - RPR >= 0.10 (10%+): 10 points (Poor)
 * - RPR < 0.10: 5 points (Avoid)
 */
export function scoreCashOnCash(rpr: number): { score: number; rating: string } {
  if (rpr >= 0.20) return { score: 35, rating: 'Elite (20%+)' };
  if (rpr >= 0.18) return { score: 30, rating: 'Excellent (18%+)' };
  if (rpr >= 0.15) return { score: 25, rating: 'Good (15%+)' };
  if (rpr >= 0.12) return { score: 18, rating: 'Marginal (12%+)' };
  if (rpr >= 0.10) return { score: 10, rating: 'Poor (10%+)' };
  return { score: 5, rating: 'Avoid (<10%)' };
}

/**
 * Calculate Affordability score (25 points max)
 * Target: $250K or less median home price
 * 
 * Scoring:
 * - <= $150K: 25 points (Highly Affordable)
 * - <= $200K: 22 points (Very Affordable)
 * - <= $250K: 18 points (Affordable - Target)
 * - <= $300K: 12 points (Moderate)
 * - <= $400K: 6 points (Expensive)
 * - > $400K: 2 points (Very Expensive)
 */
export function scoreAffordability(medianHomePrice: number): { score: number; rating: string } {
  if (medianHomePrice <= 150000) return { score: 25, rating: 'Highly Affordable' };
  if (medianHomePrice <= 200000) return { score: 22, rating: 'Very Affordable' };
  if (medianHomePrice <= 250000) return { score: 18, rating: 'Affordable' };
  if (medianHomePrice <= 300000) return { score: 12, rating: 'Moderate' };
  if (medianHomePrice <= 400000) return { score: 6, rating: 'Expensive' };
  return { score: 2, rating: 'Very Expensive' };
}

/**
 * Calculate STR Legality score (15 points max)
 * 
 * Scoring:
 * - Legal (no restrictions): 15 points
 * - Legal (permit required): 12 points
 * - Varies by area: 8 points
 * - Restricted: 4 points
 * - Banned: 0 points
 */
export function scoreLegality(status: string, permitRequired: boolean): { score: number; rating: string } {
  if (status === 'banned') return { score: 0, rating: 'Banned' };
  if (status === 'restricted') return { score: 4, rating: 'Restricted' };
  if (status === 'varies') return { score: 8, rating: 'Varies by Area' };
  if (status === 'legal' && permitRequired) return { score: 12, rating: 'Legal (Permit Required)' };
  return { score: 15, rating: 'Fully Legal' };
}

/**
 * Calculate Landlord Friendliness score (10 points max)
 * Based on state-level tenant/landlord laws
 * 
 * States are categorized as:
 * - Very Landlord Friendly: 10 points
 * - Landlord Friendly: 8 points
 * - Neutral: 5 points
 * - Tenant Friendly: 2 points
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
  if (score >= 10) return { score, rating: 'Very Landlord Friendly' };
  if (score >= 8) return { score, rating: 'Landlord Friendly' };
  if (score >= 5) return { score, rating: 'Neutral' };
  return { score, rating: 'Tenant Friendly' };
}

/**
 * Calculate Saturation Risk score (10 points max)
 * Based on STR listings per 1,000 residents
 * 
 * Scoring:
 * - < 3 listings/1000: 10 points (Low Saturation)
 * - < 6 listings/1000: 8 points (Moderate)
 * - < 10 listings/1000: 5 points (High)
 * - >= 10 listings/1000: 2 points (Very High)
 */
export function scoreSaturation(listingsPerThousand: number): { score: number; rating: string } {
  if (listingsPerThousand < 3) return { score: 10, rating: 'Low Saturation' };
  if (listingsPerThousand < 6) return { score: 8, rating: 'Moderate Saturation' };
  if (listingsPerThousand < 10) return { score: 5, rating: 'High Saturation' };
  return { score: 2, rating: 'Very High Saturation' };
}

/**
 * Calculate Appreciation score (5 points max)
 * We assume ~3% annual appreciation as baseline
 * This is the LOWEST weighted factor - we're not chasing appreciation
 * 
 * Scoring:
 * - >= 4%: 5 points (Above Average)
 * - >= 2%: 4 points (Average)
 * - >= 0%: 2 points (Flat)
 * - < 0%: 1 point (Declining)
 */
export function scoreAppreciation(oneYearAppreciation: number): { score: number; rating: string } {
  if (oneYearAppreciation >= 4) return { score: 5, rating: 'Above Average' };
  if (oneYearAppreciation >= 2) return { score: 4, rating: 'Average' };
  if (oneYearAppreciation >= 0) return { score: 2, rating: 'Flat' };
  return { score: 1, rating: 'Declining' };
}

/**
 * Convert total score to letter grade
 * 
 * Grading Scale:
 * - A+ : 85-100 points
 * - A  : 75-84 points
 * - B+ : 65-74 points
 * - B  : 55-64 points
 * - C  : 45-54 points
 * - D  : 35-44 points
 * - F  : 0-34 points
 */
export function getGrade(totalScore: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' {
  if (totalScore >= 85) return 'A+';
  if (totalScore >= 75) return 'A';
  if (totalScore >= 65) return 'B+';
  if (totalScore >= 55) return 'B';
  if (totalScore >= 45) return 'C';
  if (totalScore >= 35) return 'D';
  return 'F';
}

/**
 * Convert grade to verdict
 */
export function getVerdict(grade: string): 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid' {
  switch (grade) {
    case 'A+': return 'strong-buy';
    case 'A': return 'buy';
    case 'B+': return 'hold';
    case 'B': return 'hold';
    case 'C': return 'caution';
    case 'D': return 'caution';
    default: return 'avoid';
  }
}

/**
 * Calculate complete scoring breakdown for a market
 */
export interface MarketData {
  rpr: number;
  medianHomePrice: number;
  strStatus: string;
  permitRequired: boolean;
  stateCode: string;
  listingsPerThousand: number;
  oneYearAppreciation: number;
}

export function calculateScore(data: MarketData): ScoringBreakdown {
  const cashOnCash = scoreCashOnCash(data.rpr);
  const affordability = scoreAffordability(data.medianHomePrice);
  const legality = scoreLegality(data.strStatus, data.permitRequired);
  const landlordFriendly = scoreLandlordFriendly(data.stateCode);
  const saturation = scoreSaturation(data.listingsPerThousand);
  const appreciation = scoreAppreciation(data.oneYearAppreciation);
  
  const totalScore = 
    cashOnCash.score + 
    affordability.score + 
    legality.score + 
    landlordFriendly.score + 
    saturation.score + 
    appreciation.score;
  
  const grade = getGrade(totalScore);
  const verdict = getVerdict(grade);
  
  return {
    cashOnCash: { score: cashOnCash.score, maxScore: 35, value: data.rpr * 100, rating: cashOnCash.rating },
    affordability: { score: affordability.score, maxScore: 25, value: data.medianHomePrice, rating: affordability.rating },
    legality: { score: legality.score, maxScore: 15, status: data.strStatus, rating: legality.rating },
    landlordFriendly: { score: landlordFriendly.score, maxScore: 10, rating: landlordFriendly.rating },
    saturation: { score: saturation.score, maxScore: 10, value: data.listingsPerThousand, rating: saturation.rating },
    appreciation: { score: appreciation.score, maxScore: 5, value: data.oneYearAppreciation, rating: appreciation.rating },
    totalScore,
    grade,
    verdict,
  };
}

/**
 * Calculate state-level score as weighted average of city scores
 * State score = Average of top 50% performing cities in that state
 * This prevents a few bad markets from tanking an otherwise good state
 */
export function calculateStateScore(cityScores: number[]): number {
  if (cityScores.length === 0) return 0;
  
  // Sort descending and take top 50%
  const sorted = [...cityScores].sort((a, b) => b - a);
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  
  // Return average of top half
  return Math.round(topHalf.reduce((sum, s) => sum + s, 0) / topHalf.length);
}
