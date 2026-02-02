"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cityData, stateData, searchUnifiedCities, getMarketCounts, UnifiedCity, DATA_LAST_UPDATED } from "@/data/helpers";
import {
  SearchIcon,
  XIcon,
  ChevronRightIcon,
  MapIcon,
  HomeEquityIcon,
  StarIcon,
  TrendUpIcon,
  GemIcon,
} from "@/components/Icons";

type FilterType = "all" | "states" | "cities" | "minScore" | "recommended" | "allCities";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Get market counts for display
  const marketCounts = useMemo(() => getMarketCounts(), []);

  const results = useMemo(() => {
    const searchLower = query.toLowerCase();
    
    // For "allCities" filter, use unified search (includes basic cities)
    if (filter === "allCities") {
      const unifiedResults = searchUnifiedCities(query, 100);
      return { 
        cities: [], 
        states: [], 
        unifiedCities: unifiedResults 
      };
    }
    
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
      // Hidden Gems: Good score + Legal + Affordable (under $250K median)
      cityResults = cityResults.filter(c => 
        c.marketScore >= 70 && 
        c.regulation === "Legal" &&
        c.medianHomeValue <= 250000
      );
      stateResults = [];
    }

    // Sort by score
    cityResults.sort((a, b) => b.marketScore - a.marketScore);
    stateResults.sort((a, b) => b.marketScore - a.marketScore);

    return { cities: cityResults, states: stateResults, unifiedCities: [] as UnifiedCity[] };
  }, [query, filter]);

  const totalResults = results.cities.length + results.states.length + results.unifiedCities.length;

  const getVerdictStyle = (score: number) => {
    if (score >= 80) return { text: "STRONG BUY", bg: '#2b2823', color: '#ffffff' };
    if (score >= 70) return { text: "BUY", bg: '#3d3a34', color: '#ffffff' };
    if (score >= 60) return { text: "HOLD", bg: '#787060', color: '#ffffff' };
    return { text: "AVOID", bg: '#e5e3da', color: '#787060' };
  };

  const getScoreStyle = (score: number) => {
    if (score >= 80) return { color: '#000000' };
    if (score >= 70) return { color: '#2b2823' };
    if (score >= 60) return { color: '#787060' };
    return { color: '#9a9488' };
  };

  const getScoreBgStyle = (score: number) => {
    if (score >= 80) return { backgroundColor: 'rgba(43, 40, 35, 0.08)' };
    if (score >= 70) return { backgroundColor: 'rgba(43, 40, 35, 0.06)' };
    if (score >= 60) return { backgroundColor: 'rgba(120, 112, 96, 0.08)' };
    return { backgroundColor: 'rgba(120, 112, 96, 0.06)' };
  };

  const filters = [
    { key: "all", label: "Featured", Icon: StarIcon },
    { key: "allCities", label: `All ${marketCounts.total.toLocaleString()}+ Cities`, Icon: MapIcon },
    { key: "states", label: "States", Icon: MapIcon },
    { key: "cities", label: "Cities", Icon: HomeEquityIcon },
    { key: "minScore", label: "Score 70+", Icon: TrendUpIcon },
    { key: "recommended", label: "Hidden Gems", Icon: GemIcon },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div 
        className="sticky top-0 z-10"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #d8d6cd'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#f0f9ff', border: '1px solid #7dd3fc' }}
            >
              <SearchIcon className="w-5 h-5" color="#0284c7" />
            </div>
            <div>
              <h1 
                className="text-2xl font-bold"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Search Markets
              </h1>
              <p className="text-xs" style={{ color: '#787060' }}>
                {marketCounts.total.toLocaleString()}+ cities • {marketCounts.withFullData} with full STR data • Updated {DATA_LAST_UPDATED}
              </p>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#787060' }}>
              <SearchIcon className="w-5 h-5" color="#787060" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any US city, state, or county..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl transition-all"
              style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #d8d6cd',
                color: '#2b2823'
              }}
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: '#787060' }}
              >
                <XIcon className="w-5 h-5" color="#787060" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto py-4 -mx-4 px-4 scrollbar-hide">
            {filters.map((f) => {
              const IconComponent = f.Icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as FilterType)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                  style={{ 
                    backgroundColor: filter === f.key ? '#2b2823' : '#ffffff',
                    color: filter === f.key ? '#ffffff' : '#787060',
                    border: filter === f.key ? 'none' : '1px solid #d8d6cd',
                    boxShadow: filter === f.key ? '0 2px 8px -2px rgba(43, 40, 35, 0.2)' : 'none'
                  }}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" color={filter === f.key ? '#ffffff' : '#787060'} />}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm" style={{ color: '#787060' }}>
            <span className="font-semibold" style={{ color: '#2b2823' }}>{totalResults}</span> results found
            {filter === "allCities" && query && (
              <span className="ml-2 text-xs" style={{ color: '#787060' }}>
                (searching all US cities)
              </span>
            )}
          </p>
          {filter === "recommended" && (
            <span 
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(43, 40, 35, 0.08)', color: '#2b2823' }}
            >
              High CoC • Low Competition • Legal
            </span>
          )}
          {filter === "allCities" && (
            <span 
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(43, 40, 35, 0.08)', color: '#2b2823' }}
            >
              All US Cities
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
              className="block rounded-xl p-4 transition-all duration-300 group"
              style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #d8d6cd',
                boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(43, 40, 35, 0.12)';
                e.currentTarget.style.borderColor = '#787060';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(43, 40, 35, 0.04)';
                e.currentTarget.style.borderColor = '#d8d6cd';
              }}
            >
              <div className="flex items-center gap-4">
                {/* Score Circle */}
                <div 
                  className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                  style={getScoreBgStyle(state.marketScore)}
                >
                  <span 
                    className="text-xl font-bold"
                    style={{ ...getScoreStyle(state.marketScore), fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    {state.marketScore}
                  </span>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span 
                      className="font-semibold transition-colors"
                      style={{ color: '#2b2823' }}
                    >
                      {state.name}
                    </span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                    >
                      State
                    </span>
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: '#787060' }}>{state.abbreviation}</div>
                  <div className="flex gap-2 mt-2">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: getVerdictStyle(state.marketScore).bg, color: getVerdictStyle(state.marketScore).color }}
                    >
                      {getVerdictStyle(state.marketScore).text}
                    </span>
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ 
                        backgroundColor: state.regulation === "Legal" ? '#2b2823' : '#787060',
                        color: '#ffffff'
                      }}
                    >
                      {state.regulation}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRightIcon className="w-5 h-5" color="#d8d6cd" />
              </div>
            </Link>
          ))}

          {/* Featured Cities (with full data) */}
          {results.cities.map((city) => (
            <Link
              key={city.id}
              href={`/city/${city.id}`}
              className="block rounded-xl p-4 transition-all duration-300 group"
              style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #d8d6cd',
                boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(43, 40, 35, 0.12)';
                e.currentTarget.style.borderColor = '#787060';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(43, 40, 35, 0.04)';
                e.currentTarget.style.borderColor = '#d8d6cd';
              }}
            >
              <div className="flex items-center gap-4">
                {/* Score Circle */}
                <div 
                  className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                  style={getScoreBgStyle(city.marketScore)}
                >
                  <span 
                    className="text-xl font-bold"
                    style={{ ...getScoreStyle(city.marketScore), fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    {city.marketScore}
                  </span>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span 
                      className="font-semibold transition-colors truncate"
                      style={{ color: '#2b2823' }}
                    >
                      {city.name}
                    </span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                    >
                      Full Data
                    </span>
                  </div>
                  <div className="text-sm truncate" style={{ color: '#787060' }}>{city.county}, {city.stateCode}</div>
                  <div className="flex gap-2 mt-2">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: getVerdictStyle(city.marketScore).bg, color: getVerdictStyle(city.marketScore).color }}
                    >
                      {getVerdictStyle(city.marketScore).text}
                    </span>
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ 
                        backgroundColor: city.regulation === "Legal" ? '#2b2823' : '#787060',
                        color: '#ffffff'
                      }}
                    >
                      {city.regulation}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRightIcon className="w-5 h-5" color="#d8d6cd" />
              </div>
            </Link>
          ))}

          {/* Unified Cities (all cities including basic) */}
          {results.unifiedCities.map((city) => (
            city.hasFullData ? (
              <Link
                key={city.id}
                href={`/city/${city.id}`}
                className="block rounded-xl p-4 transition-all duration-300 group"
                style={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #d8d6cd',
                  boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(43, 40, 35, 0.12)';
                  e.currentTarget.style.borderColor = '#787060';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(43, 40, 35, 0.04)';
                  e.currentTarget.style.borderColor = '#d8d6cd';
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Score Circle */}
                  <div 
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                    style={getScoreBgStyle(city.fullData!.marketScore)}
                  >
                    <span 
                      className="text-xl font-bold"
                      style={{ ...getScoreStyle(city.fullData!.marketScore), fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      {city.fullData!.marketScore}
                    </span>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-semibold transition-colors truncate"
                        style={{ color: '#2b2823' }}
                      >
                        {city.name}
                      </span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                      >
                        Full Data
                      </span>
                    </div>
                    <div className="text-sm truncate" style={{ color: '#787060' }}>
                      {city.fullData!.county}, {city.state} • Pop. {city.population.toLocaleString()}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span 
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: getVerdictStyle(city.fullData!.marketScore).bg, color: getVerdictStyle(city.fullData!.marketScore).color }}
                      >
                        {getVerdictStyle(city.fullData!.marketScore).text}
                      </span>
                      <span 
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ 
                          backgroundColor: city.fullData!.regulation === "Legal" ? '#2b2823' : '#787060',
                          color: '#ffffff'
                        }}
                      >
                        {city.fullData!.regulation}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRightIcon className="w-5 h-5" color="#d8d6cd" />
                </div>
              </Link>
            ) : (
              // Basic city (no full STR data yet)
              <div
                key={city.id}
                className="block rounded-xl p-4 transition-all duration-300"
                style={{ 
                  backgroundColor: '#fafaf8',
                  border: '1px solid #e5e3da',
                  boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.02)'
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Placeholder Score */}
                  <div 
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                    style={{ backgroundColor: '#f0f0ec' }}
                  >
                    <span 
                      className="text-sm font-medium"
                      style={{ color: '#9a9488' }}
                    >
                      —
                    </span>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-semibold truncate"
                        style={{ color: '#787060' }}
                      >
                        {city.name}
                      </span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: '#f5f5f0', color: '#9a9488', border: '1px solid #e5e3da' }}
                      >
                        Coming Soon
                      </span>
                    </div>
                    <div className="text-sm truncate" style={{ color: '#9a9488' }}>
                      {city.state} • Pop. {city.population.toLocaleString()}
                    </div>
                    <div className="mt-2">
                      <span 
                        className="text-xs"
                        style={{ color: '#9a9488' }}
                      >
                        STR data coming soon • Use calculator for property analysis
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}

          {/* Empty State */}
          {totalResults === 0 && (
            <div 
              className="rounded-2xl p-10 text-center"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#f5f5f0', border: '1px solid #e5e3da' }}
              >
                <SearchIcon className="w-8 h-8" color="#787060" />
              </div>
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                {query ? "No results found" : "Start searching"}
              </h3>
              <p className="text-sm" style={{ color: '#787060' }}>
                {query 
                  ? "Try adjusting your search or use the 'All Cities' filter to search all US cities."
                  : `Search ${marketCounts.total.toLocaleString()}+ US cities by name, state, or county.`
                }
              </p>
              {query && filter !== "allCities" && (
                <button
                  onClick={() => setFilter("allCities")}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                >
                  Search All {marketCounts.total.toLocaleString()}+ Cities
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info Banner for All Cities filter */}
        {filter === "allCities" && results.unifiedCities.length > 0 && (
          <div 
            className="mt-6 rounded-xl p-4 text-center"
            style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}
          >
            <p className="text-sm" style={{ color: '#0369a1' }}>
              <strong>Tip:</strong> Cities with &quot;Full Data&quot; badges have complete STR analytics. 
              For other cities, use the <Link href="/calculator" className="underline font-medium">Calculator</Link> to analyze specific properties.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
