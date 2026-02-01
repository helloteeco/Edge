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
}

interface AnalysisResult {
  address: string;
  city: string;
  state: string;
  neighborhood: string;
  // Revenue Projection
  annualRevenue: number;
  monthlyRevenue: number;
  // Market Conditions
  adr: number;
  occupancy: number;
  revPAN: number;
  // Property Details
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  listPrice: number;
  // Investment Metrics
  strCapRate: number;
  ltrCapRate: number;
  traditionalRent: number;
  mashMeter: number;
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  nearbyListings: number;
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
  
  // Address autocomplete
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Manual income override
  const [useCustomIncome, setUseCustomIncome] = useState(false);
  const [customAnnualIncome, setCustomAnnualIncome] = useState("");

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

  // Fetch address suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (address.length < 5) {
        setSuggestions([]);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
        const data = await response.json();
        
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [address]);

  // Save recent search
  const saveRecentSearch = (search: RecentSearch) => {
    const updated = [search, ...recentSearches.filter(s => s.address !== search.address)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("edge_recent_searches", JSON.stringify(updated));
  };

  // Select suggestion
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.display);
    setShowSuggestions(false);
    setSuggestions([]);
    // Auto-analyze after selection
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
        body: JSON.stringify({ address: addressToAnalyze }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Could not find data for this address. Try a different address.");
        setIsLoading(false);
        return;
      }

      const { property, neighborhood } = data;

      // Calculate revenue based on bedroom count
      const bedroomMultiplier = bedrooms <= 1 ? 0.7 : bedrooms === 2 ? 0.85 : bedrooms === 3 ? 1.0 : bedrooms === 4 ? 1.15 : 1.3;
      
      // Get ADR and occupancy from neighborhood data - handle various data formats
      const rawAdr = neighborhood?.adr;
      const baseAdr = typeof rawAdr === 'number' ? rawAdr : 
                      typeof rawAdr === 'string' ? parseFloat(rawAdr) : 150;
      const adjustedADR = Math.round(baseAdr * bedroomMultiplier);
      
      const rawOcc = neighborhood?.occupancy;
      const occ = typeof rawOcc === 'number' ? rawOcc : 
                  typeof rawOcc === 'string' ? parseFloat(rawOcc) : 55;
      
      const annualRevenue = Math.round(adjustedADR * (occ / 100) * 365);
      const monthlyRevenue = Math.round(annualRevenue / 12);
      const revPAN = Math.round(adjustedADR * (occ / 100));

      // Parse all numeric values safely
      const parseNum = (val: unknown): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val) || 0;
        return 0;
      };

      const analysisResult: AnalysisResult = {
        address: addressToAnalyze,
        city: property?.city || "",
        state: property?.state || "",
        neighborhood: neighborhood?.name || "Unknown",
        annualRevenue,
        monthlyRevenue,
        adr: adjustedADR,
        occupancy: Math.round(occ),
        revPAN,
        bedrooms: property?.bedrooms || bedrooms,
        bathrooms: property?.bathrooms || 2,
        sqft: parseNum(property?.sqft),
        propertyType: property?.propertyType || "house",
        listPrice: parseNum(property?.listPrice) || parseNum(property?.lastSalePrice),
        strCapRate: parseNum(neighborhood?.strCapRate),
        ltrCapRate: parseNum(neighborhood?.ltrCapRate),
        traditionalRent: parseNum(neighborhood?.traditionalRent),
        mashMeter: parseNum(neighborhood?.mashMeter),
        walkScore: parseNum(neighborhood?.walkScore),
        transitScore: parseNum(neighborhood?.transitScore),
        bikeScore: parseNum(neighborhood?.bikeScore),
        nearbyListings: parseNum(neighborhood?.listingsCount),
      };

      setResult(analysisResult);
      setAddress(addressToAnalyze);
      setUseCustomIncome(false);
      setCustomAnnualIncome("");

      // Save to recent searches
      saveRecentSearch({
        address: addressToAnalyze,
        annualRevenue,
        adr: adjustedADR,
        occupancy: Math.round(occ),
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

  // Get display revenue (custom or calculated)
  const getDisplayRevenue = () => {
    if (useCustomIncome && customAnnualIncome) {
      return parseFloat(customAnnualIncome.replace(/[^0-9.]/g, "")) || 0;
    }
    return result?.annualRevenue || 0;
  };

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
          <p className="text-sm font-medium mb-2" style={{ color: "#787060" }}>STR Revenue Calculator</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#2b2823" }}>
            Estimate Airbnb rental revenue for<br />any address in the United States
          </h1>
          <p className="text-sm" style={{ color: "#787060" }}>
            Powered by Mashvisor • Real-time market data
          </p>
        </div>

        {/* Search Box */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowSuggestions(false);
                    handleAnalyze();
                  }
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter any US address (e.g., 123 Main St, Orlando, FL 32801)"
                className="w-full pl-12 pr-4 py-4 rounded-xl text-base outline-none"
                style={{ 
                  backgroundColor: "#f8f7f4", 
                  border: "2px solid #e5e3da",
                  color: "#2b2823",
                }}
              />
              
              {/* Address Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
                  style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #e5e3da" }}
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      style={{ borderBottom: index < suggestions.length - 1 ? "1px solid #f0f0f0" : "none" }}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#787060" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="text-sm" style={{ color: "#2b2823" }}>{suggestion.display}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Loading indicator for suggestions */}
              {isLoadingSuggestions && address.length >= 5 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 animate-spin" style={{ color: "#787060" }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={isLoading || !address.trim()}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#2b2823" }}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Analyze"
              )}
            </button>
          </div>

          {/* Bedroom Selector */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm" style={{ color: "#787060" }}>Bedrooms:</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setBedrooms(num)}
                  className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: bedrooms === num ? "#2b2823" : "#f8f7f4",
                    color: bedrooms === num ? "#ffffff" : "#2b2823",
                    border: bedrooms === num ? "none" : "1px solid #e5e3da",
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !result && (
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid #e5e3da" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "#2b2823" }}>Recent Searches</p>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setAddress(search.address);
                      handleAnalyze(search.address);
                    }}
                    className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ backgroundColor: "#f8f7f4" }}
                  >
                    <span className="text-sm" style={{ color: "#2b2823" }}>{search.address}</span>
                    <span className="text-sm font-medium" style={{ color: "#22c55e" }}>
                      {formatCurrency(search.annualRevenue)}/yr
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            <p className="text-xs mt-1" style={{ color: "#787060" }}>
              Tip: Use format &quot;123 Main St, City, ST 12345&quot; or &quot;123 Main St, City, ST&quot;
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Annual Revenue Projection - Hero Card */}
            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <p className="text-sm font-medium mb-2" style={{ color: "#22c55e" }}>
                {useCustomIncome ? "Your Custom Estimate" : "Estimated Annual Revenue"}
              </p>
              <p className="text-5xl md:text-6xl font-bold mb-3" style={{ color: "#2b2823" }}>
                {formatCurrency(getDisplayRevenue())}<span className="text-2xl font-normal">/yr</span>
              </p>
              <p className="text-sm mb-4" style={{ color: "#787060" }}>
                Based on {result.nearbyListings > 0 ? `${result.nearbyListings} nearby Airbnbs` : "market data"} in {result.neighborhood}
              </p>

              {/* Custom Income Override */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #e5e3da" }}>
                <label className="flex items-center justify-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={useCustomIncome}
                    onChange={(e) => setUseCustomIncome(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#2b2823" }}
                  />
                  <span className="text-sm" style={{ color: "#787060" }}>Use my own gross income estimate</span>
                </label>
                
                {useCustomIncome && (
                  <div className="max-w-xs mx-auto">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium" style={{ color: "#787060" }}>$</span>
                      <input
                        type="text"
                        value={customAnnualIncome}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          setCustomAnnualIncome(value ? parseInt(value).toLocaleString() : "");
                        }}
                        placeholder="50,000"
                        className="w-full pl-8 pr-16 py-3 rounded-xl text-lg font-medium text-center outline-none"
                        style={{ 
                          backgroundColor: "#f8f7f4", 
                          border: "2px solid #e5e3da",
                          color: "#2b2823",
                        }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#787060" }}>/year</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Market Conditions */}
              <div className="mt-6 pt-6" style={{ borderTop: "1px solid #e5e3da" }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-4" style={{ backgroundColor: "#f8f7f4" }}>
                  Market Conditions • {result.city}, {result.state}
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{formatCurrency(result.adr)}</p>
                    <p className="text-xs" style={{ color: "#787060" }}>Avg Nightly Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{result.occupancy}%</p>
                    <p className="text-xs" style={{ color: "#787060" }}>Occupancy Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{formatCurrency(result.revPAN)}</p>
                    <p className="text-xs" style={{ color: "#787060" }}>RevPAN</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Property & Investment Details */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Property Details */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#2b2823" }}>Property Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "#787060" }}>Address</span>
                    <span className="text-sm font-medium text-right" style={{ color: "#2b2823", maxWidth: "60%" }}>{result.address.split(",")[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "#787060" }}>Location</span>
                    <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.city}, {result.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "#787060" }}>Neighborhood</span>
                    <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.neighborhood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "#787060" }}>Bedrooms</span>
                    <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{bedrooms}</span>
                  </div>
                  {result.sqft > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>Square Feet</span>
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.sqft.toLocaleString()}</span>
                    </div>
                  )}
                  {result.listPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>List/Sale Price</span>
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{formatCurrency(result.listPrice)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Investment Metrics */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#2b2823" }}>Investment Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "#787060" }}>Monthly Revenue (STR)</span>
                    <span className="text-sm font-medium" style={{ color: "#22c55e" }}>{formatCurrency(useCustomIncome && customAnnualIncome ? getDisplayRevenue() / 12 : result.monthlyRevenue)}</span>
                  </div>
                  {result.traditionalRent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>Monthly Rent (LTR)</span>
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{formatCurrency(result.traditionalRent)}</span>
                    </div>
                  )}
                  {result.strCapRate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>STR Cap Rate</span>
                      <span className="text-sm font-medium" style={{ color: "#22c55e" }}>{result.strCapRate.toFixed(1)}%</span>
                    </div>
                  )}
                  {result.ltrCapRate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>LTR Cap Rate</span>
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.ltrCapRate.toFixed(1)}%</span>
                    </div>
                  )}
                  {result.mashMeter > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>Mash Meter Score</span>
                      <span className="text-sm font-medium" style={{ color: result.mashMeter >= 70 ? "#22c55e" : result.mashMeter >= 50 ? "#f59e0b" : "#ef4444" }}>{result.mashMeter}/100</span>
                    </div>
                  )}
                  {result.nearbyListings > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>Active Listings</span>
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.nearbyListings}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location Scores */}
            {(result.walkScore > 0 || result.transitScore > 0 || result.bikeScore > 0) && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#2b2823" }}>Location Scores</h3>
                <div className="grid grid-cols-3 gap-4">
                  {result.walkScore > 0 && (
                    <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f8f7f4" }}>
                      <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{result.walkScore}</p>
                      <p className="text-xs" style={{ color: "#787060" }}>Walk Score</p>
                    </div>
                  )}
                  {result.transitScore > 0 && (
                    <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f8f7f4" }}>
                      <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{result.transitScore}</p>
                      <p className="text-xs" style={{ color: "#787060" }}>Transit Score</p>
                    </div>
                  )}
                  {result.bikeScore > 0 && (
                    <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f8f7f4" }}>
                      <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{result.bikeScore}</p>
                      <p className="text-xs" style={{ color: "#787060" }}>Bike Score</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Monthly Revenue Breakdown */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#2b2823" }}>Monthly Revenue Breakdown</h3>
              <div className="grid grid-cols-12 gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  const month = new Date(2024, i).toLocaleString("default", { month: "short" });
                  const seasonMultiplier = [0.7, 0.75, 0.9, 1.0, 1.1, 1.2, 1.3, 1.25, 1.0, 0.85, 0.75, 0.8][i];
                  const baseMonthly = useCustomIncome && customAnnualIncome ? getDisplayRevenue() / 12 : result.monthlyRevenue;
                  const monthRevenue = Math.round(baseMonthly * seasonMultiplier);
                  const maxRevenue = Math.round(baseMonthly * 1.3);
                  const heightPct = (monthRevenue / maxRevenue) * 100;

                  return (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-full h-24 flex items-end">
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: seasonMultiplier >= 1.1 ? "#22c55e" : "#d8d6cd",
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#787060" }}>{month}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between text-xs" style={{ color: "#787060" }}>
                <span>Low Season: ~{formatCurrency(Math.round((useCustomIncome && customAnnualIncome ? getDisplayRevenue() / 12 : result.monthlyRevenue) * 0.7))}/mo</span>
                <span>High Season: ~{formatCurrency(Math.round((useCustomIncome && customAnnualIncome ? getDisplayRevenue() / 12 : result.monthlyRevenue) * 1.3))}/mo</span>
              </div>
            </div>

            {/* Research Comps CTA */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "#2b2823" }}>Research Comparable Listings</h3>
                  <p className="text-xs" style={{ color: "#787060" }}>See what similar properties are charging on Airbnb</p>
                </div>
                <a
                  href={`https://www.airbnb.com/s/${encodeURIComponent(result.city + ", " + result.state)}/homes?adults=2&refinement_paths%5B%5D=%2Fhomes&search_type=filter_change&tab_id=home_tab&query=${encodeURIComponent(result.city + ", " + result.state)}&place_id=&date_picker_type=flexible_dates&source=structured_search_input_header&min_bedrooms=${bedrooms}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Airbnb
                </a>
              </div>
            </div>

            {/* New Search Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setResult(null);
                  setAddress("");
                  setUseCustomIncome(false);
                  setCustomAnnualIncome("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-3 rounded-xl font-medium text-sm"
                style={{ backgroundColor: "#f8f7f4", color: "#2b2823", border: "1px solid #e5e3da" }}
              >
                Analyze Another Address
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !error && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f8f7f4" }}>
              <svg className="w-8 h-8" style={{ color: "#787060" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "#787060" }}>
              Enter any US address to get instant STR revenue estimates
            </p>
            <p className="text-xs mt-2" style={{ color: "#a8a49a" }}>
              Works with addresses from Zillow, Redfin, Realtor.com, and more
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs" style={{ color: "#787060" }}>
          Data provided by Mashvisor • Updated daily
        </p>
      </footer>
    </div>
  );
}
