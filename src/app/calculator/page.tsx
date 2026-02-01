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
  strCapRate: number;
  ltrCapRate: number;
  traditionalRent: number;
  mashMeter: number;
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  nearbyListings: number;
  // Real percentile data from Mashvisor listings
  percentiles: {
    revenue: PercentileData;
    adr: PercentileData;
    occupancy: PercentileData;
    listingsAnalyzed: number;
    totalListingsInArea: number;
  } | null;
  // Comparable listings
  comparables: ComparableListing[];
  // Market trends
  revenueChange: string;
  revenueChangePercent: number;
  occupancyChange: string;
  occupancyChangePercent: number;
  // Historical data for seasonality
  historical: { year: number; month: number; occupancy: number }[];
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
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  
  // Address autocomplete
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Manual income override
  const [useCustomIncome, setUseCustomIncome] = useState(false);
  const [customAnnualIncome, setCustomAnnualIncome] = useState("");
  
  // Revenue percentile selector (average, 75th, 90th)
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
      if (address.length >= 3 && !result) {
        setIsLoadingSuggestions(true);
        try {
          const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
          const data = await response.json();
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (e) {
          console.error("Autocomplete error:", e);
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [address, result]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
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
    setTimeout(() => handleAnalyze(suggestion.display), 100);
  };

  // Analyze address
  const handleAnalyze = async (searchAddress?: string) => {
    const addressToAnalyze = searchAddress || address;
    if (!addressToAnalyze.trim()) return;

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await fetch("/api/mashvisor/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressToAnalyze, bedrooms }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || data.message || "Could not find data for this address. Try a different address.");
        setIsLoading(false);
        return;
      }

      const { property, neighborhood, percentiles, comparables, historical } = data;

      // Parse numeric values safely
      const parseNum = (val: unknown): number => {
        if (typeof val === "number") return val;
        if (typeof val === "string") return parseFloat(val) || 0;
        return 0;
      };

      // Get REAL data from Mashvisor - no fake fallbacks
      const avgAdr = parseNum(neighborhood?.adr);
      const avgOccupancy = parseNum(neighborhood?.occupancy);
      const avgMonthlyRevenue = parseNum(neighborhood?.monthlyRevenue);
      const avgAnnualRevenue = parseNum(neighborhood?.annualRevenue);
      
      // Bedroom multiplier for ADR adjustment
      const bedroomMultiplier = bedrooms <= 1 ? 0.7 : bedrooms === 2 ? 0.85 : bedrooms === 3 ? 1.0 : bedrooms === 4 ? 1.15 : 1.3;
      
      // Calculate adjusted values
      const adjustedADR = avgAdr > 0 ? Math.round(avgAdr * bedroomMultiplier) : 0;
      const occupancy = avgOccupancy > 0 ? avgOccupancy : 0;
      
      // Calculate revenue
      let annualRevenue: number;
      let monthlyRevenue: number;
      
      if (avgMonthlyRevenue > 0) {
        monthlyRevenue = Math.round(avgMonthlyRevenue * bedroomMultiplier);
        annualRevenue = monthlyRevenue * 12;
      } else if (avgAnnualRevenue > 0) {
        annualRevenue = Math.round(avgAnnualRevenue * bedroomMultiplier);
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else if (adjustedADR > 0 && occupancy > 0) {
        annualRevenue = Math.round(adjustedADR * (occupancy / 100) * 365);
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else {
        // No data available
        annualRevenue = 0;
        monthlyRevenue = 0;
      }
      
      const revPAN = adjustedADR > 0 && occupancy > 0 ? Math.round(adjustedADR * (occupancy / 100)) : 0;

      const analysisResult: AnalysisResult = {
        address: addressToAnalyze,
        city: property?.city || neighborhood?.city || "",
        state: property?.state || neighborhood?.state || "",
        neighborhood: neighborhood?.name || "Unknown",
        annualRevenue,
        monthlyRevenue,
        adr: adjustedADR,
        occupancy: Math.round(occupancy),
        revPAN,
        bedrooms: property?.bedrooms || bedrooms,
        bathrooms: property?.bathrooms || bathrooms,
        sqft: parseNum(property?.sqft),
        propertyType: property?.propertyType || "house",
        listPrice: parseNum(property?.listPrice) || parseNum(property?.lastSalePrice) || parseNum(neighborhood?.medianPrice),
        strCapRate: parseNum(neighborhood?.strCapRate),
        ltrCapRate: parseNum(neighborhood?.ltrCapRate),
        traditionalRent: parseNum(neighborhood?.traditionalRent),
        mashMeter: parseNum(neighborhood?.mashMeter),
        walkScore: parseNum(neighborhood?.walkScore),
        transitScore: parseNum(neighborhood?.transitScore),
        bikeScore: parseNum(neighborhood?.bikeScore),
        nearbyListings: parseNum(neighborhood?.listingsCount),
        // Real percentile data
        percentiles: percentiles || null,
        comparables: comparables || [],
        // Market trends
        revenueChange: neighborhood?.revenueChange || "stable",
        revenueChangePercent: parseNum(neighborhood?.revenueChangePercent),
        occupancyChange: neighborhood?.occupancyChange || "stable",
        occupancyChangePercent: parseNum(neighborhood?.occupancyChangePercent),
        // Historical data for seasonality
        historical: historical || [],
      };

      setResult(analysisResult);
      setAddress(addressToAnalyze);
      
      // Auto-fill purchase price if available
      if (analysisResult.listPrice > 0 && !purchasePrice) {
        setPurchasePrice(analysisResult.listPrice.toString());
      }
      
      setUseCustomIncome(false);
      setCustomAnnualIncome("");

      saveRecentSearch({
        address: addressToAnalyze,
        annualRevenue,
        adr: adjustedADR,
        occupancy: Math.round(occupancy),
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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get display revenue based on percentile or custom input
  const getDisplayRevenue = () => {
    if (useCustomIncome && customAnnualIncome) {
      return parseFloat(customAnnualIncome.replace(/[^0-9.]/g, "")) || 0;
    }
    
    // Use REAL percentile data from Mashvisor if available
    if (result?.percentiles?.revenue) {
      const p = result.percentiles.revenue;
      switch (revenuePercentile) {
        case "75th": return p.p75 * 12; // Monthly to annual
        case "90th": return p.p90 * 12;
        default: return p.p50 * 12; // Use median as average
      }
    }
    
    // Fallback to base revenue with multiplier
    const baseRevenue = result?.annualRevenue || 0;
    switch (revenuePercentile) {
      case "75th": return Math.round(baseRevenue * 1.25);
      case "90th": return Math.round(baseRevenue * 1.45);
      default: return baseRevenue;
    }
  };

  // Get percentile label with actual values
  const getPercentileLabel = () => {
    if (result?.percentiles?.revenue) {
      const p = result.percentiles.revenue;
      switch (revenuePercentile) {
        case "75th": return `75th Percentile (${formatCurrency(p.p75)}/mo from ${result.percentiles.listingsAnalyzed} listings)`;
        case "90th": return `90th Percentile - Top Performers (${formatCurrency(p.p90)}/mo)`;
        default: return `Market Average (${formatCurrency(p.p50)}/mo median)`;
      }
    }
    switch (revenuePercentile) {
      case "75th": return "75th Percentile (estimated +25%)";
      case "90th": return "90th Percentile (estimated +45%)";
      default: return "Market Average";
    }
  };

  // Calculate investment metrics
  const calculateInvestment = () => {
    const price = parseFloat(purchasePrice.replace(/[^0-9.]/g, "")) || 0;
    // Return partial data even if price is 0 so UI can show the calculator
    if (price === 0) {
      return {
        downPayment: 0,
        loanAmount: 0,
        monthlyMortgage: 0,
        annualPropertyTax: 0,
        annualInsurance: insuranceAnnual,
        annualManagement: 0,
        annualMaintenance: 0,
        annualVacancy: 0,
        totalAnnualExpenses: 0,
        netOperatingIncome: 0,
        cashFlow: 0,
        cashOnCashReturn: 0,
        capRate: 0,
        monthlyCashFlow: 0,
        needsPrice: true, // Flag to show "enter price" message
      };
    }

    const downPayment = price * (downPaymentPercent / 100);
    const loanAmount = price - downPayment;
    
    // Monthly mortgage payment (P&I)
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const monthlyMortgage = loanAmount > 0 ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : 0;
    
    // Annual expenses
    const annualPropertyTax = price * (propertyTaxRate / 100);
    const annualInsurance = insuranceAnnual;
    const grossRevenue = getDisplayRevenue();
    const annualManagement = grossRevenue * (managementFeePercent / 100);
    const annualMaintenance = grossRevenue * (maintenancePercent / 100);
    const annualVacancy = grossRevenue * (vacancyPercent / 100);
    
    const totalAnnualExpenses = (monthlyMortgage * 12) + annualPropertyTax + annualInsurance + annualManagement + annualMaintenance + annualVacancy;
    const netOperatingIncome = grossRevenue - annualPropertyTax - annualInsurance - annualManagement - annualMaintenance - annualVacancy;
    const cashFlow = grossRevenue - totalAnnualExpenses;
    const cashOnCashReturn = downPayment > 0 ? (cashFlow / downPayment) * 100 : 0;
    const capRate = price > 0 ? (netOperatingIncome / price) * 100 : 0;

    return {
      downPayment,
      loanAmount,
      monthlyMortgage,
      annualPropertyTax,
      annualInsurance,
      annualManagement,
      annualMaintenance,
      annualVacancy,
      totalAnnualExpenses,
      netOperatingIncome,
      cashFlow,
      cashOnCashReturn,
      capRate,
      monthlyCashFlow: cashFlow / 12,
    };
  };

  const investment = calculateInvestment();

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
          <p className="text-sm" style={{ color: "#787060" }}>
            Powered by Mashvisor • Real-time market data
          </p>
        </div>

        {/* Search Box */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Property Address</h2>
          
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
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
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
              
              {/* Suggestions dropdown - Rabbu style */}
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#787060" }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {suggestion.streetLine || suggestion.street}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {suggestion.locationLine || `${suggestion.city}, ${suggestion.state}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => handleAnalyze()}
              disabled={isLoading || !address.trim()}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: "#2b2823" }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Analyze"
              )}
            </button>
          </div>
          
          <p className="text-xs mt-2" style={{ color: "#999" }}>
            Format: 123 Main St, City, ST
          </p>

          {/* Bedroom/Bathroom Selector */}
          <div className="flex gap-6 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>Bedrooms:</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setBedrooms(num)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                      bedrooms === num 
                        ? "text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={bedrooms === num ? { backgroundColor: "#2b2823" } : {}}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>Bathrooms:</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setBathrooms(num)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                      bathrooms === num 
                        ? "text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={bathrooms === num ? { backgroundColor: "#2b2823" } : {}}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl p-4 mb-6 bg-red-50 border border-red-200">
            <p className="text-red-700">{error}</p>
            <p className="text-sm text-red-500 mt-1">Format: 123 Main St, City, ST</p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Revenue Percentile Selector */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: "#2b2823" }}>Revenue Projection</h3>
                {result.percentiles && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Based on {result.percentiles.listingsAnalyzed} real listings
                  </span>
                )}
              </div>
              
              {/* Percentile Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setRevenuePercentile("average")}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    revenuePercentile === "average"
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={revenuePercentile === "average" ? { backgroundColor: "#2b2823" } : {}}
                >
                  <div className="text-sm">Average</div>
                  {result.percentiles?.revenue && (
                    <div className="text-xs opacity-70">{formatCurrency(result.percentiles.revenue.p50)}/mo</div>
                  )}
                </button>
                <button
                  onClick={() => setRevenuePercentile("75th")}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    revenuePercentile === "75th"
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={revenuePercentile === "75th" ? { backgroundColor: "#2b2823" } : {}}
                >
                  <div className="text-sm">75th %</div>
                  {result.percentiles?.revenue && (
                    <div className="text-xs opacity-70">{formatCurrency(result.percentiles.revenue.p75)}/mo</div>
                  )}
                </button>
                <button
                  onClick={() => setRevenuePercentile("90th")}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    revenuePercentile === "90th"
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={revenuePercentile === "90th" ? { backgroundColor: "#2b2823" } : {}}
                >
                  <div className="text-sm">90th %</div>
                  {result.percentiles?.revenue && (
                    <div className="text-xs opacity-70">{formatCurrency(result.percentiles.revenue.p90)}/mo</div>
                  )}
                </button>
              </div>
              
              <p className="text-sm mb-4" style={{ color: "#787060" }}>
                {revenuePercentile === "average" && "Market average based on all active listings in this area."}
                {revenuePercentile === "75th" && "Above average listings with good amenities and reviews."}
                {revenuePercentile === "90th" && "Top performers with premium amenities, design, and 5-star reviews."}
              </p>

              {/* Revenue Display */}
              <div className="text-center py-6 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <p className="text-sm mb-1" style={{ color: "#787060" }}>Estimated Annual Revenue</p>
                <p className="text-4xl font-bold" style={{ color: "#2b2823" }}>
                  {formatCurrency(getDisplayRevenue())}
                </p>
                <p className="text-sm mt-1" style={{ color: "#787060" }}>
                  {formatCurrency(getDisplayRevenue() / 12)}/month
                </p>
                {result.revenueChange && result.revenueChangePercent !== 0 && (
                  <p className={`text-xs mt-2 ${result.revenueChange === "up" ? "text-green-600" : "text-red-600"}`}>
                    {result.revenueChange === "up" ? "↑" : "↓"} {Math.abs(result.revenueChangePercent).toFixed(1)}% vs last year
                  </p>
                )}
              </div>

              {/* Manual Income Override */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomIncome}
                    onChange={(e) => setUseCustomIncome(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: "#787060" }}>Use my own gross income estimate</span>
                </label>
                {useCustomIncome && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={customAnnualIncome}
                      onChange={(e) => setCustomAnnualIncome(e.target.value)}
                      placeholder="Enter annual gross income..."
                      className="w-full px-4 py-3 rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Market Intelligence */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>
                Market Intelligence - {result.neighborhood}, {result.city}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>Avg Nightly Rate</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.adr > 0 ? formatCurrency(result.adr) : "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>Occupancy Rate</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.occupancy > 0 ? `${result.occupancy}%` : "N/A"}
                  </p>
                  {result.occupancyChange && result.occupancyChangePercent !== 0 && (
                    <p className={`text-xs ${result.occupancyChange === "up" ? "text-green-600" : "text-red-600"}`}>
                      {result.occupancyChange === "up" ? "↑" : "↓"} {Math.abs(result.occupancyChangePercent).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>RevPAN</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.revPAN > 0 ? formatCurrency(result.revPAN) : "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>Active Listings</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.nearbyListings > 0 ? result.nearbyListings : "N/A"}
                  </p>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>STR Cap Rate</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.strCapRate > 0 ? `${result.strCapRate.toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>LTR Cap Rate</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.ltrCapRate > 0 ? `${result.ltrCapRate.toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>Traditional Rent</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.traditionalRent > 0 ? formatCurrency(result.traditionalRent) : "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs mb-1" style={{ color: "#787060" }}>Mash Meter</p>
                  <p className="text-xl font-bold" style={{ color: "#2b2823" }}>
                    {result.mashMeter > 0 ? result.mashMeter : "N/A"}
                  </p>
                </div>
              </div>

              {/* Location Scores */}
              {(result.walkScore > 0 || result.transitScore > 0 || result.bikeScore > 0) && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#f5f4f0" }}>
                    <p className="text-xs mb-1" style={{ color: "#787060" }}>Walk Score</p>
                    <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{result.walkScore || "N/A"}</p>
                  </div>
                  <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#f5f4f0" }}>
                    <p className="text-xs mb-1" style={{ color: "#787060" }}>Transit Score</p>
                    <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{result.transitScore || "N/A"}</p>
                  </div>
                  <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#f5f4f0" }}>
                    <p className="text-xs mb-1" style={{ color: "#787060" }}>Bike Score</p>
                    <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{result.bikeScore || "N/A"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Comparable Listings */}
            {result.comparables && result.comparables.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>
                  Top Performing Listings in Area
                </h3>
                <div className="space-y-3">
                  {result.comparables.slice(0, 5).map((listing, index) => (
                    <a
                      key={listing.id || index}
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 truncate">{listing.name}</p>
                          <p className="text-sm text-gray-500">
                            {listing.bedrooms} bed • {listing.bathrooms} bath • {listing.propertyType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(listing.monthlyRevenue)}/mo</p>
                          <p className="text-xs text-gray-500">{formatCurrency(listing.nightPrice)}/night • {listing.occupancy}% occ</p>
                        </div>
                      </div>
                      {listing.rating > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          ⭐ {listing.rating} ({listing.reviewsCount} reviews)
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Seasonality Chart */}
            {result.historical && result.historical.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Seasonality Trends</h3>
                <p className="text-sm text-gray-500 mb-4">Historical occupancy rates by month</p>
                <div className="flex items-end justify-between gap-1 h-40">
                  {result.historical.map((month, index) => {
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const heightPercent = Math.max(month.occupancy, 10);
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full rounded-t-md transition-all hover:opacity-80"
                          style={{ 
                            height: `${heightPercent}%`, 
                            backgroundColor: month.occupancy >= 70 ? '#22c55e' : month.occupancy >= 50 ? '#eab308' : '#ef4444',
                            minHeight: '8px'
                          }}
                          title={`${monthNames[month.month - 1]} ${month.year}: ${month.occupancy}%`}
                        />
                        <span className="text-xs mt-1" style={{ color: "#787060" }}>
                          {monthNames[month.month - 1]}
                        </span>
                        <span className="text-xs font-medium" style={{ color: "#2b2823" }}>
                          {month.occupancy}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                    <span style={{ color: "#787060" }}>High (70%+)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }}></div>
                    <span style={{ color: "#787060" }}>Medium (50-70%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                    <span style={{ color: "#787060" }}>Low (&lt;50%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Revenue Projection */}
            {result.monthlyRevenue > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Monthly Revenue Projection</h3>
                <p className="text-sm text-gray-500 mb-4">Estimated monthly revenue based on seasonal occupancy</p>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                    // Use historical data if available, otherwise use seasonal multipliers
                    const historicalMonth = result.historical?.find(h => h.month === index + 1);
                    const seasonalMultiplier = historicalMonth 
                      ? historicalMonth.occupancy / (result.occupancy || 55)
                      : [0.7, 0.75, 0.9, 1.0, 1.1, 1.2, 1.25, 1.2, 1.0, 0.9, 0.8, 0.85][index];
                    const monthlyRev = Math.round(result.monthlyRevenue * Math.min(seasonalMultiplier, 1.5));
                    return (
                      <div key={month} className="p-3 rounded-lg text-center" style={{ backgroundColor: "#f5f4f0" }}>
                        <p className="text-xs font-medium" style={{ color: "#787060" }}>{month}</p>
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
            )}

            {/* Investment Calculator */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Investment Calculator</h3>
              
              {/* Purchase Price */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>Purchase Price</label>
                <input
                  type="text"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="Enter purchase price..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200"
                />
              </div>

              {/* Down Payment */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: "#787060" }}>Down Payment</label>
                  <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{downPaymentPercent}%</span>
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

              {/* Interest Rate */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: "#787060" }}>Interest Rate</label>
                  <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{interestRate.toFixed(1)}%</span>
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

              {/* Loan Term */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>Loan Term</label>
                <div className="flex gap-2">
                  {[15, 20, 30].map((term) => (
                    <button
                      key={term}
                      onClick={() => setLoanTerm(term)}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        loanTerm === term
                          ? "text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      style={loanTerm === term ? { backgroundColor: "#2b2823" } : {}}
                    >
                      {term} years
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Tax Rate */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: "#787060" }}>Property Tax Rate</label>
                  <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{propertyTaxRate.toFixed(1)}%</span>
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

              {/* Annual Insurance */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>Annual Insurance</label>
                <input
                  type="number"
                  value={insuranceAnnual}
                  onChange={(e) => setInsuranceAnnual(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200"
                />
              </div>

              {/* Management Fee */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: "#787060" }}>Management Fee</label>
                  <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{managementFeePercent}%</span>
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

              {/* Maintenance & Vacancy */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium" style={{ color: "#787060" }}>Maintenance</label>
                    <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{maintenancePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={maintenancePercent}
                    onChange={(e) => setMaintenancePercent(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium" style={{ color: "#787060" }}>Vacancy</label>
                    <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{vacancyPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={vacancyPercent}
                    onChange={(e) => setVacancyPercent(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Investment Results */}
              {investment && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold mb-4" style={{ color: "#2b2823" }}>Investment Summary</h4>
                  
                  {/* Show message if purchase price not entered */}
                  {investment.needsPrice && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                      <p className="text-amber-700 text-sm">👆 Enter a purchase price above to see ROI calculations</p>
                    </div>
                  )}
                  
                  {/* Key Metrics - only show when price is entered */}
                  {!investment.needsPrice && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: investment.monthlyCashFlow >= 0 ? "#ecfdf5" : "#fef2f2" }}>
                      <p className="text-xs mb-1" style={{ color: "#787060" }}>Monthly Cash Flow</p>
                      <p className={`text-2xl font-bold ${investment.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(investment.monthlyCashFlow)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#f5f4f0" }}>
                      <p className="text-xs mb-1" style={{ color: "#787060" }}>Cash-on-Cash</p>
                      <p className={`text-2xl font-bold ${investment.cashOnCashReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {investment.cashOnCashReturn.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#f5f4f0" }}>
                      <p className="text-xs mb-1" style={{ color: "#787060" }}>Cap Rate</p>
                      <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>
                        {investment.capRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  )}

                  {/* Expense Breakdown - only show when price is entered */}
                  {!investment.needsPrice && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Down Payment</span>
                      <span className="font-medium">{formatCurrency(investment.downPayment)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Loan Amount</span>
                      <span className="font-medium">{formatCurrency(investment.loanAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Monthly Mortgage (P&I)</span>
                      <span className="font-medium">{formatCurrency(investment.monthlyMortgage)}</span>
                    </div>
                    <div className="border-t border-gray-100 my-2"></div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Annual Property Tax</span>
                      <span className="font-medium">{formatCurrency(investment.annualPropertyTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Annual Insurance</span>
                      <span className="font-medium">{formatCurrency(investment.annualInsurance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Annual Management</span>
                      <span className="font-medium">{formatCurrency(investment.annualManagement)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Annual Maintenance</span>
                      <span className="font-medium">{formatCurrency(investment.annualMaintenance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#787060" }}>Annual Vacancy Reserve</span>
                      <span className="font-medium">{formatCurrency(investment.annualVacancy)}</span>
                    </div>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Gross Revenue</span>
                      <span className="text-green-600">{formatCurrency(getDisplayRevenue())}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Annual Expenses</span>
                      <span className="text-red-600">-{formatCurrency(investment.totalAnnualExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
                      <span>Annual Cash Flow</span>
                      <span className={investment.cashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(investment.cashFlow)}
                      </span>
                    </div>
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* View on Airbnb Button */}
            <div className="text-center">
              <a
                href={`https://www.airbnb.com/s/${encodeURIComponent(result.city + ", " + result.state)}/homes`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#FF5A5F" }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.703c-.457.907-1.158 1.65-2.018 2.143-.86.493-1.855.754-2.876.754-1.02 0-2.016-.261-2.876-.754-.86-.493-1.561-1.236-2.018-2.143-.457-.907-.686-1.928-.686-2.953 0-1.025.229-2.046.686-2.953.457-.907 1.158-1.65 2.018-2.143.86-.493 1.855-.754 2.876-.754 1.02 0 2.016.261 2.876.754.86.493 1.561 1.236 2.018 2.143.457.907.686 1.928.686 2.953 0 1.025-.229 2.046-.686 2.953z"/>
                </svg>
                View Comparable Listings on Airbnb
              </a>
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
                    handleAnalyze(search.address);
                  }}
                  className="w-full p-3 rounded-lg text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
                >
                  <span className="text-sm truncate" style={{ color: "#2b2823" }}>{search.address}</span>
                  <span className="text-sm font-medium" style={{ color: "#787060" }}>
                    {formatCurrency(search.annualRevenue)}/yr
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
