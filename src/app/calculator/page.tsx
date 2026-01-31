"use client";

import { useState } from "react";
import Link from "next/link";
import { findCityForAddress, FlatCity } from "@/data/helpers";

export default function AddressCalculatorPage() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<FlatCity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleAnalyze = () => {
    if (!address.trim()) return;
    
    setIsSearching(true);
    setNotFound(false);
    
    // Simulate brief loading for UX
    setTimeout(() => {
      const city = findCityForAddress(address);
      if (city) {
        setResult(city);
        setNotFound(false);
      } else {
        setResult(null);
        setNotFound(true);
      }
      setIsSearching(false);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAnalyze();
    }
  };

  const openInRabbu = () => {
    window.open('https://www.rabbu.com/airbnb-calculator', '_blank', 'noopener,noreferrer');
  };

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A+': return { backgroundColor: '#000000', color: '#ffffff' };
      case 'A': return { backgroundColor: '#2b2823', color: '#ffffff' };
      case 'B+': return { backgroundColor: '#3d3a34', color: '#ffffff' };
      case 'B': return { backgroundColor: '#787060', color: '#ffffff' };
      case 'C': return { backgroundColor: '#d8d6cd', color: '#2b2823' };
      case 'D': return { backgroundColor: '#e5e3da', color: '#787060' };
      default: return { backgroundColor: '#e5e3da', color: '#787060' };
    }
  };

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return 'STRONG BUY';
      case 'buy': return 'BUY';
      case 'hold': return 'HOLD';
      case 'caution': return 'CAUTION';
      default: return 'AVOID';
    }
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return { color: '#000000' };
      case 'buy': return { color: '#2b2823' };
      case 'hold': return { color: '#787060' };
      default: return { color: '#9a9488' };
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Map
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
            >
              <span className="text-xl">📍</span>
            </div>
            <h1 
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Address Calculator
            </h1>
          </div>
          <p className="text-base max-w-xl" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            Paste any US address to get an instant STR investment analysis
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search Box */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#2b2823' }}
          >
            Property Address
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 123 Main St, Orlando, FL 32801"
              className="flex-1 px-4 py-3 rounded-xl transition-all"
              style={{ 
                border: '1px solid #d8d6cd',
                color: '#2b2823',
                backgroundColor: '#ffffff'
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={isSearching || !address.trim()}
              className="px-6 py-3 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
            >
              {isSearching ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: '#787060' }}>
            Enter a full address including city and state (e.g., &quot;123 Main St, Kissimmee, FL&quot;)
          </p>
          
          {/* Rabbu Redirect Button */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #d8d6cd' }}>
            <button
              onClick={openInRabbu}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: '#e5e3da', color: '#2b2823', border: '1px solid #d8d6cd' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Rabbu (third-party site)
            </button>
            <p className="text-xs mt-2 text-center" style={{ color: '#787060' }}>
              Get detailed Airbnb revenue estimates from Rabbu.com
            </p>
          </div>
        </div>

        {/* Not Found Message */}
        {notFound && (
          <div 
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: 'rgba(120, 112, 96, 0.08)', border: '1px solid #d8d6cd' }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#e5e3da' }}
              >
                <span className="text-xl">🔍</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#2b2823' }}>Market Not Found</h3>
                <p className="text-sm" style={{ color: '#787060' }}>
                  We couldn&apos;t find STR data for this location. This may be because:
                </p>
                <ul className="text-sm mt-2 list-disc list-inside space-y-1" style={{ color: '#787060' }}>
                  <li>The city isn&apos;t in our database yet</li>
                  <li>The address format wasn&apos;t recognized</li>
                  <li>Try using just the city and state (e.g., &quot;Orlando, FL&quot;)</li>
                </ul>
                <Link 
                  href="/search" 
                  className="inline-flex items-center gap-1 font-medium text-sm mt-3 transition-opacity hover:opacity-70"
                  style={{ color: '#2b2823' }}
                >
                  Browse all markets
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Location Header */}
            <div 
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <div className="p-5" style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 
                      className="text-2xl font-bold"
                      style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      {result.name}, {result.stateCode}
                    </h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)' }} className="mt-1">{result.county}</p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="inline-flex items-center justify-center w-16 h-16 rounded-xl text-2xl font-bold"
                      style={{ ...getGradeStyle(result.grade), fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      {result.grade}
                    </div>
                    <div 
                      className="text-sm font-semibold mt-1"
                      style={getVerdictStyle(result.verdict)}
                    >
                      {getVerdictText(result.verdict)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="p-5">
                <h3 
                  className="font-semibold mb-4"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  Score Breakdown
                </h3>
                <div className="space-y-3">
                  {/* Cash-on-Cash */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)' }}
                      >
                        <span className="text-sm">💰</span>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#2b2823' }}>Cash-on-Cash Return</div>
                        <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.cashOnCash.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: '#2b2823' }}>{result.scoring.cashOnCash.score}/{result.scoring.cashOnCash.maxScore}</div>
                      <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.cashOnCash.value.toFixed(1)}% CoC</div>
                    </div>
                  </div>

                  {/* Affordability */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)' }}
                      >
                        <span className="text-sm">🏠</span>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#2b2823' }}>Affordability</div>
                        <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.affordability.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: '#2b2823' }}>{result.scoring.affordability.score}/{result.scoring.affordability.maxScore}</div>
                      <div className="text-xs" style={{ color: '#787060' }}>${(result.scoring.affordability.value / 1000).toFixed(0)}K median</div>
                    </div>
                  </div>

                  {/* Legality */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)' }}
                      >
                        <span className="text-sm">⚖️</span>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#2b2823' }}>STR Legality</div>
                        <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.legality.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: '#2b2823' }}>{result.scoring.legality.score}/{result.scoring.legality.maxScore}</div>
                    </div>
                  </div>

                  {/* Landlord Friendly */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)' }}
                      >
                        <span className="text-sm">🤝</span>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#2b2823' }}>Landlord Friendliness</div>
                        <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.landlordFriendly.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: '#2b2823' }}>{result.scoring.landlordFriendly.score}/{result.scoring.landlordFriendly.maxScore}</div>
                    </div>
                  </div>

                  {/* Market Headroom */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)' }}
                      >
                        <span className="text-sm">📊</span>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#2b2823' }}>Market Headroom</div>
                        <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.marketHeadroom.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: '#2b2823' }}>{result.scoring.marketHeadroom.score}/{result.scoring.marketHeadroom.maxScore}</div>
                      <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.marketHeadroom.value.toFixed(1)} listings/1K</div>
                    </div>
                  </div>

                  {/* Appreciation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)' }}
                      >
                        <span className="text-sm">📈</span>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#2b2823' }}>Appreciation</div>
                        <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.appreciation.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: '#2b2823' }}>{result.scoring.appreciation.score}/{result.scoring.appreciation.maxScore}</div>
                      <div className="text-xs" style={{ color: '#787060' }}>{result.scoring.appreciation.value.toFixed(1)}% YoY</div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid #d8d6cd' }}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold" style={{ color: '#2b2823' }}>Total Score</div>
                    <div 
                      className="text-xl font-bold"
                      style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      {result.scoring.totalScore}/100
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h3 
                className="font-semibold mb-4"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Key Metrics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#e5e3da' }}>
                  <div className="text-lg font-bold" style={{ color: '#2b2823' }}>${result.avgADR}</div>
                  <div className="text-xs" style={{ color: '#787060' }}>Avg Daily Rate</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#e5e3da' }}>
                  <div className="text-lg font-bold" style={{ color: '#2b2823' }}>{result.occupancy}%</div>
                  <div className="text-xs" style={{ color: '#787060' }}>Occupancy</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#e5e3da' }}>
                  <div className="text-lg font-bold" style={{ color: '#000000' }}>${result.strMonthlyRevenue.toLocaleString()}</div>
                  <div className="text-xs" style={{ color: '#787060' }}>Monthly Revenue</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#e5e3da' }}>
                  <div className="text-lg font-bold" style={{ color: '#2b2823' }}>${(result.medianHomeValue / 1000).toFixed(0)}K</div>
                  <div className="text-xs" style={{ color: '#787060' }}>Median Home</div>
                </div>
              </div>
            </div>

            {/* View Full Analysis */}
            <Link
              href={`/city/${result.id}`}
              className="flex items-center justify-center gap-2 w-full py-4 font-semibold rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
            >
              View Full Market Analysis
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Empty State */}
        {!result && !notFound && (
          <div 
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
          >
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#e5e3da' }}
            >
              <span className="text-3xl">🏡</span>
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Enter an Address
            </h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: '#787060' }}>
              Paste any US property address above to instantly see STR investment metrics, 
              including cash-on-cash return, affordability score, and market headroom.
            </p>
          </div>
        )}

        {/* How Scoring Works */}
        <div 
          className="rounded-2xl p-5 mt-6"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <h3 
            className="font-semibold mb-4"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            How Our Scoring Works
          </h3>
          <p className="text-sm mb-4" style={{ color: '#787060' }}>
            Our scoring model is designed for investors seeking cash-flowing, self-managed STRs in affordable markets. 
            We prioritize cash flow over appreciation.
          </p>
          <div className="space-y-2 text-sm">
            {[
              { icon: '💰', label: 'Cash-on-Cash Return', points: '35 points' },
              { icon: '🏠', label: 'Affordability (Target: <$250K)', points: '25 points' },
              { icon: '⚖️', label: 'STR Legality', points: '15 points' },
              { icon: '🤝', label: 'Landlord Friendliness', points: '10 points' },
              { icon: '📊', label: 'Market Headroom', points: '10 points' },
              { icon: '📈', label: 'Appreciation', points: '5 points' },
            ].map((item, i, arr) => (
              <div 
                key={i}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #e5e3da' : 'none' }}
              >
                <span style={{ color: '#787060' }}>{item.icon} {item.label}</span>
                <span className="font-semibold" style={{ color: '#2b2823' }}>{item.points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
