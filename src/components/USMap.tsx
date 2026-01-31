"use client";

import { useState } from "react";
import Link from "next/link";
import { getStateByCode } from "@/data/helpers";

type MapView = "appreciation" | "migration" | "homeValue" | "strScore";

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

// Map colors - keeping map interactive colors for visual distinction
const getAppreciationColor = (value: number) => {
  if (value < 0) return "bg-red-400 text-white";
  if (value < 2) return "bg-amber-300 text-amber-900";
  if (value < 4) return "bg-emerald-300 text-emerald-900";
  if (value < 5.5) return "bg-emerald-500 text-white";
  return "bg-emerald-600 text-white";
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A+': return 'bg-emerald-600 text-white';
    case 'A': return 'bg-emerald-500 text-white';
    case 'B+': return 'bg-teal-600 text-white';
    case 'B': return 'bg-teal-500 text-white';
    case 'C': return 'bg-amber-400 text-amber-900';
    case 'D': return 'bg-orange-400 text-white';
    default: return 'bg-red-400 text-white';
  }
};

const getGradeBgColor = (grade: string) => {
  switch (grade) {
    case 'A+': return 'bg-emerald-500';
    case 'A': return 'bg-emerald-400';
    case 'B+': return 'bg-teal-600';
    case 'B': return 'bg-teal-500';
    case 'C': return 'bg-amber-500';
    case 'D': return 'bg-orange-500';
    default: return 'bg-red-500';
  }
};

export function USMap() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [mapView, setMapView] = useState<MapView>("strScore");

  const getStateColor = (stateCode: string) => {
    const state = getStateByCode(stateCode);
    if (!state) return "bg-[#e5e3da] text-[#787060]";
    
    switch (mapView) {
      case "appreciation":
        return getAppreciationColor(state.appreciation);
      case "strScore":
        return getGradeColor(state.grade);
      case "homeValue":
        // Low prices = green (more affordable = better for investors)
        if (state.medianHomeValue < 200000) return "bg-emerald-600 text-white";
        if (state.medianHomeValue < 250000) return "bg-emerald-500 text-white";
        if (state.medianHomeValue < 300000) return "bg-emerald-300 text-emerald-900";
        if (state.medianHomeValue < 400000) return "bg-amber-300 text-amber-900";
        return "bg-red-400 text-white";
      case "migration":
        if (state.netMigration > 100000) return "bg-emerald-600 text-white";
        if (state.netMigration > 50000) return "bg-emerald-500 text-white";
        if (state.netMigration > 0) return "bg-emerald-300 text-emerald-900";
        if (state.netMigration > -50000) return "bg-amber-300 text-amber-900";
        return "bg-red-400 text-white";
      default:
        return "bg-[#e5e3da] text-[#787060]";
    }
  };

  const selectedStateData = selectedState 
    ? getStateByCode(selectedState) 
    : null;

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return { text: 'STRONG BUY', emoji: '🚀' };
      case 'buy': return { text: 'BUY', emoji: '✅' };
      case 'hold': return { text: 'HOLD', emoji: '⚠️' };
      case 'caution': return { text: 'CAUTION', emoji: '⚠️' };
      default: return { text: 'AVOID', emoji: '❌' };
    }
  };

  const views = [
    { key: "strScore", label: "STR Grade", icon: "📊", description: "Our overall investment score based on cash flow, affordability, and legality." },
    { key: "appreciation", label: "Appreciation", icon: "📈", description: "Higher appreciation means your property value grows faster over time." },
    { key: "migration", label: "Migration", icon: "🚚", description: "More people moving in often leads to rising home prices and rental demand." },
    { key: "homeValue", label: "Home Prices", icon: "💰", description: "Lower prices mean easier entry and better cash-on-cash returns." },
  ];

  const getFilterDescription = () => {
    const view = views.find(v => v.key === mapView);
    return view?.description || "";
  };

  return (
    <div className="space-y-5">
      {/* Map View Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {views.map((view) => (
          <button
            key={view.key}
            onClick={() => setMapView(view.key as MapView)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: mapView === view.key ? '#2b2823' : '#ffffff',
              color: mapView === view.key ? '#ffffff' : '#2b2823',
              border: mapView === view.key ? 'none' : '1px solid #d8d6cd',
              boxShadow: mapView === view.key ? '0 2px 8px -2px rgba(43, 40, 35, 0.2)' : 'none'
            }}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
          </button>
        ))}
      </div>
      
      {/* Filter Explanation */}
      <div 
        className="rounded-xl px-4 py-2.5 text-center"
        style={{ backgroundColor: '#e5e3da', border: '1px solid #d8d6cd' }}
      >
        <p className="text-sm" style={{ color: '#787060' }}>{getFilterDescription()}</p>
      </div>

      {/* Map Grid - keeping map colors for visual distinction */}
      <div 
        className="rounded-2xl p-4 sm:p-6"
        style={{ backgroundColor: '#e5e3da' }}
      >
        <div className="grid grid-cols-11 gap-1.5 sm:gap-2 max-w-xl mx-auto">
          {Object.entries(statePositions).map(([stateCode, pos]) => (
            <button
              key={stateCode}
              onClick={() => setSelectedState(stateCode === selectedState ? null : stateCode)}
              className={`aspect-square flex items-center justify-center text-[10px] sm:text-xs font-semibold rounded-lg transition-all transform hover:scale-105 ${getStateColor(stateCode)} ${
                selectedState === stateCode 
                  ? "ring-2 ring-[#2b2823] ring-offset-2 ring-offset-[#e5e3da] scale-110 shadow-lg z-10" 
                  : "shadow-sm hover:shadow-md"
              }`}
              style={{
                gridRow: pos.row + 1,
                gridColumn: pos.col + 1,
              }}
            >
              {stateCode}
            </button>
          ))}
        </div>
      </div>

      {/* Legend - keeping map colors for visual distinction */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
        <span className="font-semibold" style={{ color: '#2b2823' }}>Legend:</span>
        {mapView === "strScore" ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>F</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>D</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-teal-500 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>B/B+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-500 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>A/A+</span>
            </div>
          </>
        ) : mapView === "homeValue" ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&lt;$200K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>$200-300K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>$300-400K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>&gt;$400K</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span style={{ color: '#787060' }}>High</span>
            </div>
          </>
        )}
      </div>

      {/* Selected State Card */}
      {selectedStateData && (
        <div 
          className="rounded-2xl overflow-hidden animate-scale-in"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 4px 16px -4px rgba(43, 40, 35, 0.12)' }}
        >
          {/* Header */}
          <div 
            className="p-4 sm:p-5"
            style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 
                  className="text-xl sm:text-2xl font-bold"
                  style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {selectedStateData.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getGradeBgColor(selectedStateData.grade)} text-white`}>
                    {getVerdictText(selectedStateData.verdict).text}
                  </span>
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: selectedStateData.regulation === "Legal" ? '#2b2823' : '#787060' }}
                  >
                    {selectedStateData.regulation}
                  </span>
                </div>
              </div>
              <div 
                className="text-center rounded-xl px-4 py-2"
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className={`text-3xl font-bold ${getGradeBgColor(selectedStateData.grade)} text-white rounded-lg px-3 py-1`} style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                  {selectedStateData.grade}
                </div>
                <div className="text-xs mt-1" style={{ color: '#787060' }}>{selectedStateData.marketScore}/100</div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div 
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: '#e5e3da' }}
              >
                <div 
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  ${selectedStateData.avgADR}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#787060' }}>Avg ADR</div>
              </div>
              <div 
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: '#e5e3da' }}
              >
                <div 
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  ${(selectedStateData.medianHomeValue / 1000).toFixed(0)}K
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#787060' }}>Median Home</div>
              </div>
              <div 
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: '#e5e3da' }}
              >
                <div 
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: selectedStateData.appreciation >= 0 ? '#000000' : '#787060' }}
                >
                  {selectedStateData.appreciation >= 0 ? "+" : ""}{selectedStateData.appreciation}%
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#787060' }}>1Y Appreciation</div>
              </div>
              <div 
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: '#e5e3da' }}
              >
                <div 
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {selectedStateData.cityCount}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#787060' }}>Markets</div>
              </div>
            </div>
            
            {/* City Grade Distribution Preview */}
            <div 
              className="mt-4 p-3 rounded-xl"
              style={{ backgroundColor: '#e5e3da' }}
            >
              <div className="text-xs font-medium mb-2" style={{ color: '#787060' }}>Market Grade Distribution</div>
              <div className="flex gap-1">
                {selectedStateData.cityGrades.map(({ grade, count }) => {
                  const total = selectedStateData.cityGrades.reduce((sum, g) => sum + g.count, 0);
                  const width = (count / total) * 100;
                  return width > 0 ? (
                    <div
                      key={grade}
                      className={`h-3 ${getGradeBgColor(grade)} rounded-full`}
                      style={{ width: `${width}%` }}
                      title={`${grade}: ${count} markets`}
                    />
                  ) : null;
                })}
              </div>
            </div>

            <Link
              href={`/state/${selectedStateData.abbreviation.toLowerCase()}`}
              className="flex items-center justify-center gap-2 w-full mt-4 py-3.5 text-center rounded-xl font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
            >
              <span>Explore {selectedStateData.cityCount} Markets</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Default Card */}
      {!selectedStateData && (
        <div 
          className="rounded-2xl p-6 sm:p-8 text-center"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
        >
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(43, 40, 35, 0.08)' }}
          >
            <span className="text-3xl">🗺️</span>
          </div>
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Select a State to Begin
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: '#787060' }}>
            Click any state on the map above to view STR investment grades, regulations, rental income data, and detailed market analysis.
          </p>
        </div>
      )}
    </div>
  );
}
