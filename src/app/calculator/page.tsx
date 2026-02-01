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
  const [guestCount, setGuestCount] = useState<number | null>(null);
  
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
  const [miscMonthly, setMiscMonthly] = useState(0);

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

  // Save report to Saved section
  const saveReport = () => {
    if (!result) return;
    
    const investment = calculateInvestment();
    const displayRevenue = getDisplayRevenue();
    
    const report = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      address: result.address,
      city: result.city,
      state: result.state,
      bedrooms: bedrooms || result.bedrooms,
      bathrooms: bathrooms || result.bathrooms,
      guestCount: guestCount || (bedrooms || 3) * 2,
      annualRevenue: displayRevenue,
      cashFlow: investment.cashFlow,
      cashOnCash: investment.cashOnCashReturn,
      purchasePrice: parseFloat(purchasePrice) || 0,
      notes: "",
      savedAt: Date.now(),
    };
    
    const existing = JSON.parse(localStorage.getItem("savedReports") || "[]");
    // Check if already saved (by address)
    const alreadySaved = existing.some((r: { address: string }) => r.address === report.address);
    if (alreadySaved) {
      alert("This property is already saved!");
      return;
    }
    
    const updated = [report, ...existing];
    localStorage.setItem("savedReports", JSON.stringify(updated));
    alert("Report saved! View it in the Saved section.");
  };

  // Email report
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  
  const sendEmailReport = async () => {
    if (!emailAddress || !result) return;
    
    setEmailSending(true);
    try {
      // First generate the PDF
      downloadPDFReport();
      
      // Wait a moment for PDF to generate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate email with summary
      const investment = calculateInvestment();
      const displayRevenue = getDisplayRevenue();
      
      const subject = encodeURIComponent(`STR Investment Analysis - ${result.address}`);
      const body = encodeURIComponent(
        `Hi,\n\n` +
        `I wanted to share this STR investment analysis with you.\n\n` +
        `────────────────────────────────\n` +
        `PROPERTY: ${result.address}\n` +
        `${bedrooms || result.bedrooms} BR / ${bathrooms || result.bathrooms} BA / Sleeps ${guestCount || (bedrooms || 3) * 2}\n` +
        `────────────────────────────────\n\n` +
        `PROJECTED REVENUE\n` +
        `• Annual Revenue: $${displayRevenue.toLocaleString()}\n` +
        `• Monthly Average: $${Math.round(displayRevenue / 12).toLocaleString()}\n\n` +
        `INVESTMENT RETURNS\n` +
        `• Cash-on-Cash Return: ${investment.cashOnCashReturn.toFixed(1)}%\n` +
        `• Annual Cash Flow: $${investment.cashFlow.toLocaleString()}\n` +
        `• Total Cash Required: $${investment.totalCashNeeded.toLocaleString()}\n\n` +
        `────────────────────────────────\n\n` +
        `📎 Please see the attached PDF for the full detailed analysis including:\n` +
        `• Monthly revenue forecast with seasonality\n` +
        `• Comparable properties in the area\n` +
        `• Recommended amenities for top performance\n` +
        `• 10-year investment projection\n\n` +
        `(The PDF should have just downloaded - please attach it to this email)\n\n` +
        `────────────────────────────────\n` +
        `Generated by Edge by Teeco\n` +
        `edge.teeco.co`
      );
      
      window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
      setShowEmailModal(false);
      setEmailAddress("");
    } catch (err) {
      console.error("Email error:", err);
      alert("Failed to send email. Please try again.");
    } finally {
      setEmailSending(false);
    }
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
        body: JSON.stringify({ address: addressToAnalyze, bedrooms, bathrooms, accommodates: guestCount || bedrooms * 2 }),
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
    const guestMultiplier = getGuestCountMultiplier();
    const guestBonus = Math.round((guestMultiplier - 1) * 100);
    const baselineGuests = (bedrooms || 3) * 2;
    
    // Get seasonal data from the same function used in UI
    const seasonalData = getSeasonalityData();
    const baseMonthlyRev = displayRevenue / 12;
    
    // Calculate monthly revenues with seasonal variation - SAME LOGIC AS UI
    const monthlyRevenues = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
      const monthData = seasonalData[index];
      let monthlyRev = 0;
      
      if (monthData?.revenue && monthData.revenue > 0) {
        // Use actual historical revenue with guest multiplier
        monthlyRev = Math.round(monthData.revenue * guestMultiplier);
      } else if (monthData?.occupancy) {
        // Calculate from occupancy variation
        const baseOccupancy = result.occupancy || 55;
        const seasonalMultiplier = baseOccupancy > 0 ? (monthData.occupancy / baseOccupancy) : 1;
        monthlyRev = Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
      } else {
        // Fallback to base monthly
        monthlyRev = Math.round(baseMonthlyRev);
      }
      
      return { month, revenue: monthlyRev || Math.round(baseMonthlyRev) };
    });
    
    // Find peak and low months
    const sortedMonths = [...monthlyRevenues].sort((a, b) => b.revenue - a.revenue);
    const peakMonth = sortedMonths[0];
    const lowMonth = sortedMonths[sortedMonths.length - 1];
    
    // Create a printable HTML document - Premium Teeco Investment Report
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Investment Analysis - ${result.address || result.neighborhood}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #2b2823; line-height: 1.6; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px; }
    
    /* Premium Header */
    .header { text-align: center; padding-bottom: 32px; margin-bottom: 32px; border-bottom: 1px solid #e5e3da; }
    .logo-container { margin-bottom: 24px; }
    .logo { height: 48px; }
    .property-title { font-size: 32px; font-weight: 700; color: #2b2823; margin-bottom: 12px; letter-spacing: -0.5px; }
    .property-details { font-size: 15px; color: #787060; font-weight: 500; }
    .property-details span { margin: 0 12px; }
    
    /* Executive Summary - Premium Card */
    .executive-summary { background: #2b2823; border-radius: 20px; padding: 40px; margin-bottom: 32px; color: white; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; text-align: center; }
    .summary-item { }
    .summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.6); margin-bottom: 8px; font-weight: 500; }
    .summary-value { font-size: 36px; font-weight: 700; color: #22c55e; }
    .summary-value.primary { font-size: 48px; }
    .summary-subtext { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 6px; }
    
    /* Section Headers */
    h2 { font-size: 16px; font-weight: 600; color: #2b2823; margin: 36px 0 16px 0; padding-bottom: 10px; border-bottom: 1px solid #e5e3da; text-transform: uppercase; letter-spacing: 1px; }
    h2 .badge { font-size: 10px; background: #22c55e; color: white; padding: 3px 10px; border-radius: 20px; margin-left: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    
    /* Investment Highlights */
    .highlights { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .highlight-card { background: #f5f4f0; border-radius: 16px; padding: 24px 16px; text-align: center; }
    .highlight-card.positive { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
    .highlight-value { font-size: 28px; font-weight: 700; color: #2b2823; margin-bottom: 4px; }
    .highlight-label { font-size: 10px; color: #787060; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }
    
    /* Tables */
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .table td { padding: 16px 20px; border-bottom: 1px solid #e5e3da; font-size: 14px; }
    .table tr:last-child td { border-bottom: none; }
    .table .total { background: #f5f4f0; font-weight: 600; }
    .table .positive { color: #16a34a; font-weight: 600; }
    .table .negative { color: #dc2626; }
    .table .right { text-align: right; font-weight: 500; }
    
    /* Monthly Revenue Grid - Premium */
    .monthly-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 20px 0; }
    .month-card { background: #f5f4f0; border-radius: 12px; padding: 16px 10px; text-align: center; transition: all 0.2s; }
    .month-card.peak { background: #2b2823; color: white; }
    .month-card.peak .month-name { color: rgba(255,255,255,0.6); }
    .month-card.peak .month-value { color: #22c55e; }
    .month-card.low { background: #fef3c7; }
    .month-name { font-size: 10px; color: #787060; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }
    .month-value { font-size: 15px; font-weight: 700; color: #2b2823; margin-top: 6px; }
    
    /* Comps */
    .comp-card { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #e5e3da; }
    .comp-card:last-child { border-bottom: none; }
    .comp-info { flex: 1; }
    .comp-name { font-weight: 600; color: #2b2823; font-size: 14px; }
    .comp-details { font-size: 12px; color: #787060; margin-top: 4px; }
    .comp-revenue { text-align: right; }
    .comp-revenue-value { font-weight: 700; color: #2b2823; font-size: 16px; }
    .comp-revenue-details { font-size: 11px; color: #787060; }
    
    /* Amenities */
    .amenity-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .amenity-item { display: flex; align-items: center; padding: 14px 16px; background: #f5f4f0; border-radius: 12px; }
    .amenity-item.must-have { background: #2b2823; color: white; }
    .amenity-item.must-have .amenity-name { color: white; }
    .amenity-item.must-have .amenity-boost { color: #22c55e; }
    .amenity-item.high-impact { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
    .amenity-name { flex: 1; font-weight: 500; font-size: 14px; color: #2b2823; }
    .amenity-boost { font-weight: 700; color: #16a34a; font-size: 14px; }
    
    /* ROI Timeline */
    .roi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 16px 0; }
    .roi-year { background: #f5f4f0; border-radius: 10px; padding: 14px 8px; text-align: center; }
    .roi-year.highlight { background: #2b2823; color: white; }
    .roi-year.highlight .roi-label { color: rgba(255,255,255,0.6); }
    .roi-year.highlight .roi-value { color: #22c55e; }
    .roi-label { font-size: 10px; color: #787060; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
    .roi-value { font-size: 14px; font-weight: 700; color: #2b2823; margin-top: 4px; }
    
    /* Footer */
    .footer { margin-top: 48px; padding-top: 32px; border-top: 1px solid #e5e3da; text-align: center; }
    .footer-brand { font-size: 18px; font-weight: 700; color: #2b2823; margin-bottom: 8px; letter-spacing: -0.5px; }
    .footer-text { font-size: 12px; color: #787060; }
    .disclaimer { font-size: 10px; color: #a0a0a0; margin-top: 20px; max-width: 550px; margin-left: auto; margin-right: auto; line-height: 1.5; }
    
    /* Print styles */
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-container">
        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#2b2823" stroke-width="5" fill="none"/>
          <path d="M30 55 L30 75 L45 75 L45 60 L55 60 L55 75 L70 75 L70 55 L50 35 L30 55Z" stroke="#2b2823" stroke-width="5" fill="none"/>
        </svg>
      </div>
      <h1 class="property-title">${result.address || result.neighborhood}</h1>
      <p class="property-details">
        <span>${result.city}, ${result.state}</span> · 
        <span>${result.bedrooms} Bed / ${result.bathrooms} Bath</span> · 
        <span>Sleeps ${guestCount || baselineGuests}</span>
      </p>
    </div>
    
    <!-- Executive Summary -->
    <div class="executive-summary">
      <div class="summary-grid">
        <div class="summary-item">
          <p class="summary-label">Projected Annual Revenue</p>
          <p class="summary-value primary">${formatCurrency(displayRevenue)}</p>
          <p class="summary-subtext">${formatCurrency(Math.round(displayRevenue / 12))}/month avg${guestBonus > 0 ? ` · +${guestBonus}% capacity bonus` : ''}</p>
        </div>
        <div class="summary-item">
          <p class="summary-label">Annual Cash Flow</p>
          <p class="summary-value">${formatCurrency(investment.cashFlow)}</p>
          <p class="summary-subtext">${formatCurrency(Math.round(investment.cashFlow / 12))}/month</p>
        </div>
        <div class="summary-item">
          <p class="summary-label">Cash-on-Cash Return</p>
          <p class="summary-value">${investment.cashOnCashReturn.toFixed(1)}%</p>
          <p class="summary-subtext">on ${formatCurrency(investment.totalCashNeeded)} invested</p>
        </div>
      </div>
    </div>
    
    <!-- Investment Highlights -->
    <div class="highlights">
      <div class="highlight-card">
        <div class="highlight-value">${formatCurrency(result.adr)}</div>
        <div class="highlight-label">Avg Nightly Rate</div>
      </div>
      <div class="highlight-card">
        <div class="highlight-value">${result.occupancy}%</div>
        <div class="highlight-label">Occupancy Rate</div>
      </div>
      <div class="highlight-card">
        <div class="highlight-value">${result.nearbyListings || 'N/A'}</div>
        <div class="highlight-label">Active Listings</div>
      </div>
      <div class="highlight-card positive">
        <div class="highlight-value">${formatCurrency(peakMonth.revenue)}</div>
        <div class="highlight-label">Peak Month (${peakMonth.month})</div>
      </div>
    </div>
    
    <!-- Investment Analysis -->
    ${purchasePrice ? `
    <h2>Investment Analysis</h2>
    <table class="table">
      <tr><td>Purchase Price</td><td class="right">${formatCurrency(parseFloat(purchasePrice))}</td></tr>
      <tr><td>Down Payment (${downPaymentPercent}%)</td><td class="right">${formatCurrency(investment.downPayment)}</td></tr>
      <tr><td>Loan Amount (${loanTerm}yr @ ${interestRate}%)</td><td class="right">${formatCurrency(investment.loanAmount)}</td></tr>
      <tr><td>Monthly Mortgage (P&I)</td><td class="right">${formatCurrency(investment.monthlyMortgage)}</td></tr>
      <tr class="total"><td>Total Cash Required</td><td class="right">${formatCurrency(investment.totalCashNeeded)}</td></tr>
    </table>
    
    <h2>Annual Expense Breakdown</h2>
    <table class="table">
      <tr><td>Mortgage (P&I)</td><td class="right">${formatCurrency(investment.monthlyMortgage * 12)}</td></tr>
      <tr><td>Property Tax (${propertyTaxRate}%)</td><td class="right">${formatCurrency(investment.annualPropertyTax)}</td></tr>
      <tr><td>Insurance</td><td class="right">${formatCurrency(investment.annualInsurance)}</td></tr>
      <tr><td>Management Fee (${managementFeePercent}%)</td><td class="right">${formatCurrency(investment.annualManagement)}</td></tr>
      <tr><td>Operating Expenses</td><td class="right">${formatCurrency(investment.monthlyOperating * 12)}</td></tr>
      <tr class="total"><td>Total Annual Expenses</td><td class="right negative">${formatCurrency(investment.totalAnnualExpenses)}</td></tr>
      <tr class="total"><td>Gross Revenue</td><td class="right positive">${formatCurrency(displayRevenue)}</td></tr>
      <tr class="total"><td><strong>Net Annual Cash Flow</strong></td><td class="right ${investment.cashFlow >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(investment.cashFlow)}</strong></td></tr>
    </table>
    ` : ''}
    
    <!-- Monthly Revenue Forecast -->
    <h2>Monthly Revenue Forecast <span class="badge">Seasonal</span></h2>
    <div class="monthly-grid">
      ${monthlyRevenues.map(m => {
        const isPeak = m.revenue === peakMonth.revenue;
        const isLow = m.revenue === lowMonth.revenue;
        return `<div class="month-card ${isPeak ? 'peak' : isLow ? 'low' : ''}">
          <div class="month-name">${m.month}</div>
          <div class="month-value">${formatCurrency(m.revenue)}</div>
        </div>`;
      }).join('')}
    </div>
    <p style="font-size: 12px; color: #666; text-align: center; margin-top: 8px;">🟢 Peak Season &nbsp; 🟡 Low Season &nbsp; Annual Total: <strong>${formatCurrency(monthlyRevenues.reduce((sum, m) => sum + m.revenue, 0))}</strong></p>
    
    <!-- Comparable Listings -->
    ${result.comparables && result.comparables.length > 0 ? `
    <h2>Top Performing Comparables</h2>
    <div>
      ${result.comparables.slice(0, 5).map(c => `
      <div class="comp-card">
        <div class="comp-info">
          <div class="comp-name">${c.name.substring(0, 45)}${c.name.length > 45 ? '...' : ''}</div>
          <div class="comp-details">${c.bedrooms} bed • ${c.bathrooms || '-'} bath • ⭐ ${c.rating || '-'}</div>
        </div>
        <div class="comp-revenue">
          <div class="comp-revenue-value">${formatCurrency(c.annualRevenue)}/yr</div>
          <div class="comp-revenue-details">${formatCurrency(c.nightPrice)}/night • ${c.occupancy}% occ</div>
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Recommended Amenities -->
    ${result.recommendedAmenities && result.recommendedAmenities.length > 0 ? `
    <h2>Amenities to Reach 90th Percentile</h2>
    <div class="amenity-grid">
      ${result.recommendedAmenities.slice(0, 6).map(a => `
      <div class="amenity-item ${a.priority === 'MUST HAVE' ? 'must-have' : a.priority === 'HIGH IMPACT' ? 'high-impact' : ''}">
        <span class="amenity-name">${a.name}</span>
        <span class="amenity-boost">+${a.boost}%</span>
      </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Startup Costs -->
    ${investment.startupCosts > 0 ? `
    <h2>Startup Investment</h2>
    <table class="table">
      ${includeDesignServices ? `<tr><td>Teeco Design Services</td><td class="right">${formatCurrency(calculateDesignCost())}</td></tr>` : ''}
      ${includeSetupServices ? `<tr><td>Teeco Setup Services</td><td class="right">${formatCurrency(calculateSetupCost())}</td></tr>` : ''}
      ${includeFurnishings ? `<tr><td>Furnishings & Decor</td><td class="right">${formatCurrency(calculateFurnishingsCost())}</td></tr>` : ''}
      ${includeAmenities ? `<tr><td>Premium Amenities</td><td class="right">${formatCurrency(amenitiesCost)}</td></tr>` : ''}
      <tr class="total"><td><strong>Total Startup Investment</strong></td><td class="right"><strong>${formatCurrency(investment.startupCosts)}</strong></td></tr>
    </table>
    ` : ''}
    
    <!-- 10-Year Investment Projection -->
    ${purchasePrice ? `
    <h2>10-Year Investment Projection</h2>
    <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; margin-bottom: 16px;">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => {
        const annualCashFlow = investment.cashFlow;
        const cumulativeCashFlow = annualCashFlow * year;
        const principalPaid = investment.monthlyMortgage * 12 * year * 0.3;
        const appreciation = (parseFloat(purchasePrice) || 0) * 0.03 * year;
        const totalReturn = cumulativeCashFlow + investment.downPayment + principalPaid + appreciation - investment.totalCashNeeded;
        return `<div style="text-align: center; padding: 8px; background: ${totalReturn >= 0 ? '#ecfdf5' : '#fef2f2'}; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">Year ${year}</div>
          <div style="font-size: 11px; font-weight: bold; color: ${totalReturn >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(totalReturn)}</div>
        </div>`;
      }).join('')}
    </div>
    <table class="table">
      <tr><td>10-Year Cumulative Cash Flow</td><td class="right" style="color: ${investment.cashFlow >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(investment.cashFlow * 10)}</td></tr>
      <tr><td>Estimated Equity Built (Principal + 3% Appreciation)</td><td class="right">${formatCurrency(investment.downPayment + (investment.monthlyMortgage * 120 * 0.3) + ((parseFloat(purchasePrice) || 0) * 0.3))}</td></tr>
      <tr class="total"><td><strong>Total 10-Year Return</strong></td><td class="right" style="color: #22c55e;"><strong>${formatCurrency((investment.cashFlow * 10) + investment.downPayment + (investment.monthlyMortgage * 120 * 0.3) + ((parseFloat(purchasePrice) || 0) * 0.3) - investment.totalCashNeeded)}</strong></td></tr>
    </table>
    <p style="font-size: 10px; color: #999; text-align: center; margin-top: 8px;">*Assumes 3% annual appreciation and average principal paydown rate</p>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">Edge by Teeco</div>
      <p class="footer-text">STR Investment Analysis</p>
      <p class="footer-text">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p class="disclaimer">This analysis is for informational purposes only and should not be considered financial advice. Projections are based on market data and may vary based on property management, market conditions, and other factors. Always conduct your own due diligence before making investment decisions.</p>
    </div>
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

  // Calculate guest count multiplier based on industry data
  // Research shows ~5-8% revenue increase per additional guest capacity above baseline
  // Baseline: bedrooms * 2 guests (standard assumption)
  const getGuestCountMultiplier = () => {
    if (!bedrooms || !guestCount) return 1.0;
    
    const baselineGuests = bedrooms * 2; // Standard: 2 guests per bedroom
    const extraGuests = guestCount - baselineGuests;
    
    if (extraGuests <= 0) return 1.0; // No bonus if at or below baseline
    
    // Each extra guest above baseline adds ~6% revenue (industry average)
    // Capped at 50% bonus to prevent unrealistic estimates
    const bonus = Math.min(extraGuests * 0.06, 0.50);
    return 1.0 + bonus;
  };

  // Get display revenue based on percentile selection or custom income
  const getDisplayRevenue = () => {
    if (useCustomIncome && customAnnualIncome) {
      return parseFloat(customAnnualIncome) || 0;
    }
    
    if (!result) return 0;
    
    // Get guest count multiplier
    const guestMultiplier = getGuestCountMultiplier();
    
    // Use real percentile data if available
    // NOTE: percentiles.revenue values are ALREADY ANNUAL (not monthly)
    if (result.percentiles?.revenue) {
      let baseRevenue = 0;
      switch (revenuePercentile) {
        case "75th":
          baseRevenue = result.percentiles.revenue.p75;
          break;
        case "90th":
          baseRevenue = result.percentiles.revenue.p90;
          break;
        default:
          baseRevenue = result.percentiles.revenue.p50;
      }
      // Apply guest count multiplier
      return Math.round(baseRevenue * guestMultiplier);
    }
    
    // Fallback to calculated revenue with multipliers
    let baseRevenue = result.annualRevenue;
    switch (revenuePercentile) {
      case "75th":
        baseRevenue = Math.round(result.annualRevenue * 1.25);
        break;
      case "90th":
        baseRevenue = Math.round(result.annualRevenue * 1.45);
        break;
    }
    // Apply guest count multiplier
    return Math.round(baseRevenue * guestMultiplier);
  };

  // Calculate design cost ($7/sqft with optional 20% student discount)
  const calculateDesignCost = () => {
    const baseCost = propertySqft * 7;
    return studentDiscount ? Math.round(baseCost * 0.8) : baseCost;
  };

  // Calculate setup cost ($13/sqft with optional 20% student discount)
  const calculateSetupCost = () => {
    const baseCost = propertySqft * 13;
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
    const maintenance = lawnCareMonthly + suppliesMonthly + miscMonthly;
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
            <img src="/teeco-icon-black.png" alt="Teeco" className="w-8 h-8 invert" />
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
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#787060" }}>
                Sleeps
              </label>
              <div className="flex gap-2 flex-wrap">
                {[2, 4, 6, 8, 10, 12, 14, 16].map((num) => (
                  <button
                    key={num}
                    onClick={() => setGuestCount(num)}
                    className={`w-12 h-10 rounded-lg font-medium transition-all ${
                      guestCount === num 
                        ? "text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={guestCount === num ? { backgroundColor: "#2b2823" } : {}}
                  >
                    {num === 16 ? "16+" : num}
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
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Save Report Button */}
                    <button
                      onClick={saveReport}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: "#e5e3da", color: "#2b2823" }}
                      title="Save Report"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Save
                    </button>
                    
                    {/* Email Button */}
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: "#e5e3da", color: "#2b2823" }}
                      title="Email Report"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                    
                    {/* PDF Download Button */}
                    <button
                      onClick={downloadPDFReport}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
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
                {guestCount && bedrooms && guestCount > bedrooms * 2 && (
                  <p className="text-xs text-green-600 mt-2">
                    +{Math.round((getGuestCountMultiplier() - 1) * 100)}% guest capacity bonus (sleeps {guestCount} vs standard {bedrooms * 2})
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
              
              {/* Bar Chart with Y-Axis */}
              {(() => {
                const annualRev = getDisplayRevenue() || 0;
                const baseMonthlyRev = annualRev / 12;
                const guestMultiplier = getGuestCountMultiplier();
                
                // Calculate all monthly revenues first
                const monthlyRevenues = getSeasonalityData().map(month => {
                  if (month.revenue && month.revenue > 0) {
                    return Math.round(month.revenue * guestMultiplier);
                  } else {
                    const baseOccupancy = result.occupancy || 55;
                    const seasonalMultiplier = baseOccupancy > 0 ? (month.occupancy / baseOccupancy) : 1;
                    return Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
                  }
                });
                
                const maxRev = Math.max(...monthlyRevenues, 1);
                const minRev = Math.min(...monthlyRevenues);
                // Start Y-axis from 80% of min to dramatically emphasize variation
                // This makes the visual difference between peak and low months much more apparent
                const yAxisMin = Math.floor(minRev * 0.8 / 500) * 500;
                const yAxisMax = Math.ceil(maxRev * 1.05 / 500) * 500;
                const yAxisRange = Math.max(yAxisMax - yAxisMin, 1000); // Ensure minimum range
                
                // Generate Y-axis labels (4 ticks)
                const yAxisTicks = [0, 0.33, 0.66, 1].map(pct => Math.round(yAxisMin + yAxisRange * pct));
                
                return (
                  <div className="flex gap-2">
                    {/* Y-Axis Labels */}
                    <div className="flex flex-col justify-between h-48 text-right pr-2" style={{ minWidth: '45px' }}>
                      {yAxisTicks.reverse().map((tick, i) => (
                        <span key={i} className="text-xs" style={{ color: "#787060" }}>
                          ${tick >= 1000 ? Math.round(tick / 1000) + 'k' : tick}
                        </span>
                      ))}
                    </div>
                    
                    {/* Chart Area */}
                    <div className="flex-1">
                      <div className="flex items-end justify-between gap-1 h-48 border-l border-b" style={{ borderColor: '#e5e3da' }}>
                        {monthlyRevenues.map((monthlyRev, index) => {
                          // Calculate height based on Y-axis range (not from 0)
                          const heightPercent = yAxisRange > 0 ? ((monthlyRev - yAxisMin) / yAxisRange) * 100 : 50;
                          const barColor = monthlyRev >= baseMonthlyRev * 1.1 ? '#22c55e' : monthlyRev >= baseMonthlyRev * 0.9 ? '#3b82f6' : '#f59e0b';
                          
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                              <span className="text-xs font-bold mb-1" style={{ color: "#2b2823" }}>
                                ${monthlyRev >= 1000 ? Math.round(monthlyRev / 1000) + 'k' : monthlyRev}
                              </span>
                              <div 
                                className="w-full rounded-t-md transition-all cursor-pointer hover:opacity-80"
                                style={{ 
                                  height: `${Math.max(heightPercent, 5)}%`,
                                  backgroundColor: barColor,
                                }}
                                title={`${monthNames[index]}: ${formatCurrency(monthlyRev)}`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between gap-1 mt-1">
                        {monthNames.map((name, index) => (
                          <div key={index} className="flex-1 text-center">
                            <span className="text-xs text-gray-400">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
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
                  const guestMultiplier = getGuestCountMultiplier();
                  // Use actual revenue from historical data if available
                  let monthlyRev = 0;
                  if (month.revenue && month.revenue > 0) {
                    // Apply guest multiplier to historical revenue
                    monthlyRev = Math.round(month.revenue * guestMultiplier);
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
                
                {/* Setup Services - $13/sqft */}
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
                      <p className="text-xs text-gray-500">$13/sqft • Full property setup & staging{studentDiscount && " (20% off)"}</p>
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
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Misc</label>
                  <input
                    type="number"
                    value={miscMonthly}
                    onChange={(e) => setMiscMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                    placeholder="0"
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
                  
                  {/* ROI Timeline Chart */}
                  <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#ffffff", border: "1px solid #e5e3da" }}>
                    <h4 className="font-medium mb-4" style={{ color: "#2b2823" }}>10-Year Investment Projection</h4>
                    <div className="relative">
                      {/* Chart Container */}
                      <div className="flex items-end gap-1 h-40 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => {
                          const annualCashFlow = investment.cashFlow;
                          const cumulativeCashFlow = annualCashFlow * year;
                          const principalPaid = investment.monthlyMortgage * 12 * year * 0.3; // ~30% goes to principal avg
                          const appreciation = (parseFloat(purchasePrice) || 0) * 0.03 * year; // 3% annual appreciation
                          const totalEquity = investment.downPayment + principalPaid + appreciation;
                          const totalReturn = cumulativeCashFlow + totalEquity - investment.totalCashNeeded;
                          
                          // Calculate bar heights (max at year 10)
                          const maxReturn = (annualCashFlow * 10) + investment.downPayment + (investment.monthlyMortgage * 120 * 0.3) + ((parseFloat(purchasePrice) || 0) * 0.3) - investment.totalCashNeeded;
                          const heightPercent = maxReturn > 0 ? Math.max(10, Math.min(100, (totalReturn / maxReturn) * 100)) : 50;
                          const isPositive = totalReturn >= 0;
                          
                          return (
                            <div key={year} className="flex-1 flex flex-col items-center justify-end h-full">
                              <div 
                                className="w-full rounded-t transition-all"
                                style={{
                                  height: `${heightPercent}%`,
                                  backgroundColor: isPositive ? '#22c55e' : '#ef4444',
                                  opacity: 0.7 + (year * 0.03),
                                }}
                                title={`Year ${year}: ${formatCurrency(totalReturn)} total return`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                      {/* X-axis labels */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => (
                          <div key={year} className="flex-1 text-center">
                            <span className="text-xs" style={{ color: "#787060" }}>Yr {year}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 10-Year Summary */}
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                        <p className="text-xs text-gray-500">10-Yr Cash Flow</p>
                        <p className={`font-bold ${investment.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(investment.cashFlow * 10)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                        <p className="text-xs text-gray-500">Est. Equity Built</p>
                        <p className="font-bold" style={{ color: "#2b2823" }}>
                          {formatCurrency(investment.downPayment + (investment.monthlyMortgage * 120 * 0.3) + ((parseFloat(purchasePrice) || 0) * 0.3))}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: "#ecfdf5" }}>
                        <p className="text-xs text-gray-500">Total 10-Yr Return</p>
                        <p className="font-bold text-green-600">
                          {formatCurrency((investment.cashFlow * 10) + investment.downPayment + (investment.monthlyMortgage * 120 * 0.3) + ((parseFloat(purchasePrice) || 0) * 0.3) - investment.totalCashNeeded)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">*Assumes 3% annual appreciation and average principal paydown</p>
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
      
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#2b2823' }}>Email Report</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: '#787060' }}>
              Send a summary of this investment analysis to any email address.
            </p>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-3 rounded-xl border text-sm mb-4"
              style={{ borderColor: '#d8d6cd' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-sm"
                style={{ backgroundColor: '#e5e3da', color: '#787060' }}
              >
                Cancel
              </button>
              <button
                onClick={sendEmailReport}
                disabled={!emailAddress || emailSending}
                className="flex-1 py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
              >
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
