"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface RecentSearch {
  address: string;
  annualRevenue: number;
  adr: number;
  occupancy: number;
  timestamp: number;
}

interface AddressSuggestion {
  display: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  streetLine?: string;
  locationLine?: string;
}

interface PercentileData {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface ComparableListing {
  id: number;
  name: string;
  url: string;
  image: string | null;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  nightPrice: number;
  occupancy: number;
  monthlyRevenue: number;
  annualRevenue: number;
  rating: number;
  reviewsCount: number;
  propertyType: string;
}

interface AnalysisResult {
  address: string;
  city: string;
  state: string;
  neighborhood: string;
  annualRevenue: number;
  monthlyRevenue: number;
  adr: number;
  occupancy: number;
  revPAN: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  listPrice: number;
  nearbyListings: number;
  percentiles: {
    revenue: PercentileData;
    adr: PercentileData;
    occupancy: PercentileData;
    listingsAnalyzed: number;
    totalListingsInArea: number;
  } | null;
  comparables: ComparableListing[];
  revenueChange: string;
  revenueChangePercent: number;
  occupancyChange: string;
  occupancyChangePercent: number;
  historical: { year: number; month: number; occupancy: number; adr?: number; revenue?: number }[];
  recommendedAmenities?: { name: string; boost: number; priority: string; icon: string }[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CalculatorPage() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  
  // Address autocomplete
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Manual income override
  const [useCustomIncome, setUseCustomIncome] = useState(false);
  const [customAnnualIncome, setCustomAnnualIncome] = useState("");
  
  // Revenue percentile selector
  const [revenuePercentile, setRevenuePercentile] = useState<"average" | "75th" | "90th">("average");
  
  // Investment Calculator Fields
  const [purchasePrice, setPurchasePrice] = useState("");
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(7.0);
  const [loanTerm, setLoanTerm] = useState(30);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.2);
  const [insuranceAnnual, setInsuranceAnnual] = useState(1800);
  const [managementFeePercent, setManagementFeePercent] = useState(20);
  const [maintenancePercent, setMaintenancePercent] = useState(5);
  const [vacancyPercent, setVacancyPercent] = useState(10);
  
  // Teeco Design/Setup Costs (sqft-based)
  const [includeDesignServices, setIncludeDesignServices] = useState(false);
  const [includeSetupServices, setIncludeSetupServices] = useState(false);
  const [includeFurnishings, setIncludeFurnishings] = useState(false);
  const [includeAmenities, setIncludeAmenities] = useState(false);
  const [amenitiesCost, setAmenitiesCost] = useState(11000);
  const [propertySqft, setPropertySqft] = useState(1500); // Default sqft for calculation
  const [studentDiscount, setStudentDiscount] = useState(false); // 20% discount toggle
  
  // Monthly Expenses
  const [electricMonthly, setElectricMonthly] = useState(100);
  const [waterMonthly, setWaterMonthly] = useState(80);
  const [internetMonthly, setInternetMonthly] = useState(60);
  const [lawnCareMonthly, setLawnCareMonthly] = useState(60);
  const [cleaningPerTurn, setCleaningPerTurn] = useState(150);
  const [suppliesMonthly, setSuppliesMonthly] = useState(50);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("edge_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (search: RecentSearch) => {
    const updated = [search, ...recentSearches.filter(s => s.address !== search.address)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("edge_recent_searches", JSON.stringify(updated));
  };

  // Address autocomplete with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (address.length >= 3) {
        setIsLoadingSuggestions(true);
        try {
          const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
          const data = await response.json();
          if (data.suggestions) {
            setSuggestions(data.suggestions);
            setShowSuggestions(true);
          }
        } catch (e) {
          console.error("Geocode error:", e);
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [address]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.display);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Check if form is valid for analysis
  const canAnalyze = address.trim() && bedrooms !== null && bathrooms !== null;

  // Analyze address
  const handleAnalyze = async (searchAddress?: string) => {
    const addressToAnalyze = searchAddress || address;
    if (!addressToAnalyze.trim()) return;
    
    if (bedrooms === null || bathrooms === null) {
      setError("Please select the number of bedrooms and bathrooms before analyzing.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await fetch("/api/mashvisor/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressToAnalyze, bedrooms, bathrooms }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || data.message || "Could not find data for this address. Try a different address.");
        setIsLoading(false);
        return;
      }

      const { property, neighborhood, percentiles, comparables, historical, recommendedAmenities } = data;

      const parseNum = (val: unknown): number => {
        if (typeof val === "number") return val;
        if (typeof val === "string") return parseFloat(val) || 0;
        return 0;
      };

      // Get REAL data from Mashvisor - STR only
      const avgAdr = parseNum(neighborhood?.adr);
      const avgOccupancy = parseNum(neighborhood?.occupancy);
      
      // Use percentile data if available (already filtered by bedroom count)
      // NOTE: percentiles.revenue values are ALREADY ANNUAL (calculated from monthly * 12 in API)
      let annualRevenue: number;
      let monthlyRevenue: number;
      
      if (percentiles?.revenue?.p50 > 0) {
        // p50 is ALREADY annual revenue - don't multiply by 12 again!
        annualRevenue = percentiles.revenue.p50;
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else if (parseNum(neighborhood?.annualRevenue) > 0) {
        // Use neighborhood annual revenue directly
        annualRevenue = parseNum(neighborhood?.annualRevenue);
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else if (parseNum(neighborhood?.monthlyRevenue) > 0) {
        // Fallback to neighborhood monthly revenue
        monthlyRevenue = parseNum(neighborhood?.monthlyRevenue);
        annualRevenue = monthlyRevenue * 12;
      } else if (avgAdr > 0 && avgOccupancy > 0) {
        // Calculate from ADR and occupancy (no bedroom multiplier - data should already be bedroom-specific)
        annualRevenue = Math.round(avgAdr * (avgOccupancy / 100) * 365);
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else {
        annualRevenue = 0;
        monthlyRevenue = 0;
      }
      
      const revPAN = avgAdr > 0 && avgOccupancy > 0 ? Math.round(avgAdr * (avgOccupancy / 100)) : 0;
      const sqft = parseNum(property?.sqft);

      const analysisResult: AnalysisResult = {
        address: addressToAnalyze,
        city: property?.city || neighborhood?.city || "",
        state: property?.state || neighborhood?.state || "",
        neighborhood: neighborhood?.name || "Unknown",
        annualRevenue,
        monthlyRevenue,
        adr: Math.round(avgAdr),
        occupancy: Math.round(avgOccupancy),
        revPAN,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        sqft: sqft,
        propertyType: property?.propertyType || "house",
        listPrice: parseNum(property?.listPrice) || parseNum(property?.lastSalePrice) || parseNum(neighborhood?.medianPrice),
        nearbyListings: parseNum(neighborhood?.listingsCount),
        percentiles: percentiles || null,
        comparables: comparables || [],
        revenueChange: neighborhood?.revenueChange || "stable",
        revenueChangePercent: parseNum(neighborhood?.revenueChangePercent),
        occupancyChange: neighborhood?.occupancyChange || "stable",
        occupancyChangePercent: parseNum(neighborhood?.occupancyChangePercent),
        historical: historical || [],
        recommendedAmenities: recommendedAmenities || [],
      };

      setResult(analysisResult);
      setAddress(addressToAnalyze);
      
      // Auto-fill purchase price if available
      if (analysisResult.listPrice > 0 && !purchasePrice) {
        setPurchasePrice(analysisResult.listPrice.toString());
      }
      
      // Auto-set sqft for design/setup cost calculations
      if (sqft > 0) {
        setPropertySqft(sqft);
      }
      
      setUseCustomIncome(false);
      setCustomAnnualIncome("");

      saveRecentSearch({
        address: addressToAnalyze,
        annualRevenue,
        adr: Math.round(avgAdr),
        occupancy: Math.round(avgOccupancy),
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate and download PDF report
  const downloadPDFReport = async () => {
    if (!result) return;
    
    const investment = calculateInvestment();
    const displayRevenue = getDisplayRevenue();
    const monthlyRevenue = Math.round(displayRevenue / 12);
    
    // Create a printable HTML document
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>STR Investment Analysis - ${result.address || result.neighborhood}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #2b2823; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 18px; color: #787060; margin-top: 32px; border-bottom: 2px solid #e5e3da; padding-bottom: 8px; }
    .header { text-align: center; margin-bottom: 40px; }
    .subtitle { color: #787060; font-size: 14px; }
    .highlight { background: #ecfdf5; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }
    .highlight-value { font-size: 36px; font-weight: bold; color: #22c55e; }
    .highlight-label { font-size: 14px; color: #787060; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
    .metric { background: #f5f4f0; padding: 16px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 20px; font-weight: bold; color: #2b2823; }
    .metric-label { font-size: 12px; color: #787060; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e3da; }
    .table th { background: #f5f4f0; font-weight: 600; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .footer { margin-top: 40px; padding-top: 24px; border-top: 2px solid #e5e3da; text-align: center; font-size: 12px; color: #787060; }
    .disclaimer { font-size: 11px; color: #9ca3af; margin-top: 16px; font-style: italic; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>STR Investment Analysis</h1>
    <p class="subtitle">${result.address || result.neighborhood}, ${result.city}, ${result.state}</p>
    <p class="subtitle">${result.bedrooms} Bedrooms • ${result.bathrooms} Bathrooms</p>
    <p class="subtitle">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="highlight">
    <p class="highlight-label">${revenuePercentile === 'average' ? 'Estimated Annual Revenue' : revenuePercentile === '75th' ? '75th Percentile Revenue' : '90th Percentile Revenue'}</p>
    <p class="highlight-value">${formatCurrency(displayRevenue)}</p>
    <p class="subtitle">${formatCurrency(monthlyRevenue)}/month</p>
  </div>

  <h2>Market Metrics</h2>
  <div class="grid">
    <div class="metric">
      <p class="metric-value">${formatCurrency(result.adr)}</p>
      <p class="metric-label">Avg Nightly Rate</p>
    </div>
    <div class="metric">
      <p class="metric-value">${result.occupancy}%</p>
      <p class="metric-label">Occupancy Rate</p>
    </div>
    <div class="metric">
      <p class="metric-value">${result.nearbyListings || 'N/A'}</p>
      <p class="metric-label">Active Listings</p>
    </div>
  </div>

  ${result.percentiles ? `
  <h2>Revenue Percentiles</h2>
  <div class="grid">
    <div class="metric">
      <p class="metric-value">${formatCurrency(result.percentiles.revenue.p25)}</p>
      <p class="metric-label">25th Percentile</p>
    </div>
    <div class="metric">
      <p class="metric-value">${formatCurrency(result.percentiles.revenue.p50)}</p>
      <p class="metric-label">50th Percentile (Avg)</p>
    </div>
    <div class="metric">
      <p class="metric-value">${formatCurrency(result.percentiles.revenue.p75)}</p>
      <p class="metric-label">75th Percentile</p>
    </div>
  </div>
  ` : ''}

  ${purchasePrice ? `
  <h2>Investment Analysis</h2>
  <table class="table">
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Purchase Price</td><td>${formatCurrency(parseFloat(purchasePrice))}</td></tr>
    <tr><td>Down Payment (${downPaymentPercent}%)</td><td>${formatCurrency(investment.downPayment)}</td></tr>
    <tr><td>Loan Amount</td><td>${formatCurrency(investment.loanAmount)}</td></tr>
    <tr><td>Monthly Mortgage</td><td>${formatCurrency(investment.monthlyMortgage)}</td></tr>
    <tr><td>Annual Gross Revenue</td><td class="positive">${formatCurrency(displayRevenue)}</td></tr>
    <tr><td>Total Annual Expenses</td><td class="negative">${formatCurrency(investment.totalAnnualExpenses)}</td></tr>
    <tr><td><strong>Annual Cash Flow</strong></td><td class="${investment.cashFlow >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(investment.cashFlow)}</strong></td></tr>
    <tr><td><strong>Cash-on-Cash Return</strong></td><td class="${investment.cashOnCashReturn >= 0 ? 'positive' : 'negative'}"><strong>${investment.cashOnCashReturn.toFixed(1)}%</strong></td></tr>
  </table>
  ` : ''}

  ${result.comparables && result.comparables.length > 0 ? `
  <h2>Comparable Listings (${result.comparables.length})</h2>
  <table class="table">
    <tr><th>Listing</th><th>Beds</th><th>Rate</th><th>Occ</th><th>Revenue</th></tr>
    ${result.comparables.slice(0, 10).map(c => `
    <tr>
      <td>${c.name.substring(0, 30)}${c.name.length > 30 ? '...' : ''}</td>
      <td>${c.bedrooms}</td>
      <td>${formatCurrency(c.nightPrice)}</td>
      <td>${c.occupancy}%</td>
      <td>${formatCurrency(c.annualRevenue)}/yr</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  <div class="footer">
    <p><strong>Edge by Teeco</strong> - STR Investment Analysis</p>
    <p>Data powered by Airbtics & Mashvisor</p>
    <p class="disclaimer">This report is for informational purposes only and should not be considered financial advice. Actual results may vary based on market conditions, property management, and other factors. Always conduct your own due diligence before making investment decisions.</p>
  </div>
</body>
</html>
    `;
    
    // Open print dialog with the report
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.focus();
      // Auto-trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Get display revenue based on percentile selection or custom income
  const getDisplayRevenue = () => {
    if (useCustomIncome && customAnnualIncome) {
      return parseFloat(customAnnualIncome) || 0;
    }
    
    if (!result) return 0;
    
    // Use real percentile data if available
    // NOTE: percentiles.revenue values are ALREADY ANNUAL (not monthly)
    if (result.percentiles?.revenue) {
      switch (revenuePercentile) {
        case "75th":
          return result.percentiles.revenue.p75; // Already annual, don't multiply by 12
        case "90th":
          return result.percentiles.revenue.p90; // Already annual, don't multiply by 12
        default:
          return result.percentiles.revenue.p50; // Already annual, don't multiply by 12
      }
    }
    
    // Fallback to calculated revenue with multipliers
    switch (revenuePercentile) {
      case "75th":
        return Math.round(result.annualRevenue * 1.25);
      case "90th":
        return Math.round(result.annualRevenue * 1.45);
      default:
        return result.annualRevenue;
    }
  };

  // Calculate design cost ($7/sqft with optional 20% student discount)
  const calculateDesignCost = () => {
    const baseCost = propertySqft * 7;
    return studentDiscount ? Math.round(baseCost * 0.8) : baseCost;
  };

  // Calculate setup cost ($20/sqft with optional 20% student discount)
  const calculateSetupCost = () => {
    const baseCost = propertySqft * 20;
    return studentDiscount ? Math.round(baseCost * 0.8) : baseCost;
  };

  // Calculate furnishings cost (~$15-20/sqft average)
  const calculateFurnishingsCost = () => {
    return Math.round(propertySqft * 17.5);
  };

  // Calculate startup costs (one-time)
  const calculateStartupCosts = () => {
    let total = 0;
    if (includeDesignServices) total += calculateDesignCost();
    if (includeSetupServices) total += calculateSetupCost();
    if (includeFurnishings) total += calculateFurnishingsCost();
    if (includeAmenities) total += amenitiesCost;
    return total;
  };

  // Calculate monthly operating expenses
  const calculateMonthlyExpenses = () => {
    const utilities = electricMonthly + waterMonthly + internetMonthly;
    const maintenance = lawnCareMonthly + suppliesMonthly;
    const estimatedTurnovers = result ? Math.round((result.occupancy / 100) * 30 / 3) : 8;
    const cleaning = cleaningPerTurn * estimatedTurnovers;
    return utilities + maintenance + cleaning;
  };

  // Calculate investment returns
  const calculateInvestment = () => {
    const price = parseFloat(purchasePrice) || 0;
    if (price === 0) {
      return {
        needsPrice: true,
        downPayment: 0,
        loanAmount: 0,
        monthlyMortgage: 0,
        annualPropertyTax: 0,
        annualInsurance: 0,
        annualManagement: 0,
        annualMaintenance: 0,
        annualVacancy: 0,
        monthlyOperating: 0,
        totalAnnualExpenses: 0,
        netOperatingIncome: 0,
        cashFlow: 0,
        cashOnCashReturn: 0,
        monthlyCashFlow: 0,
        startupCosts: calculateStartupCosts(),
        totalCashNeeded: 0,
      };
    }

    const downPayment = price * (downPaymentPercent / 100);
    const loanAmount = price - downPayment;
    
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const monthlyMortgage = loanAmount > 0 ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : 0;
    
    const annualPropertyTax = price * (propertyTaxRate / 100);
    const annualInsurance = insuranceAnnual;
    const grossRevenue = getDisplayRevenue();
    const annualManagement = grossRevenue * (managementFeePercent / 100);
    const annualMaintenance = grossRevenue * (maintenancePercent / 100);
    const annualVacancy = grossRevenue * (vacancyPercent / 100);
    const monthlyOperating = calculateMonthlyExpenses();
    const annualOperating = monthlyOperating * 12;
    
    const totalAnnualExpenses = (monthlyMortgage * 12) + annualPropertyTax + annualInsurance + annualManagement + annualMaintenance + annualVacancy + annualOperating;
    const netOperatingIncome = grossRevenue - annualPropertyTax - annualInsurance - annualManagement - annualMaintenance - annualVacancy - annualOperating;
    const cashFlow = grossRevenue - totalAnnualExpenses;
    
    const startupCosts = calculateStartupCosts();
    const totalCashNeeded = downPayment + startupCosts;
    const cashOnCashReturn = totalCashNeeded > 0 ? (cashFlow / totalCashNeeded) * 100 : 0;

    return {
      needsPrice: false,
      downPayment,
      loanAmount,
      monthlyMortgage,
      annualPropertyTax,
      annualInsurance,
      annualManagement,
      annualMaintenance,
      annualVacancy,
      monthlyOperating,
      totalAnnualExpenses,
      netOperatingIncome,
      cashFlow,
      cashOnCashReturn,
      monthlyCashFlow: cashFlow / 12,
      startupCosts,
      totalCashNeeded,
    };
  };

  const investment = calculateInvestment();

  // Generate seasonality data (12 months)
  const getSeasonalityData = (): { year: number; month: number; occupancy: number; revenue?: number; adr?: number }[] => {
    if (!result) return [];
    
    if (result.historical && result.historical.length >= 12) {
      return result.historical.slice(0, 12);
    }
    
    const baseOccupancy = result.occupancy || 55;
    const seasonalMultipliers = [0.7, 0.75, 0.9, 1.0, 1.1, 1.2, 1.25, 1.2, 1.0, 0.9, 0.8, 0.85];
    
    return seasonalMultipliers.map((mult, index) => ({
      year: 2025,
      month: index + 1,
      occupancy: Math.round(Math.min(baseOccupancy * mult, 95)),
      revenue: 0,
      adr: 0,
    }));
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f4f0" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ backgroundColor: "#2b2823" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#787060" }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-white font-semibold">Edge by Teeco</span>
          </Link>
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Back to Map
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium mb-2" style={{ color: "#787060" }}>STR Investment Calculator</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#2b2823" }}>
            Analyze any rental property<br />in the United States
          </h1>
          <p className="text-gray-600">Get accurate revenue estimates based on real Airbnb data</p>
        </div>

        {/* Search Box */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Property Details</h2>
          
          {/* Bedroom/Bathroom Selector - REQUIRED */}
          <div className="flex flex-wrap gap-6 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>
                Bedrooms <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setBedrooms(num)}
                    className={`w-12 h-10 rounded-lg font-medium transition-all ${
                      bedrooms === num 
                        ? "text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={bedrooms === num ? { backgroundColor: "#2b2823" } : {}}
                  >
                    {num === 6 ? "6+" : num}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>
                Bathrooms <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setBathrooms(num)}
                    className={`w-12 h-10 rounded-lg font-medium transition-all ${
                      bathrooms === num 
                        ? "text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={bathrooms === num ? { backgroundColor: "#2b2823" } : {}}
                  >
                    {num === 5 ? "5+" : num}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Validation message */}
          {(bedrooms === null || bathrooms === null) && (
            <p className="text-xs text-amber-600 mb-4">
              ⚠️ Please select bedrooms and bathrooms to get accurate revenue estimates
            </p>
          )}
          
          {/* Address Input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <svg className="w-5 h-5" style={{ color: "#787060" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAnalyze && handleAnalyze()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter property address..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 text-base transition-colors"
                style={{ 
                  borderColor: showSuggestions ? "#2b2823" : "#e5e5e5",
                  backgroundColor: "#fafafa",
                  color: "#2b2823"
                }}
              />
              
              {/* Loading indicator */}
              {isLoadingSuggestions && address.length >= 3 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0"
                    >
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#787060" }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">{suggestion.streetLine || suggestion.street}</p>
                        <p className="text-sm text-gray-500">{suggestion.locationLine || `${suggestion.city}, ${suggestion.state}`}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => handleAnalyze()}
              disabled={!canAnalyze || isLoading}
              className="px-8 py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: canAnalyze ? "#2b2823" : "#a0a0a0" }}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Analyze"
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-400 mt-2">Format: 123 Main St, City, ST</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl p-4 mb-6 bg-red-50 border border-red-200">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Revenue Estimate Card */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "#2b2823" }}>{result.neighborhood}</h3>
                  <p className="text-sm text-gray-500">{result.city}, {result.state} • {result.bedrooms} BR / {result.bathrooms} BA</p>
                </div>
                <div className="flex items-center gap-3">
                  {result.percentiles && (
                    <div className="text-right text-xs text-gray-500">
                      Based on {result.percentiles.listingsAnalyzed} {result.bedrooms}BR listings
                    </div>
                  )}
                  {/* PDF Download Button */}
                  <button
                    onClick={downloadPDFReport}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                    title="Download PDF Report"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                  </button>
                </div>
              </div>

              {/* Percentile Selector */}
              <div className="flex gap-2 mb-4">
                {(["average", "75th", "90th"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setRevenuePercentile(p)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      revenuePercentile === p
                        ? "text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={revenuePercentile === p ? { backgroundColor: "#2b2823" } : {}}
                  >
                    {p === "average" ? "Average" : p === "75th" ? "75th %" : "90th %"}
                    {result.percentiles?.revenue && (
                      <span className="block text-xs opacity-75">
                        {formatCurrency(
                          p === "average" 
                            ? result.percentiles.revenue.p50  // Already annual
                            : p === "75th" 
                              ? result.percentiles.revenue.p75  // Already annual
                              : result.percentiles.revenue.p90  // Already annual
                        )}/yr
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Revenue Display */}
              <div className="text-center py-6 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <p className="text-sm font-medium mb-1" style={{ color: "#787060" }}>
                  {revenuePercentile === "average" ? "Estimated Annual Revenue" : 
                   revenuePercentile === "75th" ? "75th Percentile Revenue" : "90th Percentile Revenue"}
                </p>
                <p className="text-4xl font-bold" style={{ color: "#22c55e" }}>
                  {formatCurrency(getDisplayRevenue())}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(getDisplayRevenue() / 12)}/month
                </p>
                {revenuePercentile !== "average" && (
                  <p className="text-xs text-gray-400 mt-2">
                    {revenuePercentile === "75th" 
                      ? "Top 25% performers with good amenities" 
                      : "Top 10% performers with premium amenities & design"}
                  </p>
                )}
              </div>

              {/* Custom Income Override */}
              <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomIncome}
                    onChange={(e) => setUseCustomIncome(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium" style={{ color: "#2b2823" }}>I know this market better - use my own estimates</span>
                </label>
                {useCustomIncome && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-gray-500">Override Mashvisor data with your market knowledge:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Annual Revenue ($)</label>
                        <input
                          type="number"
                          value={customAnnualIncome}
                          onChange={(e) => setCustomAnnualIncome(e.target.value)}
                          placeholder="e.g. 85000"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Avg Nightly Rate ($)</label>
                        <input
                          type="number"
                          id="customAdr"
                          placeholder={`Current: $${result.adr}`}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Occupancy (%)</label>
                        <input
                          type="number"
                          id="customOccupancy"
                          placeholder={`Current: ${result.occupancy}%`}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                          max="100"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-amber-600">💡 Tip: Use this if you have local market knowledge that differs from the data shown</p>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs text-gray-500">Avg Nightly Rate</p>
                  <p className="text-lg font-bold" style={{ color: "#2b2823" }}>{formatCurrency(result.adr)}</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs text-gray-500">Occupancy</p>
                  <p className="text-lg font-bold" style={{ color: "#2b2823" }}>{result.occupancy}%</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs text-gray-500">Active Listings</p>
                  <p className="text-lg font-bold" style={{ color: "#2b2823" }}>{result.nearbyListings}</p>
                </div>
              </div>
            </div>

            {/* Seasonality Revenue Chart */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Monthly Revenue Forecast</h3>
              <p className="text-sm text-gray-500 mb-4">Projected monthly income based on seasonal demand</p>
              
              {/* Bar Chart - Revenue Based */}
              <div className="flex items-end justify-between gap-1 h-48 mb-2">
                {getSeasonalityData().map((month, index) => {
                  const annualRev = getDisplayRevenue() || 0;
                  const baseMonthlyRev = annualRev / 12;
                  // Use actual revenue from historical data if available, otherwise calculate from occupancy
                  let monthlyRev = 0;
                  if (month.revenue && month.revenue > 0) {
                    // Use actual monthly revenue from Airbtics
                    monthlyRev = month.revenue;
                  } else {
                    // Calculate from occupancy multiplier
                    const baseOccupancy = result.occupancy || 55;
                    const seasonalMultiplier = baseOccupancy > 0 ? (month.occupancy / baseOccupancy) : 1;
                    monthlyRev = Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
                  }
                  monthlyRev = monthlyRev || Math.round(baseMonthlyRev);
                  
                  const maxRev = Math.max(...getSeasonalityData().map(m => {
                    if (m.revenue && m.revenue > 0) return m.revenue;
                    const baseOcc = result.occupancy || 55;
                    const mult = baseOcc > 0 ? (m.occupancy / baseOcc) : 1;
                    return Math.round(baseMonthlyRev * Math.min(Math.max(mult, 0.5), 1.5)) || baseMonthlyRev;
                  }), 1);
                  const heightPercent = maxRev > 0 ? (monthlyRev / maxRev) * 100 : 50;
                  const barColor = monthlyRev >= baseMonthlyRev * 1.1 ? '#22c55e' : monthlyRev >= baseMonthlyRev * 0.9 ? '#3b82f6' : '#f59e0b';
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <span className="text-xs font-bold mb-1" style={{ color: "#2b2823" }}>
                        ${monthlyRev >= 1000 ? Math.round(monthlyRev / 1000) + 'k' : formatCurrency(monthlyRev).replace('$', '')}
                      </span>
                      <div 
                        className="w-full rounded-t-md transition-all cursor-pointer hover:opacity-80"
                        style={{ 
                          height: `${heightPercent}%`,
                          backgroundColor: barColor,
                          minHeight: '20px'
                        }}
                        title={`${monthNames[month.month - 1]}: ${formatCurrency(monthlyRev)}`}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between gap-1">
                {monthNames.map((name, index) => (
                  <div key={index} className="flex-1 text-center">
                    <span className="text-xs text-gray-400">{name}</span>
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                  <span style={{ color: "#787060" }}>Peak Season</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span style={{ color: "#787060" }}>Average</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span style={{ color: "#787060" }}>Low Season</span>
                </div>
              </div>
            </div>

            {/* Monthly Revenue Projection */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Monthly Revenue Projection</h3>
              <p className="text-sm text-gray-500 mb-4">Estimated revenue based on seasonal occupancy</p>
              
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {getSeasonalityData().map((month, index) => {
                  const annualRev = getDisplayRevenue() || 0;
                  const baseMonthlyRev = annualRev / 12;
                  // Use actual revenue from historical data if available
                  let monthlyRev = 0;
                  if (month.revenue && month.revenue > 0) {
                    monthlyRev = month.revenue;
                  } else {
                    const baseOccupancy = result.occupancy || 55;
                    const seasonalMultiplier = baseOccupancy > 0 ? (month.occupancy / baseOccupancy) : 1;
                    monthlyRev = Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
                  }
                  monthlyRev = monthlyRev || Math.round(baseMonthlyRev);
                  return (
                    <div key={index} className="p-3 rounded-lg text-center" style={{ backgroundColor: "#f5f4f0" }}>
                      <p className="text-xs font-medium" style={{ color: "#787060" }}>{monthNames[month.month - 1]}</p>
                      <p className="text-sm font-bold" style={{ color: "#2b2823" }}>
                        {formatCurrency(monthlyRev)}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "#ecfdf5" }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: "#787060" }}>Projected Annual Total</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(getDisplayRevenue())}</span>
                </div>
              </div>
            </div>

            {/* Comparable Listings */}
            {result.comparables && result.comparables.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>
                  Top Performing {result.bedrooms === 6 ? "6+" : result.bedrooms}BR Listings in Area
                </h3>
                <div className="space-y-3">
                  {result.comparables.slice(0, 10).map((listing, index) => (
                    <a
                      key={listing.id || index}
                      href={listing.url || `https://www.airbnb.com/rooms/${listing.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">{listing.name}</p>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">
                            {listing.bedrooms} bed • {listing.bathrooms} bath • {listing.propertyType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(listing.annualRevenue || listing.monthlyRevenue * 12)}/yr</p>
                          <p className="text-xs text-gray-500">{formatCurrency(listing.nightPrice)}/night • {listing.occupancy}% occ</p>
                        </div>
                      </div>
                      {listing.rating > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          ⭐ {listing.rating.toFixed(1)} ({listing.reviewsCount} reviews)
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Amenities for 90th Percentile */}
            {result.recommendedAmenities && result.recommendedAmenities.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>
                  🎯 Amenities to Reach 90th Percentile
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Top performers in this market have these amenities. Add them to maximize your revenue.
                </p>
                <div className="space-y-2">
                  {result.recommendedAmenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        backgroundColor: amenity.priority === 'MUST HAVE' ? '#f0fdf4' : amenity.priority === 'HIGH IMPACT' ? '#fefce8' : '#f5f4f0'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{amenity.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{amenity.name}</p>
                          <p className="text-xs" style={{
                            color: amenity.priority === 'MUST HAVE' ? '#16a34a' : amenity.priority === 'HIGH IMPACT' ? '#ca8a04' : '#6b7280'
                          }}>
                            {amenity.priority}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+{amenity.boost}%</p>
                        <p className="text-xs text-gray-500">revenue boost</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Startup Costs - Teeco Services */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold" style={{ color: "#2b2823" }}>Startup Costs</h3>
                {/* Student Discount Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={studentDiscount}
                    onChange={(e) => setStudentDiscount(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-green-600">20% Student Discount</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-4">One-time setup expenses (toggle on/off)</p>
              
              {/* Property Sqft Input */}
              <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <label className="text-sm font-medium block mb-2" style={{ color: "#787060" }}>
                  Property Square Footage (for cost calculation)
                </label>
                <input
                  type="number"
                  value={propertySqft}
                  onChange={(e) => setPropertySqft(parseInt(e.target.value) || 1500)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200"
                  placeholder="Enter sqft..."
                />
                {result.sqft > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Mashvisor data: {result.sqft} sqft</p>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Design Services - $7/sqft */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeDesignServices ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeDesignServices}
                      onChange={(e) => setIncludeDesignServices(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Teeco Design Services</p>
                      <p className="text-xs text-gray-500">$7/sqft • Interior design & styling{studentDiscount && " (20% off)"}</p>
                    </div>
                  </div>
                  <p className="font-semibold" style={{ color: includeDesignServices ? "#22c55e" : "#787060" }}>
                    {formatCurrency(calculateDesignCost())}
                  </p>
                </div>
                
                {/* Setup Services - $20/sqft */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeSetupServices ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeSetupServices}
                      onChange={(e) => setIncludeSetupServices(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Teeco Setup Services</p>
                      <p className="text-xs text-gray-500">$20/sqft • Full property setup & staging{studentDiscount && " (20% off)"}</p>
                    </div>
                  </div>
                  <p className="font-semibold" style={{ color: includeSetupServices ? "#22c55e" : "#787060" }}>
                    {formatCurrency(calculateSetupCost())}
                  </p>
                </div>
                
                {/* Furnishings */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeFurnishings ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeFurnishings}
                      onChange={(e) => setIncludeFurnishings(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Furnishings</p>
                      <p className="text-xs text-gray-500">~$17.50/sqft • Furniture, decor, linens</p>
                    </div>
                  </div>
                  <p className="font-semibold" style={{ color: includeFurnishings ? "#22c55e" : "#787060" }}>
                    {formatCurrency(calculateFurnishingsCost())}
                  </p>
                </div>
                
                {/* Premium Amenities */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeAmenities ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeAmenities}
                      onChange={(e) => setIncludeAmenities(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Premium Amenities</p>
                      <p className="text-xs text-gray-500">Hot tub, fire pit, sauna, etc.</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={amenitiesCost}
                    onChange={(e) => setAmenitiesCost(parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-right"
                    disabled={!includeAmenities}
                  />
                </div>
              </div>
              
              {/* Total Startup Costs */}
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#2b2823" }}>
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Startup Costs</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(calculateStartupCosts())}</span>
                </div>
              </div>
            </div>

            {/* Monthly Operating Expenses */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Monthly Operating Expenses</h3>
              <p className="text-sm text-gray-500 mb-4">Recurring costs to run your STR</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Electric</label>
                  <input
                    type="number"
                    value={electricMonthly}
                    onChange={(e) => setElectricMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Water</label>
                  <input
                    type="number"
                    value={waterMonthly}
                    onChange={(e) => setWaterMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Internet</label>
                  <input
                    type="number"
                    value={internetMonthly}
                    onChange={(e) => setInternetMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Lawn Care</label>
                  <input
                    type="number"
                    value={lawnCareMonthly}
                    onChange={(e) => setLawnCareMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Cleaning/Turn</label>
                  <input
                    type="number"
                    value={cleaningPerTurn}
                    onChange={(e) => setCleaningPerTurn(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Supplies</label>
                  <input
                    type="number"
                    value={suppliesMonthly}
                    onChange={(e) => setSuppliesMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: "#787060" }}>Est. Monthly Operating</span>
                  <span className="text-lg font-bold" style={{ color: "#2b2823" }}>{formatCurrency(calculateMonthlyExpenses())}</span>
                </div>
              </div>
            </div>

            {/* Investment Calculator */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Investment Calculator</h3>
              <p className="text-sm text-gray-500 mb-4">Calculate your potential returns</p>
              
              {/* Purchase Price */}
              <div className="mb-4">
                <label className="text-sm font-medium block mb-2" style={{ color: "#787060" }}>Purchase Price</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="Enter purchase price..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-lg"
                />
              </div>
              
              {/* Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "#787060" }}>Down Payment</span>
                    <span className="font-medium">{downPaymentPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={downPaymentPercent}
                    onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "#787060" }}>Interest Rate</span>
                    <span className="font-medium">{interestRate.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "#787060" }}>Loan Term</span>
                    <span className="font-medium">{loanTerm} years</span>
                  </div>
                  <div className="flex gap-2">
                    {[15, 20, 30].map((term) => (
                      <button
                        key={term}
                        onClick={() => setLoanTerm(term)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                          loanTerm === term ? "text-white" : "bg-gray-100 text-gray-600"
                        }`}
                        style={loanTerm === term ? { backgroundColor: "#2b2823" } : {}}
                      >
                        {term}yr
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "#787060" }}>Property Tax Rate</span>
                    <span className="font-medium">{propertyTaxRate.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={propertyTaxRate}
                    onChange={(e) => setPropertyTaxRate(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "#787060" }}>Management Fee</span>
                    <span className="font-medium">{managementFeePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={managementFeePercent}
                    onChange={(e) => setManagementFeePercent(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: "#787060" }}>Annual Insurance</label>
                  <input
                    type="number"
                    value={insuranceAnnual}
                    onChange={(e) => setInsuranceAnnual(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
              </div>
              
              {/* Investment Results */}
              {investment.needsPrice ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-amber-700 text-sm">👆 Enter a purchase price above to see ROI calculations</p>
                </div>
              ) : (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 rounded-xl" style={{ backgroundColor: investment.monthlyCashFlow >= 0 ? "#ecfdf5" : "#fef2f2" }}>
                      <p className="text-xs text-gray-500">Monthly Cash Flow</p>
                      <p className={`text-xl font-bold ${investment.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(investment.monthlyCashFlow)}
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                      <p className="text-xs text-gray-500">Cash-on-Cash</p>
                      <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                        {investment.cashOnCashReturn.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                      <p className="text-xs text-gray-500">Total Cash Needed</p>
                      <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                        {formatCurrency(investment.totalCashNeeded)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Expense Breakdown */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                    <h4 className="font-medium mb-3" style={{ color: "#2b2823" }}>Annual Expense Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mortgage (P&I)</span>
                        <span className="font-medium">{formatCurrency(investment.monthlyMortgage * 12)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Property Tax</span>
                        <span className="font-medium">{formatCurrency(investment.annualPropertyTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Insurance</span>
                        <span className="font-medium">{formatCurrency(investment.annualInsurance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Management ({managementFeePercent}%)</span>
                        <span className="font-medium">{formatCurrency(investment.annualManagement)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Operating Expenses</span>
                        <span className="font-medium">{formatCurrency(investment.monthlyOperating * 12)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total Annual Expenses</span>
                          <span className="text-red-600">{formatCurrency(investment.totalAnnualExpenses)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Gross Revenue</span>
                        <span className="text-green-600">{formatCurrency(getDisplayRevenue())}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Annual Cash Flow</span>
                          <span className={investment.cashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(investment.cashFlow)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {!result && recentSearches.length > 0 && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Recent Searches</h3>
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setAddress(search.address);
                    if (bedrooms && bathrooms) {
                      handleAnalyze(search.address);
                    }
                  }}
                  className="w-full p-3 rounded-xl text-left hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <p className="font-medium text-gray-900 truncate">{search.address}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(search.annualRevenue)}/yr • {formatCurrency(search.adr)}/night • {search.occupancy}% occ
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
