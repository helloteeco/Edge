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

const getAppreciationColor = (value: number) => {
  if (value < 0) return "bg-red-400 text-white";
  if (value < 2) return "bg-amber-300 text-amber-900";
  if (value < 4) return "bg-emerald-300 text-emerald-900";
  if (value < 5.5) return "bg-emerald-500 text-white";
  return "bg-emerald-600 text-white";
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-600 text-white";
  if (score >= 70) return "bg-emerald-500 text-white";
  if (score >= 60) return "bg-emerald-300 text-emerald-900";
  if (score >= 50) return "bg-amber-300 text-amber-900";
  return "bg-red-400 text-white";
};

export function USMap() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [mapView, setMapView] = useState<MapView>("strScore");

  const getStateColor = (stateCode: string) => {
    const state = getStateByCode(stateCode);
    if (!state) return "bg-slate-200 text-slate-600";
    
    switch (mapView) {
      case "appreciation":
        return getAppreciationColor(state.appreciation);
      case "strScore":
        return getScoreColor(state.marketScore);
      case "homeValue":
        if (state.medianHomeValue < 200000) return "bg-emerald-600 text-white";
        if (state.medianHomeValue < 300000) return "bg-emerald-500 text-white";
        if (state.medianHomeValue < 400000) return "bg-emerald-300 text-emerald-900";
        if (state.medianHomeValue < 500000) return "bg-amber-300 text-amber-900";
        return "bg-red-400 text-white";
      case "migration":
        if (state.netMigration > 100000) return "bg-emerald-600 text-white";
        if (state.netMigration > 50000) return "bg-emerald-500 text-white";
        if (state.netMigration > 0) return "bg-emerald-300 text-emerald-900";
        if (state.netMigration > -50000) return "bg-amber-300 text-amber-900";
        return "bg-red-400 text-white";
      default:
        return "bg-slate-200 text-slate-600";
    }
  };

  const selectedStateData = selectedState 
    ? getStateByCode(selectedState) 
    : null;

  const getVerdict = (score: number) => {
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-500", textColor: "text-emerald-700" };
    if (score >= 70) return { text: "BUY", color: "bg-green-500", textColor: "text-green-700" };
    if (score >= 60) return { text: "HOLD", color: "bg-amber-500", textColor: "text-amber-700" };
    return { text: "AVOID", color: "bg-red-500", textColor: "text-red-700" };
  };

  const views = [
    { key: "strScore", label: "STR Score", icon: "📊" },
    { key: "appreciation", label: "Appreciation", icon: "📈" },
    { key: "migration", label: "Migration", icon: "🚚" },
    { key: "homeValue", label: "Home Value", icon: "🏠" },
  ];

  return (
    <div className="space-y-5">
      {/* Map View Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {views.map((view) => (
          <button
            key={view.key}
            onClick={() => setMapView(view.key as MapView)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              mapView === view.key
                ? "bg-teal-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Map Grid */}
      <div className="bg-slate-100 rounded-2xl p-4 sm:p-6">
        <div className="grid grid-cols-11 gap-1.5 sm:gap-2 max-w-xl mx-auto">
          {Object.entries(statePositions).map(([stateCode, pos]) => (
            <button
              key={stateCode}
              onClick={() => setSelectedState(stateCode === selectedState ? null : stateCode)}
              className={`aspect-square flex items-center justify-center text-[10px] sm:text-xs font-semibold rounded-lg transition-all transform hover:scale-105 ${getStateColor(stateCode)} ${
                selectedState === stateCode 
                  ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-slate-100 scale-110 shadow-lg z-10" 
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

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
        <span className="font-semibold text-slate-700">Legend:</span>
        {mapView === "strScore" ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span className="text-slate-600">&lt;50</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span className="text-slate-600">50-60</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-300 rounded-md shadow-sm" />
              <span className="text-slate-600">60-70</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-500 rounded-md shadow-sm" />
              <span className="text-slate-600">70-80</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span className="text-slate-600">80+</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-red-400 rounded-md shadow-sm" />
              <span className="text-slate-600">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-amber-300 rounded-md shadow-sm" />
              <span className="text-slate-600">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-emerald-600 rounded-md shadow-sm" />
              <span className="text-slate-600">High</span>
            </div>
          </>
        )}
      </div>

      {/* Selected State Card */}
      {selectedStateData && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold">{selectedStateData.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getVerdict(selectedStateData.marketScore).color} text-white`}>
                    {getVerdict(selectedStateData.marketScore).text}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedStateData.regulation === "Legal" ? "bg-emerald-500" : "bg-amber-500"
                  } text-white`}>
                    {selectedStateData.regulation}
                  </span>
                </div>
              </div>
              <div className="text-center bg-white rounded-xl px-4 py-2 shadow-sm">
                <div className="text-3xl font-bold text-teal-700">{selectedStateData.marketScore}</div>
                <div className="text-xs text-slate-500">Score</div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-slate-900">${selectedStateData.avgADR}</div>
                <div className="text-xs text-slate-500 mt-0.5">Avg ADR</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-slate-900">${(selectedStateData.medianHomeValue / 1000).toFixed(0)}K</div>
                <div className="text-xs text-slate-500 mt-0.5">Median Home</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className={`text-lg sm:text-xl font-bold ${selectedStateData.appreciation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {selectedStateData.appreciation >= 0 ? "+" : ""}{selectedStateData.appreciation}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">1Y Appreciation</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-teal-600">{selectedStateData.cityCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">Markets</div>
              </div>
            </div>

            <Link
              href={`/state/${selectedStateData.abbreviation.toLowerCase()}`}
              className="flex items-center justify-center gap-2 w-full mt-4 py-3.5 bg-teal-600 text-white text-center rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-sm"
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
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🗺️</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a State to Begin</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Click any state on the map above to view STR opportunity scores, regulations, rental income data, and detailed investment analysis.
          </p>
        </div>
      )}
    </div>
  );
}
