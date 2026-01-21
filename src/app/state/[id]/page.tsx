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

  const getVerdict = (score: number) => {
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-500" };
    if (score >= 70) return { text: "BUY", color: "bg-green-500" };
    if (score >= 60) return { text: "HOLD", color: "bg-amber-500" };
    return { text: "AVOID", color: "bg-red-500" };
  };

  const getRPRGrade = (rpr: number) => {
    if (rpr >= 0.20) return { grade: "A+", color: "bg-emerald-500", bgLight: "bg-emerald-50" };
    if (rpr >= 0.18) return { grade: "A", color: "bg-emerald-500", bgLight: "bg-emerald-50" };
    if (rpr >= 0.15) return { grade: "B+", color: "bg-green-500", bgLight: "bg-green-50" };
    if (rpr >= 0.12) return { grade: "C", color: "bg-amber-500", bgLight: "bg-amber-50" };
    return { grade: "F", color: "bg-red-500", bgLight: "bg-red-50" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1 text-slate-300 text-sm hover:text-white mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Map
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{state.name}</h1>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getVerdict(state.marketScore).color}`}>
                  {getVerdict(state.marketScore).text}
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
        {/* Score Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-card">
          <h3 className="font-semibold text-slate-900 mb-4">STR Opportunity Score</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-4 sm:flex-col sm:text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                <div className="text-3xl font-bold">{state.marketScore}</div>
                <div className="text-xs opacity-80">/100</div>
              </div>
            </div>
            <div className="flex-1 space-y-3 w-full">
              {[
                { label: "Demand", value: state.scores.demand, icon: "📈" },
                { label: "Affordability", value: state.scores.affordability, icon: "💰" },
                { label: "Regulation", value: state.scores.regulation, icon: "📋" },
                { label: "Seasonality", value: state.scores.seasonality, icon: "🌤️" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm text-slate-600 w-24">{item.label}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-8 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-4 text-center bg-slate-50 rounded-xl p-3">
            State scores show overall market health. Tap a city below for detailed deal analysis including RPR and DSI.
          </p>
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
                  { key: "score", label: "Score", icon: "📊" },
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
          {filteredCities.map((city) => {
            const grade = getRPRGrade(city.rpr);
            return (
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
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(city.marketScore)}`}>
                      {city.marketScore}
                    </div>
                    <div className="text-xs text-slate-400">Score</div>
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
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${grade.color}`}>
                      {grade.grade} Deal
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${
                      city.dsi ? "bg-emerald-500" : "bg-red-500"
                    }`}>
                      {city.dsi ? "✓ Pays Bills" : "✗ Bills Risk"}
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
            );
          })}

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
