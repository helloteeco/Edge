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
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
        <h1 className="text-2xl font-bold">State not found</h1>
        <Link href="/" className="text-primary mt-4 inline-block">← Back to Map</Link>
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
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-600" };
    if (score >= 70) return { text: "BUY", color: "bg-emerald-500" };
    if (score >= 60) return { text: "HOLD", color: "bg-yellow-500" };
    return { text: "AVOID", color: "bg-red-500" };
  };

  const getRPRGrade = (rpr: number) => {
    if (rpr >= 0.20) return { grade: "A+", color: "bg-emerald-600" };
    if (rpr >= 0.18) return { grade: "A", color: "bg-emerald-500" };
    if (rpr >= 0.15) return { grade: "B+", color: "bg-emerald-400" };
    if (rpr >= 0.12) return { grade: "C", color: "bg-yellow-500" };
    return { grade: "F", color: "bg-red-500" };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/" className="text-muted text-sm hover:text-primary mb-2 inline-block">← Back to Map</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{state.name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getVerdict(state.marketScore).color}`}>
              {getVerdict(state.marketScore).text}
            </span>
          </div>
        </div>
        <button
          onClick={toggleSave}
          className="p-2 text-2xl hover:scale-110 transition-transform"
        >
          {isSaved ? "❤️" : "🤍"}
        </button>
      </div>

      {/* Score Card */}
      <div className="bg-white border border-border rounded-xl p-4 mb-6">
        <h3 className="font-semibold mb-4">STR Opportunity Score</h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{state.marketScore}</div>
            <div className="text-sm text-muted">/100</div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: "Demand", value: state.scores.demand },
              { label: "Affordability", value: state.scores.affordability },
              { label: "Regulation", value: state.scores.regulation },
              { label: "Seasonality", value: state.scores.seasonality },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-sm text-muted w-24">{item.label}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted mt-4 text-center">
          State scores show overall market health. Tap a city below for detailed deal analysis including RPR and DSI.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Regulation</div>
          <div className={`font-semibold ${state.regulation === "Legal" ? "text-emerald-600" : "text-yellow-600"}`}>
            {state.regulation}
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Avg ADR</div>
          <div className="font-semibold">${state.avgADR}</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Median Home</div>
          <div className="font-semibold">${(state.medianHomeValue / 1000).toFixed(0)}K</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Appreciation</div>
          <div className={`font-semibold ${state.appreciation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {state.appreciation >= 0 ? "+" : ""}{state.appreciation}%
          </div>
        </div>
      </div>

      {/* Sort & Filter */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm text-muted">Sort:</span>
          {[
            { key: "score", label: "Score" },
            { key: "adr", label: "ADR" },
            { key: "revenue", label: "Revenue" },
            { key: "price", label: "Price ↓" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key as SortOption)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                sortBy === opt.key ? "bg-primary text-white" : "bg-surface text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm text-muted">Filter:</span>
          {[
            { key: "all", label: "All" },
            { key: "gems", label: "💎 Hidden Gems" },
            { key: "legal", label: "Legal" },
            { key: "restricted", label: "Restricted" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterBy(opt.key as FilterOption)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filterBy === opt.key
                  ? opt.key === "gems" ? "bg-purple-600 text-white" : "bg-primary text-white"
                  : "bg-surface text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cities List */}
      <p className="text-sm text-muted mb-3">{filteredCities.length} markets • Tap for details</p>
      <div className="space-y-3">
        {filteredCities.map((city) => (
          <Link
            key={city.id}
            href={`/city/${city.id}`}
            className="block bg-white border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium">{city.name}</div>
                <div className="text-sm text-muted">{city.county}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{city.marketScore}</div>
                <div className="text-xs text-muted">Score</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
              <div>
                <div className="text-muted text-xs">ADR</div>
                <div className="font-medium">${city.avgADR}</div>
              </div>
              <div>
                <div className="text-muted text-xs">Occupancy</div>
                <div className="font-medium">{city.occupancy}%</div>
              </div>
              <div>
                <div className="text-muted text-xs">Monthly</div>
                <div className="font-medium text-emerald-600">${city.strMonthlyRevenue.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted text-xs">Median Price</div>
                <div className="font-medium">${(city.medianHomeValue / 1000).toFixed(0)}K</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getRPRGrade(city.rpr).color}`}>
                  {getRPRGrade(city.rpr).grade} Deal
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${city.dsi ? "bg-emerald-600" : "bg-red-500"}`}>
                  {city.dsi ? "✓ Bills" : "✗ Bills"}
                </span>
              </div>
              <span className="text-primary text-sm">View →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
