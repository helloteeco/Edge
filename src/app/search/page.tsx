"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { cityData, stateData, getMarketCounts, DATA_LAST_UPDATED } from "@/data/helpers";
import {
  SearchIcon,
  XIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MapIcon,
  HomeEquityIcon,
  StarIcon,
  TrendUpIcon,
  GemIcon,
  DollarIcon,
} from "@/components/Icons";
import { StuckHelper } from "@/components/StuckHelper";
import AuthHeader from "@/components/AuthHeader";

type FilterType = "all" | "states" | "cities" | "minScore" | "recommended" | "allCities";
type SortOption = "score" | "homeValue" | "homeValueAsc" | "adr" | "revenue" | "cashOnCash";
type RegulationFilter = "all" | "legal" | "restricted";

// Price bracket presets
const HOME_VALUE_BRACKETS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under $200K", min: 0, max: 200000 },
  { label: "$200K–$350K", min: 200000, max: 350000 },
  { label: "$350K–$500K", min: 350000, max: 500000 },
  { label: "$500K–$750K", min: 500000, max: 750000 },
  { label: "$750K+", min: 750000, max: Infinity },
];

const ADR_BRACKETS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under $150", min: 0, max: 150 },
  { label: "$150–$250", min: 150, max: 250 },
  { label: "$250–$400", min: 250, max: 400 },
  { label: "$400+", min: 400, max: Infinity },
];

const REVENUE_BRACKETS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under $3K/mo", min: 0, max: 3000 },
  { label: "$3K–$5K/mo", min: 3000, max: 5000 },
  { label: "$5K–$8K/mo", min: 5000, max: 8000 },
  { label: "$8K+/mo", min: 8000, max: Infinity },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "score", label: "Score (High → Low)" },
  { value: "homeValue", label: "Home Value (High → Low)" },
  { value: "homeValueAsc", label: "Home Value (Low → High)" },
  { value: "adr", label: "ADR (High → Low)" },
  { value: "revenue", label: "Revenue (High → Low)" },
  { value: "cashOnCash", label: "Cash-on-Cash (High → Low)" },
];

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

// Filter icon SVG (inline to avoid adding to Icons.tsx)
function FilterIcon({ className = "w-5 h-5", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function SortIcon({ className = "w-5 h-5", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M6 12h12M9 18h6" />
    </svg>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  
  // Smart filters state
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [homeValueIdx, setHomeValueIdx] = useState(0); // index into HOME_VALUE_BRACKETS
  const [adrIdx, setAdrIdx] = useState(0); // index into ADR_BRACKETS
  const [revenueIdx, setRevenueIdx] = useState(0); // index into REVENUE_BRACKETS
  const [regulationFilter, setRegulationFilter] = useState<RegulationFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Server-side search state for "allCities" filter
  const [serverCities, setServerCities] = useState<ServerCity[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverPage, setServerPage] = useState(1);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);

  // Get market counts for display
  const marketCounts = useMemo(() => getMarketCounts(), []);

  // Like counts for city cards
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Count active smart filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (minScore > 0) count++;
    if (homeValueIdx > 0) count++;
    if (adrIdx > 0) count++;
    if (revenueIdx > 0) count++;
    if (regulationFilter !== "all") count++;
    if (sortBy !== "score") count++;
    return count;
  }, [minScore, homeValueIdx, adrIdx, revenueIdx, regulationFilter, sortBy]);

  const clearAllFilters = () => {
    setMinScore(0);
    setHomeValueIdx(0);
    setAdrIdx(0);
    setRevenueIdx(0);
    setRegulationFilter("all");
    setSortBy("score");
  };

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
      }, 300);
      
      return () => clearTimeout(debounceTimer);
    } else {
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

    // Apply tab filters
    if (filter === "states") {
      cityResults = [];
    } else if (filter === "cities") {
      stateResults = [];
    } else if (filter === "minScore") {
      cityResults = cityResults.filter(c => c.marketScore >= 70);
      stateResults = stateResults.filter(s => s.marketScore >= 70);
    } else if (filter === "recommended") {
      cityResults = cityResults.filter(c => 
        c.marketScore >= 70 && 
        c.regulation === "Legal" &&
        c.medianHomeValue <= 250000
      );
      stateResults = [];
    }

    // Apply smart filters to cities
    const hvBracket = HOME_VALUE_BRACKETS[homeValueIdx];
    const adrBracket = ADR_BRACKETS[adrIdx];
    const revBracket = REVENUE_BRACKETS[revenueIdx];

    cityResults = cityResults.filter(city => {
      // Score filter
      if (city.marketScore < minScore) return false;
      // Home value filter
      if (city.medianHomeValue < hvBracket.min || city.medianHomeValue > hvBracket.max) return false;
      // ADR filter
      if (city.avgADR < adrBracket.min || city.avgADR > adrBracket.max) return false;
      // Revenue filter
      if (city.strMonthlyRevenue < revBracket.min || city.strMonthlyRevenue > revBracket.max) return false;
      // Regulation filter
      if (regulationFilter === "legal" && city.regulation !== "Legal") return false;
      if (regulationFilter === "restricted" && city.regulation !== "Restricted") return false;
      return true;
    });

    // Apply smart filters to states (only score and regulation apply)
    stateResults = stateResults.filter(state => {
      if (state.marketScore < minScore) return false;
      return true;
    });

    // Sort
    const sortFn = (a: typeof cityResults[0], b: typeof cityResults[0]) => {
      switch (sortBy) {
        case "homeValue": return b.medianHomeValue - a.medianHomeValue;
        case "homeValueAsc": return a.medianHomeValue - b.medianHomeValue;
        case "adr": return b.avgADR - a.avgADR;
        case "revenue": return b.strMonthlyRevenue - a.strMonthlyRevenue;
        case "cashOnCash": return b.cashOnCash - a.cashOnCash;
        default: return b.marketScore - a.marketScore;
      }
    };
    cityResults.sort(sortFn);
    stateResults.sort((a, b) => b.marketScore - a.marketScore);

    return { cities: cityResults, states: stateResults, serverCities: [] as ServerCity[] };
  }, [query, filter, serverCities, minScore, homeValueIdx, adrIdx, revenueIdx, regulationFilter, sortBy]);

  const totalResults = filter === "allCities" 
    ? serverTotal 
    : results.cities.length + results.states.length;

  // Batch fetch like counts for visible city cards
  useEffect(() => {
    const cityIds = results.cities.map(c => c.id);
    if (cityIds.length === 0) return;
    fetch(`/api/market-saves?action=batch&marketIds=${cityIds.join(',')}&marketType=city`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.counts) {
          setLikeCounts(prev => ({ ...prev, ...data.counts }));
        }
      })
      .catch(console.error);
  }, [results.cities]);

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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${value}`;
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

          {/* Tab Filters Row */}
          <div className="flex items-center gap-2 py-4 -mx-4 px-4">
            {/* Smart Filters Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all relative"
              style={{ 
                backgroundColor: showFilters || activeFilterCount > 0 ? '#2b2823' : '#ffffff',
                color: showFilters || activeFilterCount > 0 ? '#ffffff' : '#787060',
                border: showFilters || activeFilterCount > 0 ? 'none' : '1px solid #d8d6cd',
                boxShadow: showFilters || activeFilterCount > 0 ? '0 2px 8px -2px rgba(43, 40, 35, 0.2)' : 'none'
              }}
            >
              <FilterIcon className="w-4 h-4" color={showFilters || activeFilterCount > 0 ? '#ffffff' : '#787060'} />
              Filters
              {activeFilterCount > 0 && (
                <span 
                  className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#ffffff', color: '#2b2823' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Existing tab filters - scrollable */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {filters.map((f) => {
                const IconComponent = f.Icon;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key as FilterType)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
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

          {/* Smart Filters Panel (collapsible) */}
          {showFilters && (
            <div 
              style={{ borderTop: '1px solid #e5e3da', maxHeight: '45vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
            >
              <div className="py-3 px-1">
                {/* Header with Clear All */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: '#2b2823' }}>
                    Smart Filters
                  </span>
                  {activeFilterCount > 0 && (
                    <button 
                      onClick={clearAllFilters}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md transition-all hover:opacity-70"
                      style={{ color: '#0284c7', backgroundColor: '#f0f9ff' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Two-column grid for compact layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Min Score Slider - full width */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium" style={{ color: '#787060' }}>Min Score</span>
                      <span className="text-[11px] font-bold" style={{ color: minScore > 0 ? '#2b2823' : '#9a9488' }}>
                        {minScore > 0 ? `${minScore}+` : 'Any'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="5"
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ 
                        background: `linear-gradient(to right, #2b2823 ${(minScore / 90) * 100}%, #e5e3da ${(minScore / 90) * 100}%)`,
                        accentColor: '#2b2823'
                      }}
                    />
                    <div className="flex justify-between">
                      <span className="text-[9px]" style={{ color: '#9a9488' }}>0</span>
                      <span className="text-[9px]" style={{ color: '#9a9488' }}>45</span>
                      <span className="text-[9px]" style={{ color: '#9a9488' }}>90</span>
                    </div>
                  </div>

                  {/* Home Value Brackets */}
                  <div>
                    <span className="text-[11px] font-medium block mb-1" style={{ color: '#787060' }}>Home Value</span>
                    <div className="flex flex-wrap gap-1">
                      {HOME_VALUE_BRACKETS.map((bracket, idx) => (
                        <button
                          key={idx}
                          onClick={() => setHomeValueIdx(idx)}
                          className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                          style={{
                            backgroundColor: homeValueIdx === idx ? '#2b2823' : '#f5f5f0',
                            color: homeValueIdx === idx ? '#ffffff' : '#787060',
                            border: homeValueIdx === idx ? 'none' : '1px solid #e5e3da',
                          }}
                        >
                          {bracket.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ADR Brackets */}
                  <div>
                    <span className="text-[11px] font-medium block mb-1" style={{ color: '#787060' }}>Nightly Rate</span>
                    <div className="flex flex-wrap gap-1">
                      {ADR_BRACKETS.map((bracket, idx) => (
                        <button
                          key={idx}
                          onClick={() => setAdrIdx(idx)}
                          className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                          style={{
                            backgroundColor: adrIdx === idx ? '#2b2823' : '#f5f5f0',
                            color: adrIdx === idx ? '#ffffff' : '#787060',
                            border: adrIdx === idx ? 'none' : '1px solid #e5e3da',
                          }}
                        >
                          {bracket.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Revenue Brackets */}
                  <div>
                    <span className="text-[11px] font-medium block mb-1" style={{ color: '#787060' }}>Revenue</span>
                    <div className="flex flex-wrap gap-1">
                      {REVENUE_BRACKETS.map((bracket, idx) => (
                        <button
                          key={idx}
                          onClick={() => setRevenueIdx(idx)}
                          className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                          style={{
                            backgroundColor: revenueIdx === idx ? '#2b2823' : '#f5f5f0',
                            color: revenueIdx === idx ? '#ffffff' : '#787060',
                            border: revenueIdx === idx ? 'none' : '1px solid #e5e3da',
                          }}
                        >
                          {bracket.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Regulation Status */}
                  <div>
                    <span className="text-[11px] font-medium block mb-1" style={{ color: '#787060' }}>Regulation</span>
                    <div className="flex gap-1">
                      {([
                        { key: "all", label: "All" },
                        { key: "legal", label: "Legal" },
                        { key: "restricted", label: "Restricted" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setRegulationFilter(opt.key)}
                          className="px-2 py-1 rounded-md text-[10px] font-medium transition-all flex-1"
                          style={{
                            backgroundColor: regulationFilter === opt.key ? '#2b2823' : '#f5f5f0',
                            color: regulationFilter === opt.key ? '#ffffff' : '#787060',
                            border: regulationFilter === opt.key ? 'none' : '1px solid #e5e3da',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Sort By - full width */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className="text-[11px] font-medium block mb-1" style={{ color: '#787060' }}>Sort By</span>
                    <div className="relative">
                      <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] transition-all"
                        style={{
                          backgroundColor: '#f5f5f0',
                          border: '1px solid #e5e3da',
                          color: '#2b2823',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <SortIcon className="w-3 h-3" color="#787060" />
                          <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                        </div>
                        <ChevronDownIcon 
                          className="w-3 h-3 transition-transform" 
                          color="#787060"
                        />
                      </button>
                      {showSortDropdown && (
                        <div 
                          className="absolute top-full left-0 right-0 mt-1 rounded-md overflow-hidden z-20"
                          style={{ 
                            backgroundColor: '#ffffff', 
                            border: '1px solid #d8d6cd',
                            boxShadow: '0 8px 24px -4px rgba(43, 40, 35, 0.15)'
                          }}
                        >
                          {SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                              className="w-full text-left px-2.5 py-2 text-[11px] transition-all hover:bg-gray-50"
                              style={{
                                color: sortBy === opt.value ? '#2b2823' : '#787060',
                                fontWeight: sortBy === opt.value ? 600 : 400,
                                backgroundColor: sortBy === opt.value ? 'rgba(43, 40, 35, 0.04)' : 'transparent',
                              }}
                            >
                              {sortBy === opt.value && '✓ '}{opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stuck Helper */}
      <div className="max-w-4xl mx-auto px-4 pt-2">
        <StuckHelper tabName="search" />
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Results Count + Active Filters Summary */}
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
          <div className="flex items-center gap-2">
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
            {activeFilterCount > 0 && filter !== "allCities" && (
              <span 
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(43, 40, 35, 0.08)', color: '#2b2823' }}
              >
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </span>
            )}
          </div>
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

          {/* Featured Cities (client-side) — now with key metrics */}
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
                  className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
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
                    {city.county}, {city.stateCode}
                  </div>
                  {/* Key Metrics Row */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-xs" style={{ color: '#787060' }}>
                      <span style={{ color: '#2b2823', fontWeight: 600 }}>{formatCurrency(city.medianHomeValue)}</span> home
                    </span>
                    <span className="text-xs" style={{ color: '#787060' }}>
                      <span style={{ color: '#2b2823', fontWeight: 600 }}>${city.avgADR}</span>/night
                    </span>
                    <span className="text-xs" style={{ color: '#787060' }}>
                      <span style={{ color: '#2b2823', fontWeight: 600 }}>{formatCurrency(city.strMonthlyRevenue)}</span>/mo
                    </span>
                    {city.cashOnCash > 0 && (
                      <span className="text-xs" style={{ color: '#787060' }}>
                        <span style={{ color: city.cashOnCash >= 15 ? '#166534' : '#2b2823', fontWeight: 600 }}>{city.cashOnCash.toFixed(0)}%</span> CoC
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: getVerdictStyle(city.marketScore).bg, color: getVerdictStyle(city.marketScore).color }}
                    >
                      {getVerdictStyle(city.marketScore).text}
                    </span>
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ 
                        backgroundColor: city.regulation === 'Legal' ? '#dcfce7' : city.regulation === 'Restricted' ? '#fef3c7' : '#fee2e2',
                        color: city.regulation === 'Legal' ? '#166534' : city.regulation === 'Restricted' ? '#92400e' : '#991b1b',
                      }}
                    >
                      {city.regulation}
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

                {/* Like Count + Arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(likeCounts[city.id] || 0) > 0 && (
                    <div className="flex items-center gap-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                        {likeCounts[city.id]}
                      </span>
                    </div>
                  )}
                  <ChevronRightIcon className="w-5 h-5" color="#d8d6cd" />
                </div>
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
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
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
                    {/* Key Metrics Row for server cities */}
                    {(city.avgADR || city.medianHomeValue || city.strMonthlyRevenue) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {city.medianHomeValue && city.medianHomeValue > 0 && (
                          <span className="text-xs" style={{ color: '#787060' }}>
                            <span style={{ color: '#2b2823', fontWeight: 600 }}>{formatCurrency(city.medianHomeValue)}</span> home
                          </span>
                        )}
                        {city.avgADR && city.avgADR > 0 && (
                          <span className="text-xs" style={{ color: '#787060' }}>
                            <span style={{ color: '#2b2823', fontWeight: 600 }}>${city.avgADR}</span>/night
                          </span>
                        )}
                        {city.strMonthlyRevenue && city.strMonthlyRevenue > 0 && (
                          <span className="text-xs" style={{ color: '#787060' }}>
                            <span style={{ color: '#2b2823', fontWeight: 600 }}>{formatCurrency(city.strMonthlyRevenue)}</span>/mo
                          </span>
                        )}
                      </div>
                    )}
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
                  <ChevronRightIcon className="w-5 h-5 flex-shrink-0" color="#d8d6cd" />
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
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
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
                {query || activeFilterCount > 0 ? "No results found" : "Start searching"}
              </h3>
              <p className="text-sm" style={{ color: '#787060' }}>
                {query || activeFilterCount > 0
                  ? activeFilterCount > 0
                    ? "Try adjusting your filters or broadening your search criteria."
                    : "Try adjusting your search or use the 'All Cities' filter to search all US cities."
                  : `Search ${marketCounts.total.toLocaleString()}+ US cities by name, state, or county.`
                }
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                >
                  Clear All Filters
                </button>
              )}
              {query && filter !== "allCities" && activeFilterCount === 0 && (
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
