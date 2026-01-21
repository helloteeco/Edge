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
      // High RPR + Low saturation + Legal
      cityResults = cityResults.filter(c => 
        c.rpr >= 0.15 && 
        c.saturation < 50 && 
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
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-600" };
    if (score >= 70) return { text: "BUY", color: "bg-emerald-500" };
    if (score >= 60) return { text: "HOLD", color: "bg-yellow-500" };
    return { text: "AVOID", color: "bg-red-500" };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Search Markets</h1>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search states, cities, or counties..."
          className="w-full pl-12 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:border-primary"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[
          { key: "all", label: "All" },
          { key: "states", label: "States" },
          { key: "cities", label: "Cities & Counties" },
          { key: "minScore", label: "Min Score 70+" },
          { key: "recommended", label: "💎 Recommended" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as FilterType)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? f.key === "recommended" ? "bg-purple-600 text-white" : "bg-primary text-white"
                : "bg-surface text-foreground hover:bg-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted mb-4">{totalResults} results</p>

      {/* Results */}
      <div className="space-y-3">
        {/* States */}
        {results.states.map((state) => (
          <Link
            key={state.abbreviation}
            href={`/state/${state.abbreviation.toLowerCase()}`}
            className="block bg-white border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{state.name}</div>
                <div className="text-sm text-muted">{state.abbreviation} • State</div>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getVerdict(state.marketScore).color}`}>
                    {getVerdict(state.marketScore).text}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${state.regulation === "Legal" ? "bg-emerald-600" : "bg-yellow-600"}`}>
                    {state.regulation}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{state.marketScore}</div>
                <div className="text-xs text-muted">Score</div>
              </div>
            </div>
          </Link>
        ))}

        {/* Cities */}
        {results.cities.map((city) => (
          <Link
            key={city.id}
            href={`/city/${city.id}`}
            className="block bg-white border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{city.name}</div>
                <div className="text-sm text-muted">{city.county}, {city.stateCode}</div>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getVerdict(city.marketScore).color}`}>
                    {getVerdict(city.marketScore).text}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${city.regulation === "Legal" ? "bg-emerald-600" : "bg-yellow-600"}`}>
                    {city.regulation}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{city.marketScore}</div>
                <div className="text-xs text-muted">Score</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
