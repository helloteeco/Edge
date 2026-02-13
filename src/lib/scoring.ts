/**
 * Edge by Teeco - STR Scoring Model v2
 * 
 * A transparent, defensible scoring system biased toward:
 * - Rural, affordable, self-managed STRs
 * - Cash flow over appreciation plays
 * - Markets under $250K median home price
 * 
 * SCORING WEIGHTS (Total: 100 points)
 * =====================================
 * 1. Cash-on-Cash Return            - 35 points (heaviest weight)
 * 2. Affordability                  - 25 points
 * 3. Year-Round Income              - 15 points (seasonality consistency)
 * 4. Landlord Friendliness          - 10 points
 * 5. Room to Grow (Market Headroom) - 15 points
 * 
 * NOTE: STR Legality is no longer part of the score.
 * It is displayed separately with a link to permitting resources.
 * 
 * CASH-ON-CASH RETURN CALCULATION
 * ================================
 * Cash-on-Cash = (Annual Net Operating Income) / (Total Cash Invested)
 * 
 * Where:
 * - Annual Net Operating Income = (Monthly Revenue × 12) - Annual Operating Expenses
 * - Annual Operating Expenses = ~35% of gross revenue (cleaning, utilities, PM, insurance, repairs)
 * - Total Cash Invested = Down Payment (20%) + Closing Costs (3%)
 * 
 * Example: $200K home, $3,000/month revenue
 * - Annual Gross Revenue: $36,000
 * - Annual Operating Expenses (35%): $12,600
 * - Annual NOI: $23,400
 * - Mortgage Payment (80% @ 7%, 30yr): $1,064/month = $12,768/year
 * - Annual Cash Flow: $23,400 - $12,768 = $10,632
 * - Total Cash Invested: $40,000 (20%) + $6,000 (3%) = $46,000
 * - Cash-on-Cash Return: $10,632 / $46,000 = 23.1%
 */

export interface RegulationInfo {
  legality_status: 'legal' | 'restricted' | 'banned' | 'unknown';
  permit_difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard' | 'unknown';
  max_nights_per_year: number | null;
  owner_occupied_required: boolean;
  permit_cap: boolean;
  summary: string;
  details: string;
  last_verified?: string;
}

export interface ScoringBreakdown {
  cashOnCash: { score: number; maxScore: 35; value: number; rating: string };
  affordability: { score: number; maxScore: 25; value: number; rating: string };
  yearRoundIncome: { score: number; maxScore: 15; value: number; rating: string };
  landlordFriendly: { score: number; maxScore: 10; rating: string };
  roomToGrow: { score: number; maxScore: 15; value: number; rating: string };
  totalScore: number;
  /** Regulation-adjusted score. Same as totalScore if no penalty, otherwise capped to match the capped grade range. */
  adjustedScore: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  verdict: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  // Regulation overlay (applied after base scoring)
  regulationPenalty?: {
    applied: boolean;
    originalGrade: string;
    originalVerdict: string;
    originalScore: number;
    reason: string;
    legality: string;
    permitDifficulty: string;
  };
  regulation?: RegulationInfo;
}

/**
 * Calculate Cash-on-Cash Return from monthly revenue and home price
 * 
 * Assumptions:
 * - 20% down payment
 * - 3% closing costs
 * - 7% interest rate, 30-year mortgage
 * - 35% operating expense ratio
 */
export function calculateCashOnCash(monthlyRevenue: number, homePrice: number): number {
  if (homePrice <= 0 || monthlyRevenue <= 0) return 0;
  
  // Annual gross revenue
  const annualGrossRevenue = monthlyRevenue * 12;
  
  // Operating expenses (35% of gross)
  const annualOperatingExpenses = annualGrossRevenue * 0.35;
  
  // Net Operating Income
  const annualNOI = annualGrossRevenue - annualOperatingExpenses;
  
  // Mortgage calculation (80% LTV, 7% rate, 30 years)
  const loanAmount = homePrice * 0.80;
  const monthlyRate = 0.07 / 12;
  const numPayments = 30 * 12;
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualMortgage = monthlyMortgage * 12;
  
  // Annual Cash Flow
  const annualCashFlow = annualNOI - annualMortgage;
  
  // Total Cash Invested (20% down + 3% closing costs)
  const totalCashInvested = (homePrice * 0.20) + (homePrice * 0.03);
  
  // Cash-on-Cash Return
  const cashOnCash = (annualCashFlow / totalCashInvested) * 100;
  
  return Math.round(cashOnCash * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate Cash-on-Cash score (35 points max)
 * 
 * Target: 20%+ for strong score
 * 
 * Scoring:
 * - CoC >= 20%: 35 points (Elite)
 * - CoC >= 15%: 30 points (Excellent)
 * - CoC >= 10%: 25 points (Good)
 * - CoC >= 5%: 18 points (Marginal)
 * - CoC >= 0%: 10 points (Break-even)
 * - CoC < 0%: 5 points (Negative Cash Flow)
 */
export function scoreCashOnCash(cashOnCashReturn: number): { score: number; rating: string } {
  if (cashOnCashReturn >= 20) return { score: 35, rating: 'Elite (20%+)' };
  if (cashOnCashReturn >= 15) return { score: 30, rating: 'Excellent (15%+)' };
  if (cashOnCashReturn >= 10) return { score: 25, rating: 'Good (10%+)' };
  if (cashOnCashReturn >= 5) return { score: 18, rating: 'Marginal (5%+)' };
  if (cashOnCashReturn >= 0) return { score: 10, rating: 'Break-even' };
  return { score: 5, rating: 'Negative Cash Flow' };
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
 * Calculate Year-Round Income score (15 points max)
 * Based on occupancy rate as a proxy for year-round demand consistency.
 * Higher occupancy = more consistent income throughout the year.
 * 
 * Scoring:
 * - >= 65%: 15 points (Excellent Year-Round)
 * - >= 55%: 12 points (Strong Year-Round)
 * - >= 45%: 9 points (Moderate Seasonality)
 * - >= 35%: 5 points (Seasonal Market)
 * - < 35%: 2 points (Highly Seasonal)
 */
export function scoreYearRoundIncome(occupancyRate: number): { score: number; rating: string } {
  if (occupancyRate >= 65) return { score: 15, rating: 'Excellent Year-Round' };
  if (occupancyRate >= 55) return { score: 12, rating: 'Strong Year-Round' };
  if (occupancyRate >= 45) return { score: 9, rating: 'Moderate Seasonality' };
  if (occupancyRate >= 35) return { score: 5, rating: 'Seasonal Market' };
  return { score: 2, rating: 'Highly Seasonal' };
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
 * Calculate Room to Grow score (15 points max)
 * Based on STR listings per 1,000 residents
 * Higher score = more room for new STRs (less competition)
 * 
 * IMPORTANT: Small tourism towns (population < 5,000) use adjusted thresholds
 * because their visitor-to-resident ratio is naturally high.
 * 
 * Standard Scoring (population >= 5,000):
 * - < 3 listings/1000: 15 points (Excellent Headroom)
 * - < 6 listings/1000: 12 points (Good Headroom)
 * - < 10 listings/1000: 8 points (Limited Headroom)
 * - >= 10 listings/1000: 3 points (Crowded Market)
 * 
 * Tourism Town Scoring (population < 5,000):
 * - < 15 listings/1000: 15 points (Excellent Headroom)
 * - < 30 listings/1000: 12 points (Good Headroom)
 * - < 50 listings/1000: 8 points (Limited Headroom)
 * - >= 50 listings/1000: 3 points (Crowded Market)
 */
export function scoreRoomToGrow(listingsPerThousand: number, population?: number): { score: number; rating: string } {
  // Use tourism-adjusted thresholds for small towns (likely tourism destinations)
  const isTourismTown = population !== undefined && population < 5000;
  
  if (isTourismTown) {
    if (listingsPerThousand < 15) return { score: 15, rating: 'Excellent Headroom' };
    if (listingsPerThousand < 30) return { score: 12, rating: 'Good Headroom' };
    if (listingsPerThousand < 50) return { score: 8, rating: 'Limited Headroom' };
    return { score: 3, rating: 'Crowded Market' };
  }
  
  if (listingsPerThousand < 3) return { score: 15, rating: 'Excellent Headroom' };
  if (listingsPerThousand < 6) return { score: 12, rating: 'Good Headroom' };
  if (listingsPerThousand < 10) return { score: 8, rating: 'Limited Headroom' };
  return { score: 3, rating: 'Crowded Market' };
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
  occupancyRate: number;
  stateCode: string;
  listingsPerThousand: number;
  population?: number;
}

export function calculateScore(data: MarketData): ScoringBreakdown {
  // Calculate Cash-on-Cash return from revenue and price
  const cashOnCashReturn = calculateCashOnCash(data.monthlyRevenue, data.medianHomePrice);
  
  const cashOnCash = scoreCashOnCash(cashOnCashReturn);
  const affordability = scoreAffordability(data.medianHomePrice);
  const yearRoundIncome = scoreYearRoundIncome(data.occupancyRate);
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
    cashOnCash: { score: cashOnCash.score, maxScore: 35, value: cashOnCashReturn, rating: cashOnCash.rating },
    affordability: { score: affordability.score, maxScore: 25, value: data.medianHomePrice, rating: affordability.rating },
    yearRoundIncome: { score: yearRoundIncome.score, maxScore: 15, value: data.occupancyRate, rating: yearRoundIncome.rating },
    landlordFriendly: { score: landlordFriendly.score, maxScore: 10, rating: landlordFriendly.rating },
    roomToGrow: { score: roomToGrow.score, maxScore: 15, value: data.listingsPerThousand, rating: roomToGrow.rating },
    totalScore,
    adjustedScore: totalScore, // Same as totalScore until regulation penalty is applied
    grade,
    verdict,
  };
}

/**
 * Calculate state-level score from city scores.
 *
 * Philosophy: A state's STR grade answers "How good are the best STR
 * opportunities in this state?" — not "What's the average city quality?"
 *
 * This means:
 * - Adding more cities (even low-scoring ones) should NEVER significantly
 *   hurt the state grade. The algorithm is stable under data expansion.
 * - A state with strong top performers should grade well regardless of
 *   how many weaker cities are also tracked.
 * - But a state with only 1-2 decent cities and nothing else should score
 *   lower than one with 20 strong cities.
 *
 * Algorithm:
 * 1. Take the top N cities (20% of total, min 3, max 10).
 *    The max-10 cap is key: once a state has 50+ cities, adding more
 *    never changes which cities are in the top-10 window.
 * 2. Average those top-N scores.
 * 3. Apply a small breadth penalty (up to -5 pts) if fewer than 30% of
 *    the state's cities are "investable" (score >= 55 / grade B+).
 *    This prevents a state with 1 great city and 50 terrible ones from
 *    earning an A+.
 *
 * Stability proof (tested):
 * - KY (28 cities, score 87): adding 50 F-grade cities → drops only 2 pts
 * - CA (143 cities, score 62): adding 100 F-grade cities → drops 0 pts
 * - CA + 10 A-grade cities → jumps from 62 to 82 (rewards adding quality)
 */
export function calculateStateScore(cityScores: number[]): number {
  if (cityScores.length === 0) return 0;
  if (cityScores.length === 1) return cityScores[0];

  const sorted = [...cityScores].sort((a, b) => b - a);

  // Top N: 20% of cities, min 3, max 10
  const topN = Math.min(10, Math.max(3, Math.ceil(sorted.length * 0.20)));
  const topPerformers = sorted.slice(0, topN);
  const topAvg = topPerformers.reduce((s, v) => s + v, 0) / topPerformers.length;

  // Breadth penalty: 0 if >= 30% investable, up to -5 if < 10%
  const investableCount = cityScores.filter(s => s >= 55).length;
  const investableRatio = investableCount / cityScores.length;
  let breadthPenalty = 0;
  if (investableRatio < 0.30) {
    breadthPenalty = Math.round((0.30 - investableRatio) / 0.30 * 5);
  }

  return Math.round(Math.max(0, topAvg - breadthPenalty));
}

// ============================================
// LEGACY COMPATIBILITY EXPORTS
// These are kept for backward compatibility with
// existing code that references the old scoring fields.
// They will be removed in a future cleanup.
// ============================================

/** @deprecated Use scoreRoomToGrow instead */
export function scoreMarketHeadroom(listingsPerThousand: number, population?: number) {
  const result = scoreRoomToGrow(listingsPerThousand, population);
  return { score: Math.round(result.score * (10/15)), rating: result.rating };
}

/** @deprecated Use scoreYearRoundIncome instead */
export function scoreAppreciation(oneYearAppreciation: number): { score: number; rating: string } {
  if (oneYearAppreciation >= 4) return { score: 5, rating: 'Above Average' };
  if (oneYearAppreciation >= 2) return { score: 4, rating: 'Average' };
  if (oneYearAppreciation >= 0) return { score: 2, rating: 'Flat' };
  return { score: 1, rating: 'Declining' };
}

/** @deprecated Legality is no longer part of the score */
export function scoreLegality(status: string, permitRequired: boolean): { score: number; rating: string } {
  if (status === 'banned') return { score: 0, rating: 'Banned' };
  if (status === 'restricted') return { score: 4, rating: 'Restricted' };
  if (status === 'varies') return { score: 8, rating: 'Varies by Area' };
  if (status === 'legal' && permitRequired) return { score: 12, rating: 'Legal (Permit Required)' };
  return { score: 15, rating: 'Fully Legal' };
}

/**
 * Grade-to-max-score mapping.
 * When a regulation penalty caps the grade, we also cap the numeric score
 * so that sorting by score correctly reflects the grade penalty.
 * 
 * Grade ranges: A+ (85-100), A (75-84), B+ (65-74), B (55-64), C (45-54), D (35-44), F (0-34)
 */
const GRADE_MAX_SCORE: Record<string, number> = {
  'F': 34,
  'D': 44,
  'C': 54,
  'B': 64,
  'B+': 74,
  'A': 84,
  'A+': 100,
};

/**
 * Apply regulation penalty overlay to a scoring breakdown.
 * This caps BOTH the grade/verdict AND the numeric adjustedScore.
 * 
 * Penalty rules:
 * - Banned: Grade capped at D, verdict forced to "avoid", score capped at 44
 * - Restricted: Grade capped at C, verdict capped at "caution", score capped at 54
 * - Very Hard permit: Grade capped at B, verdict capped at "hold", score capped at 64
 * - Hard permit: No grade cap, but warning shown
 * - Legal + Easy/Moderate: No penalty
 */
export function applyRegulationPenalty(
  scoring: ScoringBreakdown,
  regulation: RegulationInfo
): ScoringBreakdown {
  const result = { ...scoring };
  const originalGrade = scoring.grade;
  const originalVerdict = scoring.verdict;
  const originalScore = scoring.totalScore;

  const gradeOrder: Array<ScoringBreakdown['grade']> = ['F', 'D', 'C', 'B', 'B+', 'A', 'A+'];
  const verdictOrder: Array<ScoringBreakdown['verdict']> = ['avoid', 'caution', 'hold', 'buy', 'strong-buy'];

  let maxGradeApplied: ScoringBreakdown['grade'] | null = null;

  function capGrade(maxGrade: ScoringBreakdown['grade']) {
    const currentIdx = gradeOrder.indexOf(result.grade);
    const maxIdx = gradeOrder.indexOf(maxGrade);
    if (currentIdx > maxIdx) {
      result.grade = maxGrade;
      maxGradeApplied = maxGrade;
    }
  }

  function capVerdict(maxVerdict: ScoringBreakdown['verdict']) {
    const currentIdx = verdictOrder.indexOf(result.verdict);
    const maxIdx = verdictOrder.indexOf(maxVerdict);
    if (currentIdx > maxIdx) {
      result.verdict = maxVerdict;
    }
  }

  let reason = '';
  let penaltyApplied = false;

  // Apply legality penalties
  if (regulation.legality_status === 'banned') {
    capGrade('D');
    capVerdict('avoid');
    reason = 'STRs are effectively banned in this market';
    penaltyApplied = true;
  } else if (regulation.legality_status === 'restricted') {
    capGrade('C');
    capVerdict('caution');
    reason = 'STRs face significant restrictions in this market';
    penaltyApplied = true;
  }

  // Apply permit difficulty penalties (only if not already penalized harder)
  if (!penaltyApplied && regulation.permit_difficulty === 'very_hard') {
    capGrade('B');
    capVerdict('hold');
    reason = 'STR permits are extremely difficult to obtain';
    penaltyApplied = true;
  }

  // Cap the numeric adjustedScore to match the capped grade range
  if (maxGradeApplied) {
    const maxScore = GRADE_MAX_SCORE[maxGradeApplied] ?? result.totalScore;
    result.adjustedScore = Math.min(result.totalScore, maxScore);
  }

  // Always attach regulation info
  result.regulation = regulation;
  result.regulationPenalty = {
    applied: penaltyApplied,
    originalGrade,
    originalVerdict,
    originalScore,
    reason,
    legality: regulation.legality_status,
    permitDifficulty: regulation.permit_difficulty,
  };

  return result;
}
