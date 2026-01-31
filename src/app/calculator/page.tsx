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
    // Simply redirect to Rabbu's Airbnb Calculator
    window.open('https://www.rabbu.com/airbnb-calculator', '_blank', 'noopener,noreferrer');
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-emerald-500 text-white';
      case 'A': return 'bg-emerald-400 text-white';
      case 'B+': return 'bg-teal-500 text-white';
      case 'B': return 'bg-teal-400 text-white';
      case 'C': return 'bg-amber-500 text-white';
      case 'D': return 'bg-orange-500 text-white';
      default: return 'bg-red-500 text-white';
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

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return 'text-emerald-600';
      case 'buy': return 'text-emerald-500';
      case 'hold': return 'text-amber-600';
      case 'caution': return 'text-orange-500';
      default: return 'text-red-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-teal-200 hover:text-white mb-4 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Map
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">📍</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Address Calculator</h1>
          </div>
          <p className="text-teal-100 text-base max-w-xl">
            Paste any US address to get an instant STR investment analysis
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Property Address
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 123 Main St, Orlando, FL 32801"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 placeholder-slate-400"
            />
            <button
              onClick={handleAnalyze}
              disabled={isSearching || !address.trim()}
              className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Enter a full address including city and state (e.g., &quot;123 Main St, Kissimmee, FL&quot;)
          </p>
          
          {/* Rabbu Redirect Button */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={openInRabbu}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors border border-slate-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Rabbu (third-party site)
            </button>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Get detailed Airbnb revenue estimates from Rabbu.com
            </p>
          </div>
        </div>

        {/* Not Found Message */}
        {notFound && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🔍</span>
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Market Not Found</h3>
                <p className="text-amber-700 text-sm">
                  We couldn&apos;t find STR data for this location. This may be because:
                </p>
                <ul className="text-amber-700 text-sm mt-2 list-disc list-inside space-y-1">
                  <li>The city isn&apos;t in our database yet</li>
                  <li>The address format wasn&apos;t recognized</li>
                  <li>Try using just the city and state (e.g., &quot;Orlando, FL&quot;)</li>
                </ul>
                <Link href="/search" className="inline-flex items-center gap-1 text-teal-600 font-medium text-sm mt-3 hover:text-teal-700">
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
            <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{result.name}, {result.stateCode}</h2>
                    <p className="text-teal-100 mt-1">{result.county}</p>
                  </div>
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl text-2xl font-bold ${getGradeColor(result.grade)}`}>
                      {result.grade}
                    </div>
                    <div className={`text-sm font-semibold mt-1 ${getVerdictColor(result.verdict)}`}>
                      {getVerdictText(result.verdict)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  {/* Cash-on-Cash */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">💰</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Cash-on-Cash (RPR)</div>
                        <div className="text-xs text-slate-500">{result.scoring.cashOnCash.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{result.scoring.cashOnCash.score}/{result.scoring.cashOnCash.maxScore}</div>
                      <div className="text-xs text-slate-500">{result.scoring.cashOnCash.value.toFixed(1)}% RPR</div>
                    </div>
                  </div>

                  {/* Affordability */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">🏠</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Affordability</div>
                        <div className="text-xs text-slate-500">{result.scoring.affordability.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{result.scoring.affordability.score}/{result.scoring.affordability.maxScore}</div>
                      <div className="text-xs text-slate-500">${(result.scoring.affordability.value / 1000).toFixed(0)}K median</div>
                    </div>
                  </div>

                  {/* Legality */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">⚖️</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">STR Legality</div>
                        <div className="text-xs text-slate-500">{result.scoring.legality.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{result.scoring.legality.score}/{result.scoring.legality.maxScore}</div>
                    </div>
                  </div>

                  {/* Landlord Friendly */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">🤝</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Landlord Friendliness</div>
                        <div className="text-xs text-slate-500">{result.scoring.landlordFriendly.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{result.scoring.landlordFriendly.score}/{result.scoring.landlordFriendly.maxScore}</div>
                    </div>
                  </div>

                  {/* Saturation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">📊</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Saturation Risk</div>
                        <div className="text-xs text-slate-500">{result.scoring.saturation.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{result.scoring.saturation.score}/{result.scoring.saturation.maxScore}</div>
                      <div className="text-xs text-slate-500">{result.scoring.saturation.value.toFixed(1)} listings/1K</div>
                    </div>
                  </div>

                  {/* Appreciation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">📈</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Appreciation</div>
                        <div className="text-xs text-slate-500">{result.scoring.appreciation.rating}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{result.scoring.appreciation.score}/{result.scoring.appreciation.maxScore}</div>
                      <div className="text-xs text-slate-500">{result.scoring.appreciation.value.toFixed(1)}% YoY</div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">Total Score</div>
                    <div className="text-xl font-bold text-teal-600">{result.scoring.totalScore}/100</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Key Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-slate-900">${result.avgADR}</div>
                  <div className="text-xs text-slate-500">Avg Daily Rate</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-slate-900">{result.occupancy}%</div>
                  <div className="text-xs text-slate-500">Occupancy</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-emerald-600">${result.strMonthlyRevenue.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Monthly Revenue</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-slate-900">${(result.medianHomeValue / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-slate-500">Median Home</div>
                </div>
              </div>
            </div>

            {/* View Full Analysis */}
            <Link
              href={`/city/${result.id}`}
              className="flex items-center justify-center gap-2 w-full py-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏡</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Enter an Address</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Paste any US property address above to instantly see STR investment metrics, 
              including cash-on-cash return, affordability score, and market saturation.
            </p>
          </div>
        )}

        {/* How Scoring Works */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-5 mt-6">
          <h3 className="font-semibold text-slate-900 mb-4">How Our Scoring Works</h3>
          <p className="text-slate-600 text-sm mb-4">
            Our scoring model is designed for investors seeking cash-flowing, self-managed STRs in affordable markets. 
            We prioritize cash flow over appreciation.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700">💰 Cash-on-Cash Return (RPR)</span>
              <span className="font-semibold text-slate-900">35 points</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700">🏠 Affordability (Target: &lt;$250K)</span>
              <span className="font-semibold text-slate-900">25 points</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700">⚖️ STR Legality</span>
              <span className="font-semibold text-slate-900">15 points</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700">🤝 Landlord Friendliness</span>
              <span className="font-semibold text-slate-900">10 points</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700">📊 Saturation Risk</span>
              <span className="font-semibold text-slate-900">10 points</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-700">📈 Appreciation</span>
              <span className="font-semibold text-slate-900">5 points</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
