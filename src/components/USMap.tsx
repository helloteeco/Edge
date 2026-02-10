"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { getStateByCode } from "@/data/helpers";
import { getInventoryByState } from "@/data/inventory-data";

type MapView = "appreciation" | "migration" | "homeValue" | "strScore" | "inventoryLevel" | "inventoryGrowth" | "priceCuts" | "daysOnMarket";

const statePositions: Record<string, { row: number; col: number }> = {
  // Row 0: ME at top (shifted everything else down by 1)
  ME: { row: 0, col: 10 },
  // Row 1: Pacific Northwest to Northeast
  WA: { row: 1, col: 0 }, MT: { row: 1, col: 1 }, ND: { row: 1, col: 2 }, MN: { row: 1, col: 3 },
  WI: { row: 1, col: 4 }, MI: { row: 1, col: 5 }, VT: { row: 1, col: 8 }, NH: { row: 1, col: 9 },
  // Row 2: Oregon to Rhode Island
  OR: { row: 2, col: 0 }, ID: { row: 2, col: 1 }, SD: { row: 2, col: 2 }, IA: { row: 2, col: 3 },
  IL: { row: 2, col: 4 }, IN: { row: 2, col: 5 }, OH: { row: 2, col: 6 }, PA: { row: 2, col: 7 },
  NY: { row: 2, col: 8 }, MA: { row: 2, col: 9 }, RI: { row: 2, col: 10 },
  // Row 3: Nevada to Connecticut
  NV: { row: 3, col: 0 }, WY: { row: 3, col: 1 }, NE: { row: 3, col: 2 }, MO: { row: 3, col: 3 },
  KY: { row: 3, col: 4 }, WV: { row: 3, col: 5 }, VA: { row: 3, col: 6 }, MD: { row: 3, col: 7 },
  NJ: { row: 3, col: 8 }, CT: { row: 3, col: 9 },
  // Row 4: California to Delaware
  CA: { row: 4, col: 0 }, UT: { row: 4, col: 1 }, CO: { row: 4, col: 2 }, KS: { row: 4, col: 3 },
  TN: { row: 4, col: 4 }, NC: { row: 4, col: 5 }, SC: { row: 4, col: 6 }, DE: { row: 4, col: 7 },
  // Row 5: Arizona to Georgia
  AZ: { row: 5, col: 0 }, NM: { row: 5, col: 1 }, OK: { row: 5, col: 2 }, AR: { row: 5, col: 3 },
  MS: { row: 5, col: 4 }, AL: { row: 5, col: 5 }, GA: { row: 5, col: 6 },
  // Row 6: TX and LA moved right by 2 tiles, FL stays
  TX: { row: 6, col: 2 }, LA: { row: 6, col: 3 }, FL: { row: 6, col: 5 },
  // Row 8: AK and HI on the same row
  AK: { row: 8, col: 0 },
  HI: { row: 8, col: 8 },
};

// STANDARDIZED 5-LEVEL COLOR SCALE
// All maps use: red-400 → orange-400 → amber-300 → emerald-400 → emerald-600
// Red = worst for investors, Green = best for investors
// Using emerald instead of green for a truer green (less teal)

const getAppreciationColor = (value: number) => {
  if (value < 0) return "bg-red-400 text-white";
  if (value < 2) return "bg-orange-400 text-white";
  if (value < 4) return "bg-amber-300 text-amber-900";
  if (value < 5.5) return "bg-emerald-400 text-white";
  return "bg-emerald-600 text-white";
};

// STR Grade colors - using emerald scale for true green (not teal)
const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A+': return 'bg-emerald-600 text-white';
    case 'A': return 'bg-emerald-500 text-white';
    case 'B+': return 'bg-emerald-400 text-white';
    case 'B': return 'bg-emerald-300 text-emerald-900';
    case 'C': return 'bg-amber-300 text-amber-900';
    case 'D': return 'bg-orange-400 text-white';
    default: return 'bg-red-400 text-white';
  }
};

const getGradeBgColor = (grade: string) => {
  switch (grade) {
    case 'A+': return 'bg-emerald-600';
    case 'A': return 'bg-emerald-500';
    case 'B+': return 'bg-emerald-400';
    case 'B': return 'bg-emerald-300';
    case 'C': return 'bg-amber-400';
    case 'D': return 'bg-orange-400';
    default: return 'bg-red-400';
  }
};

// Inventory level colors (HIGH inventory = green for buyers = more choices, less competition)
const getInventoryLevelColor = (level: string) => {
  switch (level) {
    case 'very-high': return 'bg-emerald-600 text-white';  // Best for buyers
    case 'high': return 'bg-emerald-400 text-white';
    case 'moderate': return 'bg-amber-300 text-amber-900';
    case 'low': return 'bg-orange-400 text-white';
    case 'very-low': return 'bg-red-400 text-white';  // Worst for buyers
    default: return 'bg-gray-300 text-gray-700';
  }
};

// Inventory growth colors (higher growth = more supply = better for buyers)
const getInventoryGrowthColor = (growth: number) => {
  if (growth < 0) return 'bg-red-400 text-white';
  if (growth < 10) return 'bg-orange-400 text-white';
  if (growth < 18) return 'bg-amber-300 text-amber-900';
  if (growth < 25) return 'bg-emerald-400 text-white';
  return 'bg-emerald-600 text-white';
};

// Price cuts colors (higher = more seller desperation = better for buyers)
const getPriceCutsColor = (pct: number) => {
  if (pct < 12) return 'bg-red-400 text-white';
  if (pct < 16) return 'bg-orange-400 text-white';
  if (pct < 22) return 'bg-amber-300 text-amber-900';
  if (pct < 28) return 'bg-emerald-400 text-white';
  return 'bg-emerald-600 text-white';
};

// Days on market colors (higher = slower market = more negotiating power)
const getDaysOnMarketColor = (days: number) => {
  if (days < 30) return 'bg-red-400 text-white';
  if (days < 40) return 'bg-orange-400 text-white';
  if (days < 55) return 'bg-amber-300 text-amber-900';
  if (days < 70) return 'bg-emerald-400 text-white';
  return 'bg-emerald-600 text-white';
};

export function USMap() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [mapView, setMapView] = useState<MapView>("strScore");
  
  // Touch swipe handling for tab navigation
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  // Tab order: STR Grade (our value prop) first, then familiar metrics → technical metrics
  // This builds user confidence by starting with recognizable concepts
  const views = [
    { key: "strScore", label: "STR Grade", description: "Our overall investment score based on cash flow, affordability, year-round income, and market headroom." },
    { key: "homeValue", label: "Home Prices", description: "Lower prices mean easier entry and better cash-on-cash returns." },
    { key: "appreciation", label: "Appreciation", description: "Higher appreciation means your property value grows faster over time." },
    { key: "daysOnMarket", label: "Days on Market", description: "Median days homes sit on market. Longer = slower market with more room to negotiate." },
    { key: "priceCuts", label: "Price Cuts %", description: "Percentage of listings with price reductions. Higher = more negotiating power for buyers." },
    { key: "migration", label: "Migration", description: "More people moving in often leads to rising home prices and rental demand." },
    { key: "inventoryLevel", label: "Inventory Level", description: "Current housing supply. High inventory = buyer's market with more choices and negotiating power." },
    { key: "inventoryGrowth", label: "Inventory Growth", description: "Year-over-year change in active listings. Rising inventory creates buying opportunities." },
  ];

  const currentViewIndex = views.findIndex(v => v.key === mapView);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Minimum distance for a valid swipe
    
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0 && currentViewIndex < views.length - 1) {
        // Swipe left - go to next tab
        setMapView(views[currentViewIndex + 1].key as MapView);
      } else if (swipeDistance < 0 && currentViewIndex > 0) {
        // Swipe right - go to previous tab
        setMapView(views[currentViewIndex - 1].key as MapView);
      }
    }
    
    isSwiping.current = false;
    touchStartX.current = 0;
    touchEndX.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentViewIndex]); // views is a constant array defined in component, doesn't need to be in deps

  // Scroll active tab into view
  useEffect(() => {
    if (tabContainerRef.current) {
      const activeButton = tabContainerRef.current.querySelector('[data-active="true"]');
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [mapView]);

  const getStateColor = (stateCode: string) => {
    const state = getStateByCode(stateCode);
    const inventory = getInventoryByState(stateCode);
    if (!state) return "bg-[#e5e3da] text-[#787060]";
    
    switch (mapView) {
      case "appreciation":
        return getAppreciationColor(state.appreciation);
      case "strScore":
        return getGradeColor(state.grade);
      case "homeValue":
        // Low prices = green (more affordable = better for investors)
        if (state.medianHomeValue < 200000) return "bg-emerald-600 text-white";
        if (state.medianHomeValue < 250000) return "bg-emerald-400 text-white";
        if (state.medianHomeValue < 350000) return "bg-amber-300 text-amber-900";
        if (state.medianHomeValue < 450000) return "bg-orange-400 text-white";
        return "bg-red-400 text-white";
      case "migration":
        if (state.netMigration > 100000) return "bg-emerald-600 text-white";
        if (state.netMigration > 50000) return "bg-emerald-400 text-white";
        if (state.netMigration > 0) return "bg-amber-300 text-amber-900";
        if (state.netMigration > -50000) return "bg-orange-400 text-white";
        return "bg-red-400 text-white";
      case "inventoryLevel":
        return inventory ? getInventoryLevelColor(inventory.inventoryLevel) : "bg-[#e5e3da] text-[#787060]";
      case "inventoryGrowth":
        return inventory ? getInventoryGrowthColor(inventory.inventoryGrowthYoY) : "bg-[#e5e3da] text-[#787060]";
      case "priceCuts":
        return inventory ? getPriceCutsColor(inventory.priceCutPercent) : "bg-[#e5e3da] text-[#787060]";
      case "daysOnMarket":
        return inventory ? getDaysOnMarketColor(inventory.daysOnMarket) : "bg-[#e5e3da] text-[#787060]";
      default:
        return "bg-[#e5e3da] text-[#787060]";
    }
  };

  const selectedStateData = selectedState 
    ? getStateByCode(selectedState) 
    : null;
  
  const selectedInventoryData = selectedState
    ? getInventoryByState(selectedState)
    : null;

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return { text: 'STRONG BUY' };
      case 'buy': return { text: 'BUY' };
      case 'hold': return { text: 'HOLD' };
      case 'caution': return { text: 'CAUTION' };
      default: return { text: 'AVOID' };
    }
  };

  const getFilterDescription = () => {
    const view = views.find(v => v.key === mapView);
    return view?.description || "";
  };

  // STANDARDIZED LEGEND - Always shows best (green) to worst (red), left to right
  // Leads with positive values to build trust and show investors what "good" looks like first
  const renderLegend = () => {
    switch (mapView) {
      case "strScore":
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>A/A+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>B/B+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>D</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>F</span>
            </div>
          </>
        );
      case "homeValue":
        // Order: best (affordable/green) to worst (expensive/red)
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&lt;$200K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>$200-250K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>$250-350K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>$350-450K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&gt;$450K</span>
            </div>
          </>
        );
      case "appreciation":
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&gt;5.5%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>4-5.5%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>2-4%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>0-2%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&lt;0%</span>
            </div>
          </>
        );
      case "migration":
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&gt;100K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>50-100K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>0-50K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>-50K-0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&lt;-50K</span>
            </div>
          </>
        );
      case "inventoryLevel":
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>Very High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>Very Low</span>
            </div>
          </>
        );
      case "inventoryGrowth":
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&gt;25%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>18-25%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>10-18%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>0-10%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&lt;0%</span>
            </div>
          </>
        );
      case "priceCuts":
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&gt;28%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>22-28%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>16-22%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>12-16%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&lt;12%</span>
            </div>
          </>
        );
      case "daysOnMarket":
        return (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&gt;70 days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>55-70</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>40-55</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>30-40</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&lt;30</span>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Map View Filters */}
      <div 
        ref={tabContainerRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {views.map((view) => (
          <button
            key={view.key}
            data-active={mapView === view.key}
            onClick={() => setMapView(view.key as MapView)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: mapView === view.key ? '#2b2823' : '#ffffff',
              color: mapView === view.key ? '#ffffff' : '#787060',
              border: '1px solid #d8d6cd',
            }}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Swipe indicator dots for mobile */}
      <div className="flex justify-center gap-1.5 md:hidden">
        {views.map((view, index) => (
          <div
            key={view.key}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentViewIndex 
                ? 'bg-[#2b2823] w-4' 
                : 'bg-[#d8d6cd]'
            }`}
          />
        ))}
      </div>

      {/* Filter Description */}
      <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
        <p className="text-sm" style={{ color: '#787060' }}>{getFilterDescription()}</p>
      </div>

      {/* Map Grid - with swipe gesture support on entire map area */}
      <div 
        className="rounded-2xl p-4 touch-pan-y"
        style={{ backgroundColor: '#f5f4f0' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(11, 1fr)' }}>
          {Array.from({ length: 99 }).map((_, index) => {
            const row = Math.floor(index / 11);
            const col = index % 11;
            const stateEntry = Object.entries(statePositions).find(
              ([, pos]) => pos.row === row && pos.col === col
            );
            
            if (stateEntry) {
              const [stateCode] = stateEntry;
              return (
                <button
                  key={stateCode}
                  onClick={() => setSelectedState(stateCode === selectedState ? null : stateCode)}
                  className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all hover:scale-105 ${getStateColor(stateCode)} ${
                    selectedState === stateCode ? 'ring-2 ring-offset-1 ring-[#2b2823]' : ''
                  }`}
                >
                  {stateCode}
                </button>
              );
            }
            return <div key={index} className="aspect-square" />;
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center">
        <span className="text-sm font-medium" style={{ color: '#787060' }}>Legend:</span>
        {renderLegend()}
      </div>

      {/* Data timestamp */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#f5f4f0', color: '#787060' }}>
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Data last updated: February 2026
        </div>
      </div>

      {/* State Detail Popup */}
      {selectedStateData && (
        <div className="rounded-2xl p-5 shadow-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#d8d6cd' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold" style={{ color: '#2b2823' }}>{selectedStateData.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getGradeBgColor(selectedStateData.grade)} text-white`}>
                  {selectedStateData.grade}
                </span>
                <span className="text-sm" style={{ color: '#787060' }}>
                  {getVerdictText(selectedStateData.verdict).text}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedState(null)}
              className="p-1 rounded-full hover:bg-gray-100"
              style={{ color: '#787060' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
              <div className="text-xs" style={{ color: '#787060' }}>Median Home</div>
              <div className="text-lg font-bold" style={{ color: '#2b2823' }}>
                ${(selectedStateData.medianHomeValue / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
              <div className="text-xs" style={{ color: '#787060' }}>Appreciation</div>
              <div className="text-lg font-bold" style={{ color: '#2b2823' }}>
                {selectedStateData.appreciation.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
              <div className="text-xs" style={{ color: '#787060' }}>Net Migration</div>
              <div className="text-lg font-bold" style={{ color: '#2b2823' }}>
                {selectedStateData.netMigration > 0 ? '+' : ''}{(selectedStateData.netMigration / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
              <div className="text-xs" style={{ color: '#787060' }}>STR Status</div>
              <div className="text-lg font-bold" style={{ color: '#2b2823' }}>
                {selectedStateData.regulation === 'Legal' ? 'Friendly' : selectedStateData.regulation}
              </div>
            </div>
          </div>

          {/* Inventory Data */}
          {selectedInventoryData && (
            <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t" style={{ borderColor: '#e5e3da' }}>
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
                <div className="text-xs" style={{ color: '#787060' }}>Inventory Level</div>
                <div className="text-lg font-bold capitalize" style={{ color: '#2b2823' }}>
                  {selectedInventoryData.inventoryLevel.replace('-', ' ')}
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
                <div className="text-xs" style={{ color: '#787060' }}>Inventory Growth</div>
                <div className="text-lg font-bold" style={{ color: '#2b2823' }}>
                  {selectedInventoryData.inventoryGrowthYoY > 0 ? '+' : ''}{selectedInventoryData.inventoryGrowthYoY.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
                <div className="text-xs" style={{ color: '#787060' }}>Price Cuts</div>
                <div className="text-lg font-bold" style={{ color: '#2b2823' }}>
                  {selectedInventoryData.priceCutPercent.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5f4f0' }}>
                <div className="text-xs" style={{ color: '#787060' }}>Days on Market</div>
                <div className="text-lg font-bold" style={{ color: '#2b2823' }}>
                  {selectedInventoryData.daysOnMarket} days
                </div>
              </div>
            </div>
          )}

          <Link
            href={`/state/${selectedState?.toLowerCase()}`}
            className="block w-full py-3 rounded-xl text-center font-semibold transition-colors"
            style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
          >
            View {selectedStateData.name} Markets →
          </Link>
        </div>
      )}

      {/* Empty State */}
      {!selectedState && (
        <div className="text-center py-8 rounded-2xl" style={{ backgroundColor: '#f5f4f0' }}>
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: '#2b2823' }}>Select a State to Begin</h3>
          <p className="text-sm" style={{ color: '#787060' }}>
            Click any state on the map above to view STR investment grades, regulations, rental income data, and detailed market analysis.
          </p>
        </div>
      )}
    </div>
  );
}
