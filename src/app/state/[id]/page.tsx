"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCitiesByState, getStateByCode } from "@/data/helpers";

type SortOption = "score" | "adr" | "revenue" | "price";
type FilterOption = "all" | "gems" | "legal" | "restricted";

export default function StatePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [isSaved, setIsSaved] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  const state = getStateByCode(id);
  const cities = getCitiesByState(id);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedStates") || "[]");
    setIsSaved(saved.includes(state?.abbreviation));
  }, [state?.abbreviation]);

  const toggleSave = () => {
    const saved = JSON.parse(localStorage.getItem("savedStates") || "[]");
    let updated;
    if (isSaved) {
      updated = saved.filter((code: string) => code !== state?.abbreviation);
    } else {
      updated = [...saved, state?.abbreviation];
    }
    localStorage.setItem("savedStates", JSON.stringify(updated));
    setIsSaved(!isSaved);
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🗺️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">State not found</h1>
          <Link href="/" className="text-teal-600 font-medium hover:text-teal-700">
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

  // Filter and sort cities
  let filteredCities = [...cities];
  
  if (filterBy === "gems") {
    filteredCities = filteredCities.filter(c => c.rpr >= 0.15 && c.saturation < 50);
  } else if (filterBy === "legal") {
    filteredCities = filteredCities.filter(c => c.regulation === "Legal");
  } else if (filterBy === "restricted") {
    filteredCities = filteredCities.filter(c => c.regulation !== "Legal");
  }

  filteredCities.sort((a, b) => {
    switch (sortBy) {
      case "adr": return b.avgADR - a.avgADR;
      case "revenue": return b.strMonthlyRevenue - a.strMonthlyRevenue;
      case "price": return a.medianHomeValue - b.medianHomeValue;
      default: return b.marketScore - a.marketScore;
    }
  });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-emerald-500';
      case 'A': return 'bg-emerald-400';
      case 'B+': return 'bg-teal-500';
      case 'B': return 'bg-teal-400';
      case 'C': return 'bg-amber-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 75) return "text-emerald-500";
    if (score >= 65) return "text-teal-600";
    if (score >= 55) return "text-teal-500";
    if (score >= 45) return "text-amber-600";
    if (score >= 35) return "text-orange-500";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1 text-teal-200 text-sm hover:text-white mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Map
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{state.name}</h1>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getGradeColor(state.grade)}`}>
                  {getVerdictText(state.verdict)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                  state.regulation === "Legal" ? "bg-emerald-500" : "bg-amber-500"
                }`}>
                  {state.regulation}
                </span>
              </div>
            </div>
            <button
              onClick={toggleSave}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              aria-label={isSaved ? "Remove from saved" : "Save state"}
            >
              <span className="text-2xl">{isSaved ? "❤️" : "🤍"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Score Card with Grade Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">State Investment Grade</h3>
            <span className="text-sm text-slate-500">Based on city averages</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-4 sm:flex-col sm:text-center">
              <div className={`w-20 h-20 ${getGradeColor(state.grade)} rounded-2xl flex flex-col items-center justify-center text-white shadow-lg`}>
                <div className="text-3xl font-bold">{state.grade}</div>
              </div>
              <div className="sm:mt-2">
                <div className="text-2xl font-bold text-slate-900">{state.marketScore}/100</div>
                <div className="text-sm text-slate-500">{getVerdictText(state.verdict)}</div>
              </div>
            </div>
            
            {/* City Grade Distribution */}
            <div className="flex-1 w-full">
              <div className="text-sm font-medium text-slate-700 mb-3">Market Grade Distribution</div>
              <div className="space-y-2">
                {state.cityGrades.map(({ grade, count }) => {
                  const percentage = (count / cities.length) * 100;
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <span className={`w-8 h-8 ${getGradeColor(grade)} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                        {grade}
                      </span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getGradeColor(grade)} rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-16 text-right">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500 text-center bg-slate-50 rounded-xl p-3">
              State grade is calculated as the average of the top 50% performing cities. 
              This prevents a few poor markets from unfairly penalizing an otherwise strong state.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Regulation", value: state.regulation, color: state.regulation === "Legal" ? "text-emerald-600" : "text-amber-600" },
            { label: "Avg ADR", value: `$${state.avgADR}`, color: "text-slate-900" },
            { label: "Median Home", value: `$${(state.medianHomeValue / 1000).toFixed(0)}K`, color: "text-slate-900" },
            { label: "1Y Appreciation", value: `${state.appreciation >= 0 ? "+" : ""}${state.appreciation}%`, color: state.appreciation >= 0 ? "text-emerald-600" : "text-red-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
              <div className={`font-bold text-lg ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Sort & Filter */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-2 font-medium">Sort by</div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "score", label: "Grade", icon: "📊" },
                  { key: "adr", label: "ADR", icon: "💵" },
                  { key: "revenue", label: "Revenue", icon: "📈" },
                  { key: "price", label: "Price ↓", icon: "🏠" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key as SortOption)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      sortBy === opt.key 
                        ? "bg-teal-600 text-white shadow-sm" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span className="text-xs">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-2 font-medium">Filter</div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "all", label: "All" },
                  { key: "gems", label: "💎 Hidden Gems" },
                  { key: "legal", label: "Legal" },
                  { key: "restricted", label: "Restricted" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFilterBy(opt.key as FilterOption)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterBy === opt.key
                        ? opt.key === "gems" ? "bg-purple-600 text-white shadow-sm" : "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cities List */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{filteredCities.length}</span> markets found
          </p>
          {filterBy === "gems" && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
              High RPR • Low Saturation
            </span>
          )}
        </div>

        <div className="space-y-3">
          {filteredCities.map((city) => (
            <Link
              key={city.id}
              href={`/city/${city.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                    {city.name}
                  </div>
                  <div className="text-sm text-slate-500">{city.county}</div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className={`w-10 h-10 ${getGradeColor(city.grade)} rounded-lg flex items-center justify-center text-white font-bold`}>
                    {city.grade}
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${getScoreColor(city.marketScore)}`}>
                      {city.marketScore}
                    </div>
                    <div className="text-xs text-slate-400">Score</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: "ADR", value: `$${city.avgADR}` },
                  { label: "Occupancy", value: `${city.occupancy}%` },
                  { label: "Monthly", value: `$${city.strMonthlyRevenue.toLocaleString()}`, highlight: true },
                  { label: "Price", value: `$${(city.medianHomeValue / 1000).toFixed(0)}K` },
                ].map((stat) => (
                  <div key={stat.label} className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">{stat.label}</div>
                    <div className={`text-sm font-semibold ${stat.highlight ? "text-emerald-600" : "text-slate-700"}`}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${getGradeColor(city.grade)}`}>
                    {city.scoring.cashOnCash.rating.split(' ')[0]}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${
                    city.dsi ? "bg-emerald-500" : "bg-red-500"
                  }`}>
                    {city.dsi ? "✓ Pays Bills" : "✗ Bills Risk"}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${
                    city.regulation === "Legal" ? "bg-teal-500" : "bg-amber-500"
                  }`}>
                    {city.regulation}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-teal-600 text-sm font-medium group-hover:gap-2 transition-all">
                  View
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}

          {filteredCities.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No markets found</h3>
              <p className="text-slate-500 text-sm">
                Try adjusting your filters to see more results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
