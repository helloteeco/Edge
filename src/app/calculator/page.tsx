"use client";

import { useState, useEffect } from "react";
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
  revPAN: number; // Revenue per Available Night
  // Property Details
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  // Nearby Comps
  nearbyListings: number;
  // Additional Metrics
  strCapRate: number;
  ltrCapRate: number;
  traditionalRent: number;
  mashMeter: number;
  walkScore: number;
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

  // Analyze address
  const handleAnalyze = async (searchAddress?: string) => {
    const addressToAnalyze = searchAddress || address;
    if (!addressToAnalyze.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

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
      const adjustedADR = Math.round((neighborhood?.adr || 150) * bedroomMultiplier);
      const occ = neighborhood?.occupancy || 55;
      const annualRevenue = Math.round(adjustedADR * (occ / 100) * 365);
      const monthlyRevenue = Math.round(annualRevenue / 12);
      const revPAN = Math.round(adjustedADR * (occ / 100));

      const analysisResult: AnalysisResult = {
        address: addressToAnalyze,
        city: property?.city || "",
        state: property?.state || "",
        neighborhood: neighborhood?.name || "Unknown",
        annualRevenue,
        monthlyRevenue,
        adr: adjustedADR,
        occupancy: occ,
        revPAN,
        bedrooms: property?.bedrooms || bedrooms,
        bathrooms: property?.bathrooms || 2,
        sqft: property?.sqft || 0,
        propertyType: property?.propertyType || "house",
        nearbyListings: neighborhood?.listingsCount || 0,
        strCapRate: neighborhood?.strCapRate || 0,
        ltrCapRate: neighborhood?.ltrCapRate || 0,
        traditionalRent: neighborhood?.traditionalRent || 0,
        mashMeter: neighborhood?.mashMeter || 0,
        walkScore: neighborhood?.walkScore || 0,
      };

      setResult(analysisResult);
      setAddress(addressToAnalyze);

      // Save to recent searches
      saveRecentSearch({
        address: addressToAnalyze,
        annualRevenue,
        adr: adjustedADR,
        occupancy: occ,
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
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5" style={{ color: "#787060" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="Enter any US address (e.g., 123 Main St, Orlando, FL 32801)"
                className="w-full pl-12 pr-4 py-4 rounded-xl text-base outline-none"
                style={{ 
                  backgroundColor: "#f8f7f4", 
                  border: "2px solid #e5e3da",
                  color: "#2b2823",
                }}
              />
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex justify-between items-center"
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
              Tip: Use format "123 Main St, City, ST 12345" or "123 Main St, City, ST"
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Annual Revenue Projection - Hero Card */}
            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <p className="text-sm font-medium mb-2" style={{ color: "#22c55e" }}>Annual Revenue Projection</p>
              <p className="text-5xl md:text-6xl font-bold mb-3" style={{ color: "#2b2823" }}>
                {formatCurrency(result.annualRevenue)}<span className="text-2xl font-normal">/yr</span>
              </p>
              <p className="text-sm" style={{ color: "#787060" }}>
                Based on {result.nearbyListings > 0 ? `${result.nearbyListings} nearby Airbnbs` : "market data"} in {result.neighborhood}
              </p>

              {/* Market Conditions */}
              <div className="mt-6 pt-6 flex justify-center gap-8" style={{ borderTop: "1px solid #e5e3da" }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: "#f8f7f4" }}>
                  {new Date().toLocaleString("default", { month: "long" })} Market Conditions
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-2xl font-bold" style={{ color: "#2b2823" }}>{formatCurrency(result.adr)}</p>
                  <p className="text-xs" style={{ color: "#787060" }}>Average Daily Rate</p>
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

            {/* Property & Location Details */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Property Details */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#2b2823" }}>Property Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "#787060" }}>Address</span>
                    <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.address.split(",")[0]}</span>
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
                </div>
              </div>

              {/* Investment Metrics */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#2b2823" }}>Investment Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "#787060" }}>Monthly Revenue (STR)</span>
                    <span className="text-sm font-medium" style={{ color: "#22c55e" }}>{formatCurrency(result.monthlyRevenue)}</span>
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
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.strCapRate.toFixed(1)}%</span>
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
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.mashMeter}/100</span>
                    </div>
                  )}
                  {result.walkScore > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: "#787060" }}>Walk Score</span>
                      <span className="text-sm font-medium" style={{ color: "#2b2823" }}>{result.walkScore}/100</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Revenue Breakdown */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#2b2823" }}>Monthly Revenue Breakdown</h3>
              <div className="grid grid-cols-12 gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  // Simulate seasonality
                  const month = new Date(2024, i).toLocaleString("default", { month: "short" });
                  const seasonMultiplier = [0.7, 0.75, 0.9, 1.0, 1.1, 1.2, 1.3, 1.25, 1.0, 0.85, 0.75, 0.8][i];
                  const monthRevenue = Math.round(result.monthlyRevenue * seasonMultiplier);
                  const maxRevenue = Math.round(result.monthlyRevenue * 1.3);
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
                <span>Low Season: ~{formatCurrency(Math.round(result.monthlyRevenue * 0.7))}/mo</span>
                <span>High Season: ~{formatCurrency(Math.round(result.monthlyRevenue * 1.3))}/mo</span>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "#2b2823" }}>
              <p className="text-white font-semibold mb-2">Want a detailed investment analysis?</p>
              <p className="text-white/70 text-sm mb-4">Get cash-on-cash returns, expense breakdowns, and more</p>
              <button
                onClick={() => {
                  // Scroll to top and show full calculator
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "#ffffff", color: "#2b2823" }}
              >
                Run Full Analysis →
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
