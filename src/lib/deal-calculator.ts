/**
 * Edge Deal Calculator - Calculation Engine
 * 
 * Pure functions for STR investment analysis.
 * All calculations are deterministic and produce low/base/high ranges.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Range {
  low: number;
  base: number;
  high: number;
}

export interface PropertyProfile {
  bedrooms: number;
  bathrooms: number;
  propertyType: 'house' | 'condo' | 'cabin' | 'apartment' | 'townhouse';
  purchasePrice: number;
  squareFeet?: number;
}

export interface MarketBenchmark {
  adr: Range;           // Average Daily Rate
  occupancy: Range;     // Occupancy rate (0-100)
  source: 'city_data' | 'state_fallback' | 'user_estimate';
  marketName: string;
  sampleSize?: number;  // For confidence scoring
}

export interface FinancingAssumptions {
  downPaymentPct: number;      // 10-100%
  interestRate: number;        // Annual rate (e.g., 7.0)
  loanTermYears: number;       // 15 or 30
  closingCostsPct: number;     // Typically 2-5%
}

export interface OperatingAssumptions {
  managementPct: number;       // 0-30% of gross revenue
  cleaningCostPerStay: number; // Per turnover
  avgStayLength: number;       // Nights (default 3)
  utilitiesMonthly: number;    // Monthly utilities
  insuranceAnnual: number;     // Annual insurance
  propertyTaxRate: number;     // Annual rate (e.g., 1.2%)
  capexReservePct: number;     // 5% recommended
  suppliesMonthly: number;     // Toiletries, linens replacement
}

export interface SeasonalityProfile {
  type: 'year_round' | 'summer_peak' | 'winter_peak' | 'custom';
  monthlyMultipliers?: number[]; // Length 12, average should be ~1.0
}

export interface LTRComparison {
  monthlyRent: number;
  vacancyPct: number;         // 5-10% typical
  repairsPct: number;         // 5-10% of rent
  managementPct: number;      // 8-10% typical
  utilitiesMonthly: number;   // Often tenant pays
}

export interface DealInputs {
  property: PropertyProfile;
  benchmark: MarketBenchmark;
  financing: FinancingAssumptions;
  operating: OperatingAssumptions;
  seasonality: SeasonalityProfile;
  adrAdjustment: number;      // -20 to +20 (percentage points)
  occupancyAdjustment: number; // -20 to +20 (percentage points)
}

export interface RevenueOutput {
  grossAnnual: Range;
  grossMonthly: Range;
  effectiveADR: Range;
  effectiveOccupancy: Range;
  totalNights: Range;
  totalStays: Range;
}

export interface ExpenseOutput {
  mortgage: {
    monthlyPayment: number;
    annualPayment: number;
    principalYear1: number;
    interestYear1: number;
  };
  propertyTax: number;
  insurance: number;
  management: Range;
  cleaning: Range;
  utilities: number;
  capexReserve: Range;
  supplies: number;
  totalAnnual: Range;
  totalMonthly: Range;
}

export interface ReturnOutput {
  noi: Range;                  // Net Operating Income
  cashFlow: Range;             // After debt service
  cashOnCash: Range;           // Annual return on cash invested
  capRate: Range;              // NOI / Purchase Price
  totalCashInvested: number;   // Down payment + closing costs
  breakEvenOccupancy: number;  // Occupancy needed to break even
}

export interface LTROutput {
  grossAnnual: number;
  effectiveGross: number;      // After vacancy
  expenses: number;
  noi: number;
  cashFlow: number;
  cashOnCash: number;
}

export interface ComparisonOutput {
  strVsLtrCashFlow: Range;     // Monthly difference
  strVsLtrCoC: Range;          // CoC difference
  breakEvenOccupancy: number;  // STR occupancy to match LTR
  recommendation: 'str' | 'ltr' | 'either';
}

export interface ConfidenceScore {
  score: number;               // 0-100
  level: 'high' | 'medium' | 'low';
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
}

export interface DealOutput {
  revenue: RevenueOutput;
  expenses: ExpenseOutput;
  returns: ReturnOutput;
  ltr?: LTROutput;
  comparison?: ComparisonOutput;
  confidence: ConfidenceScore;
}

// ============================================================================
// SEASONALITY PRESETS
// ============================================================================

export const SEASONALITY_PRESETS: Record<string, number[]> = {
  year_round: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  summer_peak: [0.7, 0.7, 0.8, 0.9, 1.1, 1.3, 1.4, 1.4, 1.1, 0.9, 0.7, 0.7],
  winter_peak: [1.3, 1.2, 1.1, 0.8, 0.7, 0.7, 0.8, 0.8, 0.8, 0.9, 1.1, 1.3],
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_FINANCING: FinancingAssumptions = {
  downPaymentPct: 25,
  interestRate: 7.0,
  loanTermYears: 30,
  closingCostsPct: 3,
};

export const DEFAULT_OPERATING: OperatingAssumptions = {
  managementPct: 0,            // Self-managed default
  cleaningCostPerStay: 150,
  avgStayLength: 3,
  utilitiesMonthly: 200,
  insuranceAnnual: 2000,
  propertyTaxRate: 1.2,
  capexReservePct: 5,
  suppliesMonthly: 50,
};

export const DEFAULT_LTR: LTRComparison = {
  monthlyRent: 0,              // Will be estimated from market
  vacancyPct: 5,
  repairsPct: 5,
  managementPct: 8,
  utilitiesMonthly: 0,         // Tenant pays
};

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate monthly mortgage payment using standard amortization formula
 */
export function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);
  
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return Math.round(payment * 100) / 100;
}

/**
 * Calculate first year principal and interest breakdown
 */
export function calculateFirstYearAmortization(
  principal: number,
  annualRate: number,
  termYears: number
): { principal: number; interest: number } {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  
  let remainingPrincipal = principal;
  let totalPrincipal = 0;
  let totalInterest = 0;
  
  for (let month = 0; month < 12; month++) {
    const interestPayment = remainingPrincipal * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    
    totalInterest += interestPayment;
    totalPrincipal += principalPayment;
    remainingPrincipal -= principalPayment;
  }
  
  return {
    principal: Math.round(totalPrincipal),
    interest: Math.round(totalInterest),
  };
}

/**
 * Apply user adjustments to benchmark values
 */
export function applyAdjustments(
  benchmark: Range,
  adjustmentPct: number
): Range {
  const multiplier = 1 + (adjustmentPct / 100);
  return {
    low: Math.round(benchmark.low * multiplier * 100) / 100,
    base: Math.round(benchmark.base * multiplier * 100) / 100,
    high: Math.round(benchmark.high * multiplier * 100) / 100,
  };
}

/**
 * Calculate annual revenue with seasonality
 */
export function calculateRevenue(
  adr: Range,
  occupancy: Range, // 0-100
  seasonality: SeasonalityProfile
): RevenueOutput {
  const multipliers = seasonality.type === 'custom' && seasonality.monthlyMultipliers
    ? seasonality.monthlyMultipliers
    : SEASONALITY_PRESETS[seasonality.type] || SEASONALITY_PRESETS.year_round;
  
  // Average seasonality factor (should be ~1.0)
  const avgSeasonality = multipliers.reduce((a, b) => a + b, 0) / 12;
  
  // Calculate effective occupancy (capped at 95%)
  const effectiveOcc = {
    low: Math.min(occupancy.low / 100, 0.95),
    base: Math.min(occupancy.base / 100, 0.95),
    high: Math.min(occupancy.high / 100, 0.95),
  };
  
  // Total nights booked per year
  const totalNights = {
    low: Math.round(365 * effectiveOcc.low),
    base: Math.round(365 * effectiveOcc.base),
    high: Math.round(365 * effectiveOcc.high),
  };
  
  // Gross annual revenue = ADR × nights × seasonality factor
  const grossAnnual = {
    low: Math.round(adr.low * totalNights.low * avgSeasonality),
    base: Math.round(adr.base * totalNights.base * avgSeasonality),
    high: Math.round(adr.high * totalNights.high * avgSeasonality),
  };
  
  return {
    grossAnnual,
    grossMonthly: {
      low: Math.round(grossAnnual.low / 12),
      base: Math.round(grossAnnual.base / 12),
      high: Math.round(grossAnnual.high / 12),
    },
    effectiveADR: adr,
    effectiveOccupancy: {
      low: Math.round(effectiveOcc.low * 100),
      base: Math.round(effectiveOcc.base * 100),
      high: Math.round(effectiveOcc.high * 100),
    },
    totalNights,
    totalStays: {
      low: Math.round(totalNights.low / 3), // Assume 3-night avg
      base: Math.round(totalNights.base / 3),
      high: Math.round(totalNights.high / 3),
    },
  };
}

/**
 * Calculate all operating expenses
 */
export function calculateExpenses(
  revenue: RevenueOutput,
  property: PropertyProfile,
  financing: FinancingAssumptions,
  operating: OperatingAssumptions
): ExpenseOutput {
  // Mortgage calculation
  const loanAmount = property.purchasePrice * (1 - financing.downPaymentPct / 100);
  const monthlyMortgage = calculateMortgagePayment(
    loanAmount,
    financing.interestRate,
    financing.loanTermYears
  );
  const amortization = calculateFirstYearAmortization(
    loanAmount,
    financing.interestRate,
    financing.loanTermYears
  );
  
  // Fixed expenses
  const propertyTax = Math.round(property.purchasePrice * (operating.propertyTaxRate / 100));
  const insurance = operating.insuranceAnnual;
  const utilities = operating.utilitiesMonthly * 12;
  const supplies = operating.suppliesMonthly * 12;
  
  // Variable expenses (based on revenue)
  const management = {
    low: Math.round(revenue.grossAnnual.low * (operating.managementPct / 100)),
    base: Math.round(revenue.grossAnnual.base * (operating.managementPct / 100)),
    high: Math.round(revenue.grossAnnual.high * (operating.managementPct / 100)),
  };
  
  // Cleaning (based on number of stays)
  const cleaning = {
    low: Math.round(revenue.totalStays.low * operating.cleaningCostPerStay),
    base: Math.round(revenue.totalStays.base * operating.cleaningCostPerStay),
    high: Math.round(revenue.totalStays.high * operating.cleaningCostPerStay),
  };
  
  // CapEx reserve
  const capexReserve = {
    low: Math.round(revenue.grossAnnual.low * (operating.capexReservePct / 100)),
    base: Math.round(revenue.grossAnnual.base * (operating.capexReservePct / 100)),
    high: Math.round(revenue.grossAnnual.high * (operating.capexReservePct / 100)),
  };
  
  // Total expenses
  const fixedExpenses = propertyTax + insurance + utilities + supplies;
  const totalAnnual = {
    low: fixedExpenses + management.low + cleaning.low + capexReserve.low,
    base: fixedExpenses + management.base + cleaning.base + capexReserve.base,
    high: fixedExpenses + management.high + cleaning.high + capexReserve.high,
  };
  
  return {
    mortgage: {
      monthlyPayment: monthlyMortgage,
      annualPayment: monthlyMortgage * 12,
      principalYear1: amortization.principal,
      interestYear1: amortization.interest,
    },
    propertyTax,
    insurance,
    management,
    cleaning,
    utilities,
    capexReserve,
    supplies,
    totalAnnual,
    totalMonthly: {
      low: Math.round(totalAnnual.low / 12),
      base: Math.round(totalAnnual.base / 12),
      high: Math.round(totalAnnual.high / 12),
    },
  };
}

/**
 * Calculate investment returns
 */
export function calculateReturns(
  revenue: RevenueOutput,
  expenses: ExpenseOutput,
  property: PropertyProfile,
  financing: FinancingAssumptions
): ReturnOutput {
  // Total cash invested
  const downPayment = property.purchasePrice * (financing.downPaymentPct / 100);
  const closingCosts = property.purchasePrice * (financing.closingCostsPct / 100);
  const totalCashInvested = downPayment + closingCosts;
  
  // NOI (before debt service)
  const noi = {
    low: revenue.grossAnnual.low - expenses.totalAnnual.high, // Conservative
    base: revenue.grossAnnual.base - expenses.totalAnnual.base,
    high: revenue.grossAnnual.high - expenses.totalAnnual.low,
  };
  
  // Cash flow (after debt service)
  const annualDebtService = expenses.mortgage.annualPayment;
  const cashFlow = {
    low: noi.low - annualDebtService,
    base: noi.base - annualDebtService,
    high: noi.high - annualDebtService,
  };
  
  // Cash-on-Cash return
  const cashOnCash = {
    low: totalCashInvested > 0 ? Math.round((cashFlow.low / totalCashInvested) * 1000) / 10 : 0,
    base: totalCashInvested > 0 ? Math.round((cashFlow.base / totalCashInvested) * 1000) / 10 : 0,
    high: totalCashInvested > 0 ? Math.round((cashFlow.high / totalCashInvested) * 1000) / 10 : 0,
  };
  
  // Cap rate
  const capRate = {
    low: property.purchasePrice > 0 ? Math.round((noi.low / property.purchasePrice) * 1000) / 10 : 0,
    base: property.purchasePrice > 0 ? Math.round((noi.base / property.purchasePrice) * 1000) / 10 : 0,
    high: property.purchasePrice > 0 ? Math.round((noi.high / property.purchasePrice) * 1000) / 10 : 0,
  };
  
  // Break-even occupancy (what occupancy is needed to cover all expenses + debt service)
  const totalAnnualCosts = expenses.totalAnnual.base + annualDebtService;
  const revenuePerNight = revenue.effectiveADR.base;
  const breakEvenNights = revenuePerNight > 0 ? totalAnnualCosts / revenuePerNight : 365;
  const breakEvenOccupancy = Math.min(Math.round((breakEvenNights / 365) * 100), 100);
  
  return {
    noi,
    cashFlow: {
      low: Math.round(cashFlow.low / 12),
      base: Math.round(cashFlow.base / 12),
      high: Math.round(cashFlow.high / 12),
    },
    cashOnCash,
    capRate,
    totalCashInvested: Math.round(totalCashInvested),
    breakEvenOccupancy,
  };
}

/**
 * Calculate LTR returns for comparison
 */
export function calculateLTR(
  ltr: LTRComparison,
  property: PropertyProfile,
  financing: FinancingAssumptions
): LTROutput {
  const grossAnnual = ltr.monthlyRent * 12;
  const effectiveGross = grossAnnual * (1 - ltr.vacancyPct / 100);
  
  // Expenses
  const repairs = effectiveGross * (ltr.repairsPct / 100);
  const management = effectiveGross * (ltr.managementPct / 100);
  const propertyTax = property.purchasePrice * 0.012; // 1.2% default
  const insurance = 2000; // Default
  const utilities = ltr.utilitiesMonthly * 12;
  const totalExpenses = repairs + management + propertyTax + insurance + utilities;
  
  const noi = effectiveGross - totalExpenses;
  
  // Debt service
  const loanAmount = property.purchasePrice * (1 - financing.downPaymentPct / 100);
  const monthlyMortgage = calculateMortgagePayment(
    loanAmount,
    financing.interestRate,
    financing.loanTermYears
  );
  const annualDebtService = monthlyMortgage * 12;
  
  const cashFlow = noi - annualDebtService;
  
  // Cash invested
  const downPayment = property.purchasePrice * (financing.downPaymentPct / 100);
  const closingCosts = property.purchasePrice * (financing.closingCostsPct / 100);
  const totalCashInvested = downPayment + closingCosts;
  
  const cashOnCash = totalCashInvested > 0 
    ? Math.round((cashFlow / totalCashInvested) * 1000) / 10 
    : 0;
  
  return {
    grossAnnual,
    effectiveGross: Math.round(effectiveGross),
    expenses: Math.round(totalExpenses),
    noi: Math.round(noi),
    cashFlow: Math.round(cashFlow / 12), // Monthly
    cashOnCash,
  };
}

/**
 * Compare STR vs LTR
 */
export function compareStrVsLtr(
  strReturns: ReturnOutput,
  ltrOutput: LTROutput,
  strRevenue: RevenueOutput
): ComparisonOutput {
  // Cash flow difference (monthly)
  const strVsLtrCashFlow = {
    low: strReturns.cashFlow.low - ltrOutput.cashFlow,
    base: strReturns.cashFlow.base - ltrOutput.cashFlow,
    high: strReturns.cashFlow.high - ltrOutput.cashFlow,
  };
  
  // CoC difference
  const strVsLtrCoC = {
    low: strReturns.cashOnCash.low - ltrOutput.cashOnCash,
    base: strReturns.cashOnCash.base - ltrOutput.cashOnCash,
    high: strReturns.cashOnCash.high - ltrOutput.cashOnCash,
  };
  
  // Break-even: what STR occupancy matches LTR profit?
  // LTR annual cash flow = STR annual cash flow at X% occupancy
  const ltrAnnualCashFlow = ltrOutput.cashFlow * 12;
  const strRevenuePerOccPct = strRevenue.grossAnnual.base / strRevenue.effectiveOccupancy.base;
  // Simplified: assume linear relationship
  const breakEvenOccupancy = strReturns.breakEvenOccupancy;
  
  // Recommendation
  let recommendation: 'str' | 'ltr' | 'either' = 'either';
  if (strVsLtrCoC.base > 5) {
    recommendation = 'str';
  } else if (strVsLtrCoC.base < -5) {
    recommendation = 'ltr';
  }
  
  return {
    strVsLtrCashFlow,
    strVsLtrCoC,
    breakEvenOccupancy,
    recommendation,
  };
}

/**
 * Calculate confidence score based on data quality
 */
export function calculateConfidence(
  benchmark: MarketBenchmark,
  userInputCount: number,
  totalInputs: number
): ConfidenceScore {
  const factors: ConfidenceScore['factors'] = [];
  let score = 50; // Base score
  
  // Data source quality
  if (benchmark.source === 'city_data') {
    score += 25;
    factors.push({
      name: 'Market Data Available',
      impact: 'positive',
      description: `Using real market data from ${benchmark.marketName}`,
    });
  } else if (benchmark.source === 'state_fallback') {
    score += 10;
    factors.push({
      name: 'State-Level Estimates',
      impact: 'neutral',
      description: 'Using state average data. City-specific data not available.',
    });
  } else {
    factors.push({
      name: 'User Estimates',
      impact: 'negative',
      description: 'Based on your manual inputs. Verify with local research.',
    });
  }
  
  // Sample size (if available)
  if (benchmark.sampleSize) {
    if (benchmark.sampleSize >= 50) {
      score += 15;
      factors.push({
        name: 'Large Sample Size',
        impact: 'positive',
        description: `Based on ${benchmark.sampleSize}+ comparable properties`,
      });
    } else if (benchmark.sampleSize >= 20) {
      score += 5;
      factors.push({
        name: 'Moderate Sample Size',
        impact: 'neutral',
        description: `Based on ${benchmark.sampleSize} comparable properties`,
      });
    } else {
      score -= 10;
      factors.push({
        name: 'Limited Data',
        impact: 'negative',
        description: 'Few comparable properties in this area',
      });
    }
  }
  
  // User input completeness
  const inputCompleteness = userInputCount / totalInputs;
  if (inputCompleteness >= 0.8) {
    score += 10;
    factors.push({
      name: 'Complete Inputs',
      impact: 'positive',
      description: 'You provided detailed property information',
    });
  } else if (inputCompleteness < 0.5) {
    score -= 10;
    factors.push({
      name: 'Incomplete Inputs',
      impact: 'negative',
      description: 'Consider adding more property details for accuracy',
    });
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Determine level
  let level: 'high' | 'medium' | 'low' = 'medium';
  if (score >= 70) level = 'high';
  else if (score < 40) level = 'low';
  
  return { score, level, factors };
}

/**
 * Main calculation function - orchestrates all calculations
 */
export function calculateDeal(
  inputs: DealInputs,
  ltr?: LTRComparison
): DealOutput {
  // Apply user adjustments to benchmark
  const adjustedADR = applyAdjustments(inputs.benchmark.adr, inputs.adrAdjustment);
  const adjustedOccupancy = applyAdjustments(inputs.benchmark.occupancy, inputs.occupancyAdjustment);
  
  // Calculate revenue
  const revenue = calculateRevenue(adjustedADR, adjustedOccupancy, inputs.seasonality);
  
  // Calculate expenses
  const expenses = calculateExpenses(revenue, inputs.property, inputs.financing, inputs.operating);
  
  // Calculate returns
  const returns = calculateReturns(revenue, expenses, inputs.property, inputs.financing);
  
  // Calculate confidence
  const confidence = calculateConfidence(inputs.benchmark, 6, 10);
  
  // Optional LTR comparison
  let ltrOutput: LTROutput | undefined;
  let comparison: ComparisonOutput | undefined;
  
  if (ltr && ltr.monthlyRent > 0) {
    ltrOutput = calculateLTR(ltr, inputs.property, inputs.financing);
    comparison = compareStrVsLtr(returns, ltrOutput, revenue);
  }
  
  return {
    revenue,
    expenses,
    returns,
    ltr: ltrOutput,
    comparison,
    confidence,
  };
}

/**
 * Estimate LTR rent from STR data (rough estimate)
 */
export function estimateLTRRent(strMonthlyRevenue: number): number {
  // LTR typically generates 40-60% of STR gross revenue
  return Math.round(strMonthlyRevenue * 0.5);
}

/**
 * Get bedroom-adjusted ADR multiplier
 */
export function getBedroomMultiplier(bedrooms: number): number {
  const multipliers: Record<number, number> = {
    1: 0.55,
    2: 0.75,
    3: 1.0,
    4: 1.25,
    5: 1.45,
    6: 1.65,
  };
  return multipliers[Math.min(bedrooms, 6)] || 1.0;
}
