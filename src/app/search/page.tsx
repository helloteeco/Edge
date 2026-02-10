"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { cityData, stateData, getMarketCounts, DATA_LAST_UPDATED } from "@/data/helpers";
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
import { StuckHelper } from "@/components/StuckHelper";
import AuthHeader from "@/components/AuthHeader";

type FilterType = "all" | "states" | "cities" | "minScore" | "recommended" | "allCities";

// Type for server-side city search results
interface ServerCity {
  id: string;
  name: string;
  state: string;
  county: string | null;
  population: number;
  hasFullData: boolean;
  marketScore: number | null;
  cashOnCash: number | null;
  avgADR: number | null;
  occupancy: number | null;
  strMonthlyRevenue: number | null;
  medianHomeValue: number | null;
  regulation: string | null;
  fullData: Record<string, unknown> | null;
}

interface SearchResponse {
  cities: ServerCity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  
  // Server-side search state for "allCities" filter
  const [serverCities, setServerCities] = useState<ServerCity[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverPage, setServerPage] = useState(1);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);

  // Get market counts for display
  const marketCounts = useMemo(() => getMarketCounts(), []);

  // Debounced server search for allCities filter
  const searchServerCities = useCallback(async (searchQuery: string, page: number, append: boolean = false) => {
    setServerLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: page.toString(),
        limit: '50',
        sortBy: 'population',
        sortOrder: 'desc',
      });
      
      const response = await fetch(`/api/cities/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      
      const data: SearchResponse = await response.json();
      
      if (append) {
        setServerCities(prev => [...prev, ...data.cities]);
      } else {
        setServerCities(data.cities);
      }
      setServerHasMore(data.pagination.hasMore);
      setServerTotal(data.pagination.total);
      setServerPage(page);
    } catch (error) {
      console.error('Server search error:', error);
    } finally {
      setServerLoading(false);
    }
  }, []);

  // Effect to trigger server search when filter is allCities
  useEffect(() => {
    if (filter === "allCities") {
      const debounceTimer = setTimeout(() => {
        searchServerCities(query, 1, false);
      }, 300); // 300ms debounce
      
      return () => clearTimeout(debounceTimer);
    } else {
      // Clear server results when switching away from allCities
      setServerCities([]);
      setServerTotal(0);
      setServerHasMore(false);
    }
  }, [filter, query, searchServerCities]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (!serverLoading && serverHasMore) {
      searchServerCities(query, serverPage + 1, true);
    }
  }, [serverLoading, serverHasMore, query, serverPage, searchServerCities]);

  // Client-side filtering for featured cities and states
  const results = useMemo(() => {
    const searchLower = query.toLowerCase();
    
    // For "allCities" filter, use server-side results
    if (filter === "allCities") {
      return { 
        cities: [], 
        states: [], 
        serverCities: serverCities 
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

    return { cities: cityResults, states: stateResults, serverCities: [] as ServerCity[] };
  }, [query, filter, serverCities]);

  const totalResults = filter === "allCities" 
    ? serverTotal 
    : results.cities.length + results.states.length;

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
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
            
            {/* Auth Header */}
            <AuthHeader variant="light" />
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

      {/* Stuck Helper - placed above results so users see it without scrolling past all cards */}
      <div className="max-w-4xl mx-auto px-4 pt-2">
        <StuckHelper tabName="search" />
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm" style={{ color: '#787060' }}>
            {filter === "allCities" && serverLoading && serverCities.length === 0 ? (
              <span style={{ color: '#787060' }}>Searching...</span>
            ) : (
              <>
                <span className="font-semibold" style={{ color: '#2b2823' }}>{totalResults.toLocaleString()}</span> results found
                {filter === "allCities" && query && (
                  <span className="ml-2 text-xs" style={{ color: '#787060' }}>
                    (searching all US cities)
                  </span>
                )}
              </>
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
                      className="font-semibold transition-colors truncate"
                      style={{ color: '#2b2823' }}
                    >
                      {state.name}
                    </span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}
                    >
                      State
                    </span>
                  </div>
                  <div className="text-sm truncate" style={{ color: '#787060' }}>
                    {state.cityCount} cities • ${state.avgADR}/night avg
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: getVerdictStyle(state.marketScore).bg, color: getVerdictStyle(state.marketScore).color }}
                    >
                      {getVerdictStyle(state.marketScore).text}
                    </span>
                    <a
                      href={`https://www.proper.insure/regulations/${state.abbreviation.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                    >
                      STR Rules →
                    </a>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRightIcon className="w-5 h-5" color="#d8d6cd" />
              </div>
            </Link>
          ))}

          {/* Featured Cities (client-side) */}
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
                  <div className="text-sm truncate" style={{ color: '#787060' }}>
                    {city.county}, {city.stateCode} • Pop. {city.population.toLocaleString()}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: getVerdictStyle(city.marketScore).bg, color: getVerdictStyle(city.marketScore).color }}
                    >
                      {getVerdictStyle(city.marketScore).text}
                    </span>
                    <a
                      href={`https://www.proper.insure/regulations/${city.stateCode.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                    >
                      STR Rules →
                    </a>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRightIcon className="w-5 h-5" color="#d8d6cd" />
              </div>
            </Link>
          ))}

          {/* Server-side Cities (All Cities filter) */}
          {results.serverCities.map((city) => (
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
                    style={getScoreBgStyle(city.marketScore || 0)}
                  >
                    <span 
                      className="text-xl font-bold"
                      style={{ ...getScoreStyle(city.marketScore || 0), fontFamily: 'Source Serif Pro, Georgia, serif' }}
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
                    <div className="text-sm truncate" style={{ color: '#787060' }}>
                      {city.county && `${city.county}, `}{city.state} • Pop. {city.population.toLocaleString()}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span 
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: getVerdictStyle(city.marketScore || 0).bg, color: getVerdictStyle(city.marketScore || 0).color }}
                      >
                        {getVerdictStyle(city.marketScore || 0).text}
                      </span>
                      {city.state && (
                        <a
                          href={`https://www.proper.insure/regulations/${city.state.toLowerCase()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                        >
                          STR Rules →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRightIcon className="w-5 h-5" color="#d8d6cd" />
                </div>
              </Link>
            ) : (
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
                  {/* Placeholder Circle */}
                  <div 
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                    style={{ backgroundColor: 'rgba(120, 112, 96, 0.06)' }}
                  >
                    <span 
                      className="text-xl font-bold"
                      style={{ color: '#9a9488', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      --
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
                        style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
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

          {/* Loading indicator for server search */}
          {filter === "allCities" && serverLoading && (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#787060', borderTopColor: 'transparent' }}></div>
                <span style={{ color: '#787060' }}>Loading cities...</span>
              </div>
            </div>
          )}

          {/* Load More button for server results */}
          {filter === "allCities" && serverHasMore && !serverLoading && (
            <button
              onClick={loadMore}
              className="w-full py-4 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
            >
              Load More Cities ({serverCities.length} of {serverTotal.toLocaleString()})
            </button>
          )}

          {/* Empty State */}
          {totalResults === 0 && !serverLoading && (
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
        {filter === "allCities" && results.serverCities.length > 0 && (
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
