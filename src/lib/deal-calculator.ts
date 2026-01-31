/**
 * Edge Deal Calculator - Calculation Engine
 * 
 * Matches Teeco STR Deal Analyzer spreadsheet logic.
 * All formulas verified for accuracy.
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
  squareFeet: number;
  yearBuilt?: number;
}

export interface MarketBenchmark {
  adr: Range;           // Average Daily Rate
  occupancy: Range;     // Occupancy rate (0-100)
  source: 'city_data' | 'state_fallback' | 'user_estimate';
  marketName: string;
  sampleSize?: number;
}

export interface FinancingInputs {
  downPaymentPct: number;      // 10-100%
  interestRate: number;        // Annual rate (e.g., 7.0)
  loanTermYears: number;       // 15 or 30
  closingCostsPct: number;     // Typically 2-5%
}

// NEW: Startup costs matching spreadsheet
export interface StartupCosts {
  renoRehab: number;           // Reno (Rehab, Design, Setup)
  furnishings: number;         // Furnishings ($15-20/sq ft)
  amenities: number;           // Amenities budget
  holdingCosts: number;        // Holding costs during setup
  legal: number;               // Legal fees
}

// NEW: Detailed expenses matching spreadsheet (15+ line items)
export interface DetailedExpenses {
  // Utilities
  electric: number;            // Monthly
  water: number;               // Monthly
  gas: number;                 // Monthly
  trash: number;               // Monthly
  internet: number;            // Monthly
  
  // Property
  propertyTaxAnnual: number;   // Annual (auto-estimate 1.5% of price)
  insuranceAnnual: number;     // Annual
  
  // Operations
  lawnCare: number;            // Monthly
  houseSupplies: number;       // Monthly
  pestControl: number;         // Monthly
  rentalSoftware: number;      // Monthly
  businessLicense: number;     // Annual
  
  // Variable
  managementPct: number;       // % of gross revenue
  cleaningPerStay: number;     // Per turnover (often passed to guest)
  capexReservePct: number;     // 5% recommended
  
  // OTA Fees (if not passed to guest)
  otaFeesPct: number;          // Airbnb takes ~3% from host
}

export interface SeasonalityProfile {
  type: 'year_round' | 'summer_peak' | 'winter_peak' | 'custom';
  monthlyMultipliers?: number[];
}

export interface LTRComparison {
  monthlyRent: number;
  vacancyPct: number;
  repairsPct: number;
  managementPct: number;
  utilitiesMonthly: number;
}

// NEW: BRRR Analysis inputs
export interface BRRRInputs {
  yearsToRefi: number;
  maxLTV: number;              // 70-80% typical
  estimatedARV: number;        // After Repair Value
  refiClosingCostsPct: number; // 2-5%
}

export interface DealInputs {
  property: PropertyProfile;
  benchmark: MarketBenchmark;
  financing: FinancingInputs;
  startup: StartupCosts;
  expenses: DetailedExpenses;
  seasonality: SeasonalityProfile;
  adrAdjustment: number;
  occupancyAdjustment: number;
  avgStayLength: number;       // Default 3 nights
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface MortgageOutput {
  loanAmount: number;
  monthlyPI: number;           // Principal + Interest
  monthlyPMI: number;          // Private Mortgage Insurance (if <20% down)
  totalMonthlyDebt: number;    // P&I + PMI
  annualDebtService: number;
}

export interface TotalCashToClose {
  downPayment: number;
  closingCosts: number;
  renoRehab: number;
  furnishings: number;
  amenities: number;
  holdingCosts: number;
  legal: number;
  total: number;
}

export interface ExpenseBreakdown {
  // Fixed Monthly
  electric: number;
  water: number;
  gas: number;
  trash: number;
  internet: number;
  lawnCare: number;
  houseSupplies: number;
  pestControl: number;
  rentalSoftware: number;
  
  // Fixed Annual
  propertyTax: number;
  insurance: number;
  businessLicense: number;
  
  // Variable (based on revenue)
  management: Range;
  cleaning: Range;
  capexReserve: Range;
  otaFees: Range;
  
  // Totals
  fixedMonthly: number;
  fixedAnnual: number;
  variableAnnual: Range;
  totalOperatingAnnual: Range;
  totalOperatingMonthly: Range;
}

export interface RevenueOutput {
  dailyRate: Range;
  occupancyPct: Range;
  nightsBooked: Range;
  totalStays: Range;
  grossAnnual: Range;
  grossMonthly: Range;
}

export interface ReturnMetrics {
  noi: Range;                  // Net Operating Income (before debt)
  cashFlowMonthly: Range;      // After debt service
  cashFlowAnnual: Range;
  cashOnCash: Range;           // Annual return on cash invested
  capRate: Range;              // NOI / Purchase Price
  paybackMonths: Range;        // Months to recover investment
  breakEvenOccupancy: number;  // Occupancy needed to break even
}

export interface LTROutput {
  grossAnnual: number;
  effectiveGross: number;
  totalExpenses: number;
  noi: number;
  cashFlowMonthly: number;
  cashOnCash: number;
}

export interface ComparisonOutput {
  strCashFlowMonthly: Range;
  ltrCashFlowMonthly: number;
  difference: Range;           // STR - LTR
  cocDifference: Range;
  winner: 'str' | 'ltr' | 'tie';
  breakEvenOccupancy: number;
}

export interface BRRROutput {
  initialLoan: number;
  newLoanAmount: number;
  closingCosts: number;
  cashOut: number;             // Can be negative
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ConfidenceScore {
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  factors: string[];
}

export interface DealOutput {
  mortgage: MortgageOutput;
  cashToClose: TotalCashToClose;
  revenue: RevenueOutput;
  expenses: ExpenseBreakdown;
  returns: ReturnMetrics;
  ltr?: LTROutput;
  comparison?: ComparisonOutput;
  brrr?: BRRROutput;
  confidence: ConfidenceScore;
  warnings: ValidationWarning[];
}

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

export const SEASONALITY_PRESETS: Record<string, number[]> = {
  year_round: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  summer_peak: [0.7, 0.7, 0.8, 0.9, 1.1, 1.3, 1.4, 1.4, 1.1, 0.9, 0.7, 0.7],
  winter_peak: [1.3, 1.2, 1.1, 0.8, 0.7, 0.7, 0.8, 0.8, 0.8, 0.9, 1.1, 1.3],
};

export const DEFAULT_FINANCING: FinancingInputs = {
  downPaymentPct: 20,
  interestRate: 7.0,
  loanTermYears: 30,
  closingCostsPct: 3,
};

export const DEFAULT_STARTUP: StartupCosts = {
  renoRehab: 15000,
  furnishings: 0,        // Will be calculated from sq ft
  amenities: 5000,
  holdingCosts: 3000,
  legal: 1000,
};

export const DEFAULT_EXPENSES: DetailedExpenses = {
  electric: 100,
  water: 60,
  gas: 30,
  trash: 25,
  internet: 60,
  propertyTaxAnnual: 0,  // Will be calculated from price
  insuranceAnnual: 2000,
  lawnCare: 50,
  houseSupplies: 50,
  pestControl: 40,
  rentalSoftware: 20,
  businessLicense: 100,
  managementPct: 0,      // Self-managed default
  cleaningPerStay: 150,
  capexReservePct: 5,
  otaFeesPct: 3,
};

export const DEFAULT_LTR: LTRComparison = {
  monthlyRent: 0,
  vacancyPct: 5,
  repairsPct: 5,
  managementPct: 8,
  utilitiesMonthly: 0,
};

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate monthly mortgage payment (P&I)
 * Formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMortgagePI(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);
  
  const r = annualRate / 100 / 12;  // Monthly rate
  const n = termYears * 12;          // Total payments
  
  const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  
  return Math.round(payment * 100) / 100;
}

/**
 * Calculate PMI (Private Mortgage Insurance)
 * Required when down payment < 20%
 * Typically 0.5% - 1% of loan amount annually
 */
export function calculatePMI(
  loanAmount: number,
  downPaymentPct: number
): number {
  if (downPaymentPct >= 20) return 0;
  
  // PMI rate increases as down payment decreases
  let pmiRate = 0.005; // 0.5% base
  if (downPaymentPct < 15) pmiRate = 0.007;
  if (downPaymentPct < 10) pmiRate = 0.01;
  
  const annualPMI = loanAmount * pmiRate;
  return Math.round(annualPMI / 12);
}

/**
 * Calculate full mortgage details
 */
export function calculateMortgage(
  purchasePrice: number,
  financing: FinancingInputs
): MortgageOutput {
  const downPayment = purchasePrice * (financing.downPaymentPct / 100);
  const loanAmount = purchasePrice - downPayment;
  
  const monthlyPI = calculateMortgagePI(
    loanAmount,
    financing.interestRate,
    financing.loanTermYears
  );
  
  const monthlyPMI = calculatePMI(loanAmount, financing.downPaymentPct);
  const totalMonthlyDebt = monthlyPI + monthlyPMI;
  
  return {
    loanAmount: Math.round(loanAmount),
    monthlyPI,
    monthlyPMI,
    totalMonthlyDebt,
    annualDebtService: Math.round(totalMonthlyDebt * 12),
  };
}

/**
 * Calculate Total Cash to Close (matches spreadsheet)
 */
export function calculateCashToClose(
  purchasePrice: number,
  financing: FinancingInputs,
  startup: StartupCosts,
  squareFeet: number
): TotalCashToClose {
  const downPayment = purchasePrice * (financing.downPaymentPct / 100);
  const closingCosts = purchasePrice * (financing.closingCostsPct / 100);
  
  // Furnishings: use provided value or estimate at $15/sq ft
  const furnishings = startup.furnishings > 0 
    ? startup.furnishings 
    : squareFeet * 15;
  
  const total = downPayment + closingCosts + startup.renoRehab + 
                furnishings + startup.amenities + startup.holdingCosts + startup.legal;
  
  return {
    downPayment: Math.round(downPayment),
    closingCosts: Math.round(closingCosts),
    renoRehab: startup.renoRehab,
    furnishings: Math.round(furnishings),
    amenities: startup.amenities,
    holdingCosts: startup.holdingCosts,
    legal: startup.legal,
    total: Math.round(total),
  };
}

/**
 * Calculate revenue with ranges
 */
export function calculateRevenue(
  adr: Range,
  occupancy: Range,
  avgStayLength: number,
  seasonality: SeasonalityProfile
): RevenueOutput {
  const multipliers = seasonality.type === 'custom' && seasonality.monthlyMultipliers
    ? seasonality.monthlyMultipliers
    : SEASONALITY_PRESETS[seasonality.type] || SEASONALITY_PRESETS.year_round;
  
  const avgSeasonality = multipliers.reduce((a, b) => a + b, 0) / 12;
  
  // Cap occupancy at 95%
  const cappedOcc = {
    low: Math.min(occupancy.low, 95) / 100,
    base: Math.min(occupancy.base, 95) / 100,
    high: Math.min(occupancy.high, 95) / 100,
  };
  
  const nightsBooked = {
    low: Math.round(365 * cappedOcc.low),
    base: Math.round(365 * cappedOcc.base),
    high: Math.round(365 * cappedOcc.high),
  };
  
  const totalStays = {
    low: Math.round(nightsBooked.low / avgStayLength),
    base: Math.round(nightsBooked.base / avgStayLength),
    high: Math.round(nightsBooked.high / avgStayLength),
  };
  
  // Gross = ADR × nights × seasonality
  const grossAnnual = {
    low: Math.round(adr.low * nightsBooked.low * avgSeasonality),
    base: Math.round(adr.base * nightsBooked.base * avgSeasonality),
    high: Math.round(adr.high * nightsBooked.high * avgSeasonality),
  };
  
  return {
    dailyRate: adr,
    occupancyPct: {
      low: Math.round(cappedOcc.low * 100),
      base: Math.round(cappedOcc.base * 100),
      high: Math.round(cappedOcc.high * 100),
    },
    nightsBooked,
    totalStays,
    grossAnnual,
    grossMonthly: {
      low: Math.round(grossAnnual.low / 12),
      base: Math.round(grossAnnual.base / 12),
      high: Math.round(grossAnnual.high / 12),
    },
  };
}

/**
 * Calculate detailed expense breakdown (matches spreadsheet)
 */
export function calculateExpenses(
  revenue: RevenueOutput,
  purchasePrice: number,
  expenses: DetailedExpenses
): ExpenseBreakdown {
  // Fixed monthly expenses
  const fixedMonthly = 
    expenses.electric +
    expenses.water +
    expenses.gas +
    expenses.trash +
    expenses.internet +
    expenses.lawnCare +
    expenses.houseSupplies +
    expenses.pestControl +
    expenses.rentalSoftware;
  
  // Property tax: use provided or estimate at 1.5% of price
  const propertyTax = expenses.propertyTaxAnnual > 0
    ? expenses.propertyTaxAnnual
    : purchasePrice * 0.015;
  
  // Fixed annual
  const fixedAnnual = propertyTax + expenses.insuranceAnnual + expenses.businessLicense;
  
  // Variable expenses (based on revenue)
  const management = {
    low: Math.round(revenue.grossAnnual.low * (expenses.managementPct / 100)),
    base: Math.round(revenue.grossAnnual.base * (expenses.managementPct / 100)),
    high: Math.round(revenue.grossAnnual.high * (expenses.managementPct / 100)),
  };
  
  const cleaning = {
    low: Math.round(revenue.totalStays.low * expenses.cleaningPerStay),
    base: Math.round(revenue.totalStays.base * expenses.cleaningPerStay),
    high: Math.round(revenue.totalStays.high * expenses.cleaningPerStay),
  };
  
  const capexReserve = {
    low: Math.round(revenue.grossAnnual.low * (expenses.capexReservePct / 100)),
    base: Math.round(revenue.grossAnnual.base * (expenses.capexReservePct / 100)),
    high: Math.round(revenue.grossAnnual.high * (expenses.capexReservePct / 100)),
  };
  
  const otaFees = {
    low: Math.round(revenue.grossAnnual.low * (expenses.otaFeesPct / 100)),
    base: Math.round(revenue.grossAnnual.base * (expenses.otaFeesPct / 100)),
    high: Math.round(revenue.grossAnnual.high * (expenses.otaFeesPct / 100)),
  };
  
  // Variable annual totals
  const variableAnnual = {
    low: management.low + cleaning.low + capexReserve.low + otaFees.low,
    base: management.base + cleaning.base + capexReserve.base + otaFees.base,
    high: management.high + cleaning.high + capexReserve.high + otaFees.high,
  };
  
  // Total operating (excluding debt service)
  const totalFixed = (fixedMonthly * 12) + fixedAnnual;
  const totalOperatingAnnual = {
    low: totalFixed + variableAnnual.low,
    base: totalFixed + variableAnnual.base,
    high: totalFixed + variableAnnual.high,
  };
  
  return {
    electric: expenses.electric,
    water: expenses.water,
    gas: expenses.gas,
    trash: expenses.trash,
    internet: expenses.internet,
    lawnCare: expenses.lawnCare,
    houseSupplies: expenses.houseSupplies,
    pestControl: expenses.pestControl,
    rentalSoftware: expenses.rentalSoftware,
    propertyTax: Math.round(propertyTax),
    insurance: expenses.insuranceAnnual,
    businessLicense: expenses.businessLicense,
    management,
    cleaning,
    capexReserve,
    otaFees,
    fixedMonthly: Math.round(fixedMonthly),
    fixedAnnual: Math.round(fixedAnnual),
    variableAnnual,
    totalOperatingAnnual,
    totalOperatingMonthly: {
      low: Math.round(totalOperatingAnnual.low / 12),
      base: Math.round(totalOperatingAnnual.base / 12),
      high: Math.round(totalOperatingAnnual.high / 12),
    },
  };
}

/**
 * Calculate return metrics (matches spreadsheet formulas)
 */
export function calculateReturns(
  revenue: RevenueOutput,
  expenses: ExpenseBreakdown,
  mortgage: MortgageOutput,
  cashToClose: TotalCashToClose,
  purchasePrice: number
): ReturnMetrics {
  // NOI = Gross Revenue - Operating Expenses (before debt)
  const noi = {
    low: revenue.grossAnnual.low - expenses.totalOperatingAnnual.high,
    base: revenue.grossAnnual.base - expenses.totalOperatingAnnual.base,
    high: revenue.grossAnnual.high - expenses.totalOperatingAnnual.low,
  };
  
  // Cash Flow = NOI - Debt Service
  const cashFlowAnnual = {
    low: noi.low - mortgage.annualDebtService,
    base: noi.base - mortgage.annualDebtService,
    high: noi.high - mortgage.annualDebtService,
  };
  
  const cashFlowMonthly = {
    low: Math.round(cashFlowAnnual.low / 12),
    base: Math.round(cashFlowAnnual.base / 12),
    high: Math.round(cashFlowAnnual.high / 12),
  };
  
  // Cash-on-Cash = Annual Cash Flow / Total Cash Invested
  const totalCash = cashToClose.total;
  const cashOnCash = {
    low: totalCash > 0 ? Math.round((cashFlowAnnual.low / totalCash) * 1000) / 10 : 0,
    base: totalCash > 0 ? Math.round((cashFlowAnnual.base / totalCash) * 1000) / 10 : 0,
    high: totalCash > 0 ? Math.round((cashFlowAnnual.high / totalCash) * 1000) / 10 : 0,
  };
  
  // Cap Rate = NOI / Purchase Price
  const capRate = {
    low: purchasePrice > 0 ? Math.round((noi.low / purchasePrice) * 1000) / 10 : 0,
    base: purchasePrice > 0 ? Math.round((noi.base / purchasePrice) * 1000) / 10 : 0,
    high: purchasePrice > 0 ? Math.round((noi.high / purchasePrice) * 1000) / 10 : 0,
  };
  
  // Payback = Total Cash / Monthly Cash Flow
  const paybackMonths = {
    low: cashFlowMonthly.high > 0 ? Math.round(totalCash / cashFlowMonthly.high) : 999,
    base: cashFlowMonthly.base > 0 ? Math.round(totalCash / cashFlowMonthly.base) : 999,
    high: cashFlowMonthly.low > 0 ? Math.round(totalCash / cashFlowMonthly.low) : 999,
  };
  
  // Break-even occupancy
  const totalCostsAnnual = expenses.totalOperatingAnnual.base + mortgage.annualDebtService;
  const revenuePerNight = revenue.dailyRate.base;
  const breakEvenNights = revenuePerNight > 0 ? totalCostsAnnual / revenuePerNight : 365;
  const breakEvenOccupancy = Math.min(Math.round((breakEvenNights / 365) * 100), 100);
  
  return {
    noi,
    cashFlowMonthly,
    cashFlowAnnual,
    cashOnCash,
    capRate,
    paybackMonths,
    breakEvenOccupancy,
  };
}

/**
 * Calculate LTR comparison
 */
export function calculateLTR(
  ltr: LTRComparison,
  purchasePrice: number,
  mortgage: MortgageOutput,
  cashToClose: TotalCashToClose,
  propertyTaxAnnual: number,
  insuranceAnnual: number
): LTROutput {
  const grossAnnual = ltr.monthlyRent * 12;
  const effectiveGross = grossAnnual * (1 - ltr.vacancyPct / 100);
  
  const repairs = effectiveGross * (ltr.repairsPct / 100);
  const management = effectiveGross * (ltr.managementPct / 100);
  const utilities = ltr.utilitiesMonthly * 12;
  const totalExpenses = repairs + management + propertyTaxAnnual + insuranceAnnual + utilities;
  
  const noi = effectiveGross - totalExpenses;
  const cashFlowAnnual = noi - mortgage.annualDebtService;
  const cashFlowMonthly = Math.round(cashFlowAnnual / 12);
  
  const cashOnCash = cashToClose.total > 0
    ? Math.round((cashFlowAnnual / cashToClose.total) * 1000) / 10
    : 0;
  
  return {
    grossAnnual: Math.round(grossAnnual),
    effectiveGross: Math.round(effectiveGross),
    totalExpenses: Math.round(totalExpenses),
    noi: Math.round(noi),
    cashFlowMonthly,
    cashOnCash,
  };
}

/**
 * Compare STR vs LTR
 */
export function compareStrVsLtr(
  strReturns: ReturnMetrics,
  ltr: LTROutput
): ComparisonOutput {
  const difference = {
    low: strReturns.cashFlowMonthly.low - ltr.cashFlowMonthly,
    base: strReturns.cashFlowMonthly.base - ltr.cashFlowMonthly,
    high: strReturns.cashFlowMonthly.high - ltr.cashFlowMonthly,
  };
  
  const cocDifference = {
    low: strReturns.cashOnCash.low - ltr.cashOnCash,
    base: strReturns.cashOnCash.base - ltr.cashOnCash,
    high: strReturns.cashOnCash.high - ltr.cashOnCash,
  };
  
  let winner: 'str' | 'ltr' | 'tie' = 'tie';
  if (difference.base > 100) winner = 'str';
  else if (difference.base < -100) winner = 'ltr';
  
  return {
    strCashFlowMonthly: strReturns.cashFlowMonthly,
    ltrCashFlowMonthly: ltr.cashFlowMonthly,
    difference,
    cocDifference,
    winner,
    breakEvenOccupancy: strReturns.breakEvenOccupancy,
  };
}

/**
 * Calculate BRRR (Buy, Rehab, Rent, Refinance, Repeat) analysis
 */
export function calculateBRRR(
  brrr: BRRRInputs,
  mortgage: MortgageOutput
): BRRROutput {
  const newLoanAmount = brrr.estimatedARV * (brrr.maxLTV / 100);
  const closingCosts = newLoanAmount * (brrr.refiClosingCostsPct / 100);
  const cashOut = newLoanAmount - mortgage.loanAmount - closingCosts;
  
  return {
    initialLoan: mortgage.loanAmount,
    newLoanAmount: Math.round(newLoanAmount),
    closingCosts: Math.round(closingCosts),
    cashOut: Math.round(cashOut),
  };
}

/**
 * Validate inputs and generate warnings
 */
export function validateInputs(
  purchasePrice: number,
  propertyTaxAnnual: number,
  adr: Range,
  occupancy: Range
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // Property tax validation
  const taxRate = propertyTaxAnnual / purchasePrice;
  if (taxRate > 0.03) {
    warnings.push({
      field: 'propertyTax',
      message: `Property tax rate (${(taxRate * 100).toFixed(1)}%) seems high. Typical is 1-2.5%.`,
      severity: 'warning',
    });
  }
  
  // ADR validation
  if (adr.base > 500) {
    warnings.push({
      field: 'adr',
      message: 'ADR over $500/night is unusually high. Verify with local comps.',
      severity: 'info',
    });
  }
  
  // Occupancy validation
  if (occupancy.base > 80) {
    warnings.push({
      field: 'occupancy',
      message: 'Occupancy over 80% is optimistic. Consider using conservative estimates.',
      severity: 'info',
    });
  }
  
  return warnings;
}

/**
 * Calculate confidence score
 */
export function calculateConfidence(
  benchmark: MarketBenchmark,
  hasCustomExpenses: boolean
): ConfidenceScore {
  let score = 50;
  const factors: string[] = [];
  
  if (benchmark.source === 'city_data') {
    score += 30;
    factors.push(`Using market data from ${benchmark.marketName}`);
  } else if (benchmark.source === 'state_fallback') {
    score += 15;
    factors.push('Using state-level estimates (city data not available)');
  } else {
    factors.push('Based on user-provided estimates');
  }
  
  if (benchmark.sampleSize && benchmark.sampleSize >= 50) {
    score += 10;
    factors.push(`${benchmark.sampleSize}+ comparable properties`);
  }
  
  if (hasCustomExpenses) {
    score += 10;
    factors.push('Detailed expense inputs provided');
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (score >= 70) level = 'HIGH';
  else if (score < 40) level = 'LOW';
  
  return { score, level, factors };
}

/**
 * Apply adjustments to benchmark ranges
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
 * Main calculation function
 */
export function calculateDeal(
  inputs: DealInputs,
  ltr?: LTRComparison,
  brrr?: BRRRInputs
): DealOutput {
  // Apply adjustments
  const adjustedADR = applyAdjustments(inputs.benchmark.adr, inputs.adrAdjustment);
  const adjustedOccupancy = applyAdjustments(inputs.benchmark.occupancy, inputs.occupancyAdjustment);
  
  // Calculate mortgage
  const mortgage = calculateMortgage(inputs.property.purchasePrice, inputs.financing);
  
  // Calculate cash to close
  const cashToClose = calculateCashToClose(
    inputs.property.purchasePrice,
    inputs.financing,
    inputs.startup,
    inputs.property.squareFeet
  );
  
  // Calculate revenue
  const revenue = calculateRevenue(
    adjustedADR,
    adjustedOccupancy,
    inputs.avgStayLength,
    inputs.seasonality
  );
  
  // Calculate expenses
  const expenses = calculateExpenses(
    revenue,
    inputs.property.purchasePrice,
    inputs.expenses
  );
  
  // Calculate returns
  const returns = calculateReturns(
    revenue,
    expenses,
    mortgage,
    cashToClose,
    inputs.property.purchasePrice
  );
  
  // Validate and get warnings
  const warnings = validateInputs(
    inputs.property.purchasePrice,
    expenses.propertyTax,
    adjustedADR,
    adjustedOccupancy
  );
  
  // Calculate confidence
  const hasCustomExpenses = inputs.expenses.electric !== DEFAULT_EXPENSES.electric;
  const confidence = calculateConfidence(inputs.benchmark, hasCustomExpenses);
  
  // Optional LTR comparison
  let ltrOutput: LTROutput | undefined;
  let comparison: ComparisonOutput | undefined;
  
  if (ltr && ltr.monthlyRent > 0) {
    ltrOutput = calculateLTR(
      ltr,
      inputs.property.purchasePrice,
      mortgage,
      cashToClose,
      expenses.propertyTax,
      expenses.insurance
    );
    comparison = compareStrVsLtr(returns, ltrOutput);
  }
  
  // Optional BRRR analysis
  let brrrOutput: BRRROutput | undefined;
  if (brrr && brrr.estimatedARV > 0) {
    brrrOutput = calculateBRRR(brrr, mortgage);
  }
  
  return {
    mortgage,
    cashToClose,
    revenue,
    expenses,
    returns,
    ltr: ltrOutput,
    comparison,
    brrr: brrrOutput,
    confidence,
    warnings,
  };
}

/**
 * Estimate furnishing cost from square footage
 */
export function estimateFurnishings(squareFeet: number, quality: 'budget' | 'standard' | 'premium' = 'standard'): number {
  const rates = { budget: 12, standard: 17, premium: 25 };
  return Math.round(squareFeet * rates[quality]);
}

/**
 * Estimate LTR rent from STR revenue
 */
export function estimateLTRRent(strMonthlyGross: number): number {
  return Math.round(strMonthlyGross * 0.45);
}

/**
 * Get bedroom-adjusted ADR multiplier
 */
export function getBedroomMultiplier(bedrooms: number): number {
  const multipliers: Record<number, number> = {
    1: 0.55, 2: 0.75, 3: 1.0, 4: 1.25, 5: 1.45, 6: 1.65,
  };
  return multipliers[Math.min(bedrooms, 6)] || 1.0;
}
