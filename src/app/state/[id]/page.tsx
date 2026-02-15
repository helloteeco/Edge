"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getCitiesByState, getStateByCode } from "@/data/helpers";
import AuthHeader from "@/components/AuthHeader";
import { DoubleTapSave, FloatingActionPill } from "@/components/DoubleTapSave";

type SortOption = "score" | "adr" | "revenue" | "price";
type FilterOption = "all" | "gems" | "legal" | "restricted";

interface MashvisorCity {
  name: string;
  state: string;
  occupancy: number;
  adr: number;
  monthlyRevenue: number;
  traditionalRent: number;
  strCapRate: number;
  ltrCapRate: number;
  medianPrice: number;
  mashMeter: number;
}

interface MashvisorNeighborhood {
  id: number;
  name: string;
  city: string;
  state: string;
  occupancy: number;
  adr: number;
  monthlyRevenue: number;
  traditionalRent: number;
  strCapRate: number;
  ltrCapRate: number;
  listingsCount: number;
  mashMeter: number;
  medianPrice: number;
}

export default function StatePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  
  // Mashvisor live data state
  const [showLiveData, setShowLiveData] = useState(false);
  const [liveCities, setLiveCities] = useState<MashvisorCity[]>([]);
  const [liveNeighborhoods, setLiveNeighborhoods] = useState<MashvisorNeighborhood[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

  const state = getStateByCode(id);
  const cities = getCitiesByState(id);

  useEffect(() => {
    const loadLikeStatus = async () => {
      const { getAuthEmail, getSavedStates } = await import('@/lib/account-storage');
      const email = getAuthEmail();
      
      // Legacy local save check
      const saved = getSavedStates();
      setIsSaved(saved.includes(state?.abbreviation || ''));
      
      // Fetch save count + user-specific like status from API
      if (state?.abbreviation) {
        const params = new URLSearchParams({ marketId: state.abbreviation, marketType: 'state' });
        if (email) params.set('email', email);
        
        fetch(`/api/market-saves?${params}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setSaveCount(data.count);
              if (email && data.liked !== undefined) {
                setIsSaved(data.liked);
              }
            }
          })
          .catch(console.error);
      }
    };
    loadLikeStatus();
  }, [state?.abbreviation]);

  const toggleSave = async () => {
    const { getSavedStates, setSavedStates, getAuthEmail } = await import('@/lib/account-storage');
    const email = getAuthEmail();
    if (!email) {
      alert('Sign in to like markets and track your favorites!');
      return;
    }
    
    // Optimistic UI update
    const wasSaved = isSaved;
    setIsSaved(!isSaved);
    setSaveCount(prev => (prev ?? 0) + (wasSaved ? -1 : 1));
    
    // Also update local storage for backward compatibility
    const saved = getSavedStates(email);
    let updated;
    if (wasSaved) {
      updated = saved.filter((code: string) => code !== state?.abbreviation);
    } else {
      updated = [...saved, state?.abbreviation].filter((x): x is string => x !== undefined);
    }
    setSavedStates(updated, email);
    
    // Toggle like on server (user-specific)
    try {
      const res = await fetch('/api/market-saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: state?.abbreviation,
          marketType: 'state',
          action: 'toggle',
          email,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveCount(data.count);
        setIsSaved(data.liked);
      } else if (data.error?.includes('limit')) {
        setIsSaved(wasSaved);
        setSaveCount(prev => (prev ?? 0) + (wasSaved ? 1 : -1));
        alert(data.error);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setIsSaved(wasSaved);
      setSaveCount(prev => (prev ?? 0) + (wasSaved ? 1 : -1));
    }
  };

  const handleShare = async () => {
    if (!state) return;
    // Share just the URL - the Open Graph meta tags will create the preview card
    const shareUrl = window.location.href;
    
    if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `${state.name} STR Analysis`,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  // Fetch live cities from Mashvisor
  const fetchLiveCities = async () => {
    if (!state) return;
    setLoadingCities(true);
    setShowLiveData(true);
    try {
      const response = await fetch(`/api/mashvisor/cities?state=${state.abbreviation}`);
      const data = await response.json();
      if (data.success && data.cities) {
        setLiveCities(data.cities);
      }
    } catch (error) {
      console.error('Error fetching live cities:', error);
    }
    setLoadingCities(false);
  };

  // Fetch neighborhoods for a city
  const fetchNeighborhoods = async (cityName: string) => {
    if (!state) return;
    setSelectedCity(cityName);
    setLoadingNeighborhoods(true);
    try {
      const response = await fetch(`/api/mashvisor/neighborhoods?city=${encodeURIComponent(cityName)}&state=${state.abbreviation}`);
      const data = await response.json();
      if (data.success && data.neighborhoods) {
        setLiveNeighborhoods(data.neighborhoods);
      }
    } catch (error) {
      console.error('Error fetching neighborhoods:', error);
    }
    setLoadingNeighborhoods(false);
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e3da' }}>
        <div className="text-center p-8">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#ffffff' }}
          >
            <span className="text-3xl">🗺️</span>
          </div>
          <h1 
            className="text-xl font-bold mb-2"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            State not found
          </h1>
          <Link href="/" className="font-medium transition-opacity hover:opacity-70" style={{ color: '#2b2823' }}>
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

  // Filter and sort cities
  let filteredCities = [...cities];
  
  if (filterBy === "gems") {
    filteredCities = filteredCities.filter(c => c.marketScore >= 65 && c.marketHeadroom >= 8);
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

  const getScoreStyle = (score: number) => {
    if (score >= 85) return { color: '#000000' };
    if (score >= 75) return { color: '#2b2823' };
    if (score >= 65) return { color: '#3d3a34' };
    if (score >= 55) return { color: '#787060' };
    return { color: '#9a9488' };
  };

  return (
    <DoubleTapSave isSaved={isSaved} onToggleSave={toggleSave}>
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1 text-sm mb-4 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Map
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 
                className="text-2xl sm:text-3xl font-bold mb-1"
                style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                {state.name}
              </h1>
              {saveCount !== null && saveCount >= 50 && (
                <div className="flex items-center gap-1 mb-2">
                  <span 
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.9)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    {saveCount >= 1000 ? `${(saveCount / 1000).toFixed(1)}K` : saveCount} saved
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={getGradeStyle(state.grade)}
                >
                  {getVerdictText(state.verdict)}
                </span>
                <a
                  href="https://www.proper.insure/regulations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                >
                  STR Rules →
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AuthHeader variant="dark" />
              <button
                onClick={handleShare}
                className="p-3 rounded-xl transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                title="Share Analysis"
              >
                <svg className="w-5 h-5" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-5 5m5-5l5 5" />
                </svg>
              </button>
              <button
                onClick={toggleSave}
                className="p-3 rounded-xl transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                aria-label={isSaved ? "Remove from saved" : "Save state"}
              >
                <span className="text-2xl">{isSaved ? "❤️" : "🤍"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Score Card with Grade Distribution */}
        <div 
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="font-semibold"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              State Investment Grade
            </h3>
            <span className="text-sm" style={{ color: '#787060' }}>Based on city averages</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-4 sm:flex-col sm:text-center">
              <div 
                className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
                style={{ ...getGradeStyle(state.grade), boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.15)' }}
              >
                <div 
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {state.grade}
                </div>
              </div>
              <div className="sm:mt-2">
                <div 
                  className="text-2xl font-bold"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {state.marketScore}/100
                </div>
                <div className="text-sm" style={{ color: '#787060' }}>{getVerdictText(state.verdict)}</div>
              </div>
            </div>
            
            {/* City Grade Distribution */}
            <div className="flex-1 w-full">
              <div className="text-sm font-medium mb-3" style={{ color: '#2b2823' }}>Market Grade Distribution</div>
              <div className="space-y-2">
                {state.cityGrades.map(({ grade, count }) => {
                  const percentage = (count / cities.length) * 100;
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <span 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={getGradeStyle(grade)}
                      >
                        {grade}
                      </span>
                      <div 
                        className="flex-1 h-3 rounded-full overflow-hidden"
                        style={{ backgroundColor: '#e5e3da' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percentage}%`, backgroundColor: '#2b2823' }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-16 text-right" style={{ color: '#2b2823' }}>
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #d8d6cd' }}>
            <p 
              className="text-sm text-center rounded-xl p-3"
              style={{ backgroundColor: '#e5e3da', color: '#787060' }}
            >
              State grade is based on the top-performing cities in the state. 
              Adding more markets won&apos;t lower the grade — it only improves when quality cities are added.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "STR Rules", value: "View →", highlight: false, link: "https://www.proper.insure/regulations/" },
            { label: "Avg ADR", value: `$${state.avgADR}`, highlight: false },
            { label: "Median Home", value: `$${(state.medianHomeValue / 1000).toFixed(0)}K`, highlight: false },
            { label: "1Y Appreciation", value: `${state.appreciation >= 0 ? "+" : ""}${state.appreciation}%`, highlight: state.appreciation >= 0 },
          ].map((stat) => (
            ('link' in stat && stat.link) ? (
              <a
                key={stat.label}
                href={stat.link as string}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl p-4 text-center hover:opacity-80 transition-opacity"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
              >
                <div className="text-xs mb-1" style={{ color: '#787060' }}>{stat.label}</div>
                <div className="font-bold text-lg" style={{ color: '#787060' }}>
                  {stat.value}
                </div>
              </a>
            ) : (
              <div 
                key={stat.label} 
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
              >
                <div className="text-xs mb-1" style={{ color: '#787060' }}>{stat.label}</div>
                <div 
                  className="font-bold text-lg"
                  style={{ color: stat.highlight ? '#000000' : '#2b2823' }}
                >
                  {stat.value}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Sort & Filter */}
        <div 
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="text-xs font-medium mb-2" style={{ color: '#787060' }}>Sort by</div>
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ 
                      backgroundColor: sortBy === opt.key ? '#2b2823' : '#e5e3da',
                      color: sortBy === opt.key ? '#ffffff' : '#787060'
                    }}
                  >
                    <span className="text-xs">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium mb-2" style={{ color: '#787060' }}>Filter</div>
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
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ 
                      backgroundColor: filterBy === opt.key ? '#2b2823' : '#e5e3da',
                      color: filterBy === opt.key ? '#ffffff' : '#787060'
                    }}
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
          <p className="text-sm" style={{ color: '#787060' }}>
            <span className="font-semibold" style={{ color: '#2b2823' }}>{filteredCities.length}</span> markets found
          </p>
          {filterBy === "gems" && (
            <span 
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(43, 40, 35, 0.08)', color: '#2b2823' }}
            >
              High CoC • Good Headroom
            </span>
          )}
        </div>

        <div className="space-y-3">
          {filteredCities.map((city) => (
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
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div 
                    className="font-semibold transition-colors"
                    style={{ color: '#2b2823' }}
                  >
                    {city.name}
                  </div>
                  <div className="text-sm" style={{ color: '#787060' }}>{city.county}</div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                    style={getGradeStyle(city.grade)}
                  >
                    {city.grade}
                  </div>
                  <div>
                    <div 
                      className="text-xl font-bold"
                      style={{ ...getScoreStyle(city.marketScore), fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      {city.marketScore}
                    </div>
                    <div className="text-xs" style={{ color: '#787060' }}>Score</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: "ADR", value: `$${city.avgADR}`, highlight: false },
                  { label: "Occupancy", value: `${city.occupancy}%`, highlight: false },
                  { label: "Monthly", value: `$${city.strMonthlyRevenue.toLocaleString()}`, highlight: true },
                  { label: "Price", value: `$${(city.medianHomeValue / 1000).toFixed(0)}K`, highlight: false },
                ].map((stat) => (
                  <div 
                    key={stat.label} 
                    className="rounded-lg p-2 text-center"
                    style={{ backgroundColor: '#e5e3da' }}
                  >
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: '#787060' }}>{stat.label}</div>
                    <div 
                      className="text-sm font-semibold"
                      style={{ color: stat.highlight ? '#000000' : '#2b2823' }}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span 
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={getGradeStyle(city.grade)}
                  >
                    {city.scoring.cashOnCash.rating.split(' ')[0]}
                  </span>
                  <span 
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ 
                      backgroundColor: city.dsi ? '#2b2823' : '#787060',
                      color: '#ffffff'
                    }}
                  >
                    {city.dsi ? "✓ Pays Bills" : "✗ Bills Risk"}
                  </span>
                  <a
                    href="https://www.proper.insure/regulations/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                  >
                    STR Rules →
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const shareUrl = `${window.location.origin}/city/${city.id}`;
                      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                        try {
                          await navigator.share({
                            title: `${city.name}, ${state.abbreviation} - STR Analysis`,
                            url: shareUrl
                          });
                        } catch (err) {
                          console.log('Share cancelled');
                        }
                      } else {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('Link copied to clipboard!');
                      }
                    }}
                    className="p-1.5 rounded-lg transition-all hover:opacity-70"
                    style={{ backgroundColor: '#e5e3da' }}
                    title="Share this market"
                  >
                    <svg className="w-4 h-4" style={{ color: '#787060' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-5 5m5-5l5 5" />
                    </svg>
                  </button>
                  <div 
                    className="flex items-center gap-1 text-sm font-medium transition-all"
                    style={{ color: '#2b2823' }}
                  >
                    View
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {filteredCities.length === 0 && (
            <div 
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#e5e3da' }}
              >
                <span className="text-3xl">🔍</span>
              </div>
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                No markets found
              </h3>
              <p className="text-sm" style={{ color: '#787060' }}>
                Try adjusting your filters to see more results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* Floating Action Pill - Heart + Share */}
    <FloatingActionPill isSaved={isSaved} onToggleSave={toggleSave} marketLikeCount={saveCount} />
    </DoubleTapSave>
  );
}
