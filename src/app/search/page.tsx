"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cityData, stateData } from "@/data/helpers";

type FilterType = "all" | "states" | "cities" | "minScore" | "recommended";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const results = useMemo(() => {
    const searchLower = query.toLowerCase();
    
    let cityResults = cityData.filter(city => 
      city.name.toLowerCase().includes(searchLower) ||
      city.county.toLowerCase().includes(searchLower) ||
      city.stateCode.toLowerCase().includes(searchLower)
    );

    let stateResults = stateData.filter(state =>
      state.name.toLowerCase().includes(searchLower) ||
      state.abbreviation.toLowerCase().includes(searchLower)
    );

    // Apply filters
    if (filter === "states") {
      cityResults = [];
    } else if (filter === "cities") {
      stateResults = [];
    } else if (filter === "minScore") {
      cityResults = cityResults.filter(c => c.marketScore >= 70);
      stateResults = stateResults.filter(s => s.marketScore >= 70);
    } else if (filter === "recommended") {
      // High Cash-on-Cash + Good market headroom + Legal
      cityResults = cityResults.filter(c => 
        c.marketScore >= 65 && 
        c.marketHeadroom >= 8 && 
        c.regulation === "Legal"
      );
      stateResults = [];
    }

    // Sort by score
    cityResults.sort((a, b) => b.marketScore - a.marketScore);
    stateResults.sort((a, b) => b.marketScore - a.marketScore);

    return { cities: cityResults.slice(0, 50), states: stateResults.slice(0, 10) };
  }, [query, filter]);

  const totalResults = results.cities.length + results.states.length;

  const getVerdict = (score: number) => {
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-500" };
    if (score >= 70) return { text: "BUY", color: "bg-green-500" };
    if (score >= 60) return { text: "HOLD", color: "bg-amber-500" };
    return { text: "AVOID", color: "bg-red-500" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const filters = [
    { key: "all", label: "All", icon: "📋" },
    { key: "states", label: "States", icon: "🗺️" },
    { key: "cities", label: "Cities", icon: "🏙️" },
    { key: "minScore", label: "Score 70+", icon: "⭐" },
    { key: "recommended", label: "Hidden Gems", icon: "💎" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-900 mb-4">Search Markets</h1>
          
          {/* Search Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search states, cities, or counties..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto py-3 -mx-4 px-4 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as FilterType)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? f.key === "recommended" 
                      ? "bg-purple-600 text-white shadow-md" 
                      : "bg-teal-600 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{totalResults}</span> results found
          </p>
          {filter === "recommended" && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
              High CoC • Low Competition • Legal
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="space-y-3">
          {/* States */}
          {results.states.map((state) => (
            <Link
              key={state.abbreviation}
              href={`/state/${state.abbreviation.toLowerCase()}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Score Circle */}
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                  state.marketScore >= 80 ? "bg-emerald-50" : 
                  state.marketScore >= 70 ? "bg-green-50" : 
                  state.marketScore >= 60 ? "bg-amber-50" : "bg-red-50"
                }`}>
                  <span className={`text-xl font-bold ${getScoreColor(state.marketScore)}`}>
                    {state.marketScore}
                  </span>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                      {state.name}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      State
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">{state.abbreviation}</div>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${getVerdict(state.marketScore).color}`}>
                      {getVerdict(state.marketScore).text}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${
                      state.regulation === "Legal" ? "bg-emerald-500" : "bg-amber-500"
                    }`}>
                      {state.regulation}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Cities */}
          {results.cities.map((city) => (
            <Link
              key={city.id}
              href={`/city/${city.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Score Circle */}
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                  city.marketScore >= 80 ? "bg-emerald-50" : 
                  city.marketScore >= 70 ? "bg-green-50" : 
                  city.marketScore >= 60 ? "bg-amber-50" : "bg-red-50"
                }`}>
                  <span className={`text-xl font-bold ${getScoreColor(city.marketScore)}`}>
                    {city.marketScore}
                  </span>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors truncate">
                    {city.name}
                  </div>
                  <div className="text-sm text-slate-500 truncate">{city.county}, {city.stateCode}</div>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${getVerdict(city.marketScore).color}`}>
                      {getVerdict(city.marketScore).text}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${
                      city.regulation === "Legal" ? "bg-emerald-500" : "bg-amber-500"
                    }`}>
                      {city.regulation}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Empty State */}
          {totalResults === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No results found</h3>
              <p className="text-slate-500 text-sm">
                Try adjusting your search or filters to find what you&apos;re looking for.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
