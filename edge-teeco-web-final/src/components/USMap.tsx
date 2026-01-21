"use client";

import { useState } from "react";
import Link from "next/link";
import { getStateByCode } from "@/data/helpers";

type MapView = "appreciation" | "migration" | "homeValue" | "strScore";

const statePositions: Record<string, { row: number; col: number }> = {
  WA: { row: 0, col: 0 }, MT: { row: 0, col: 1 }, ND: { row: 0, col: 2 }, MN: { row: 0, col: 3 },
  WI: { row: 0, col: 4 }, MI: { row: 0, col: 5 }, VT: { row: 0, col: 8 }, NH: { row: 0, col: 9 },
  ME: { row: 0, col: 10 },
  OR: { row: 1, col: 0 }, ID: { row: 1, col: 1 }, SD: { row: 1, col: 2 }, IA: { row: 1, col: 3 },
  IL: { row: 1, col: 4 }, IN: { row: 1, col: 5 }, OH: { row: 1, col: 6 }, PA: { row: 1, col: 7 },
  NY: { row: 1, col: 8 }, MA: { row: 1, col: 9 }, RI: { row: 1, col: 10 },
  NV: { row: 2, col: 0 }, WY: { row: 2, col: 1 }, NE: { row: 2, col: 2 }, MO: { row: 2, col: 3 },
  KY: { row: 2, col: 4 }, WV: { row: 2, col: 5 }, VA: { row: 2, col: 6 }, MD: { row: 2, col: 7 },
  NJ: { row: 2, col: 8 }, CT: { row: 2, col: 9 },
  CA: { row: 3, col: 0 }, UT: { row: 3, col: 1 }, CO: { row: 3, col: 2 }, KS: { row: 3, col: 3 },
  TN: { row: 3, col: 4 }, NC: { row: 3, col: 5 }, SC: { row: 3, col: 6 }, DE: { row: 3, col: 7 },
  AZ: { row: 4, col: 0 }, NM: { row: 4, col: 1 }, OK: { row: 4, col: 2 }, AR: { row: 4, col: 3 },
  MS: { row: 4, col: 4 }, AL: { row: 4, col: 5 }, GA: { row: 4, col: 6 },
  TX: { row: 5, col: 0 }, LA: { row: 5, col: 1 }, FL: { row: 5, col: 4 },
  AK: { row: 6, col: 0 }, HI: { row: 6, col: 4 },
};

const getAppreciationColor = (value: number) => {
  if (value < 0) return "bg-red-200";
  if (value < 2) return "bg-yellow-200";
  if (value < 4) return "bg-emerald-200";
  if (value < 5.5) return "bg-emerald-400";
  return "bg-emerald-600";
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-600";
  if (score >= 70) return "bg-emerald-400";
  if (score >= 60) return "bg-emerald-200";
  if (score >= 50) return "bg-yellow-200";
  return "bg-red-200";
};

export function USMap() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [mapView, setMapView] = useState<MapView>("strScore");

  const getStateColor = (stateCode: string) => {
    const state = getStateByCode(stateCode);
    if (!state) return "bg-gray-200";
    
    switch (mapView) {
      case "appreciation":
        return getAppreciationColor(state.appreciation);
      case "strScore":
        return getScoreColor(state.marketScore);
      case "homeValue":
        if (state.medianHomeValue < 200000) return "bg-emerald-600";
        if (state.medianHomeValue < 300000) return "bg-emerald-400";
        if (state.medianHomeValue < 400000) return "bg-emerald-200";
        if (state.medianHomeValue < 500000) return "bg-yellow-200";
        return "bg-red-200";
      case "migration":
        if (state.netMigration > 100000) return "bg-emerald-600";
        if (state.netMigration > 50000) return "bg-emerald-400";
        if (state.netMigration > 0) return "bg-emerald-200";
        if (state.netMigration > -50000) return "bg-yellow-200";
        return "bg-red-200";
      default:
        return "bg-gray-200";
    }
  };

  const selectedStateData = selectedState 
    ? getStateByCode(selectedState) 
    : null;

  const getVerdict = (score: number) => {
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-600" };
    if (score >= 70) return { text: "BUY", color: "bg-emerald-500" };
    if (score >= 60) return { text: "HOLD", color: "bg-yellow-500" };
    return { text: "AVOID", color: "bg-red-500" };
  };

  return (
    <div className="space-y-6">
      {/* Map View Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "strScore", label: "STR Score" },
          { key: "appreciation", label: "Appreciation" },
          { key: "migration", label: "Migration" },
          { key: "homeValue", label: "Home Value" },
        ].map((view) => (
          <button
            key={view.key}
            onClick={() => setMapView(view.key as MapView)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              mapView === view.key
                ? "bg-primary text-white"
                : "bg-surface text-foreground hover:bg-border"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Map Grid */}
      <div className="grid grid-cols-11 gap-1 max-w-2xl mx-auto">
        {Object.entries(statePositions).map(([stateCode, pos]) => (
          <button
            key={stateCode}
            onClick={() => setSelectedState(stateCode === selectedState ? null : stateCode)}
            className={`aspect-square flex items-center justify-center text-xs font-medium rounded transition-all ${getStateColor(stateCode)} ${
              selectedState === stateCode ? "ring-2 ring-primary ring-offset-2" : ""
            } hover:opacity-80`}
            style={{
              gridRow: pos.row + 1,
              gridColumn: pos.col + 1,
            }}
          >
            {stateCode}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <span className="font-medium">Legend:</span>
        {mapView === "strScore" ? (
          <>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-200 rounded" />
              <span>&lt;50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-200 rounded" />
              <span>50-60</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-emerald-200 rounded" />
              <span>60-70</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-emerald-400 rounded" />
              <span>70-80</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-emerald-600 rounded" />
              <span>80+</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-200 rounded" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-emerald-600 rounded" />
              <span>High</span>
            </div>
          </>
        )}
      </div>

      {/* Selected State Card */}
      {selectedStateData && (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-bold">{selectedStateData.name}</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white mt-2 ${getVerdict(selectedStateData.marketScore).color}`}>
                {getVerdict(selectedStateData.marketScore).text}
              </span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{selectedStateData.marketScore}</div>
              <div className="text-xs text-muted">STR Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-muted">Regulation</div>
              <div className={`font-medium ${selectedStateData.regulation === "Legal" ? "text-emerald-600" : "text-yellow-600"}`}>
                {selectedStateData.regulation}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted">Avg ADR</div>
              <div className="font-medium">${selectedStateData.avgADR}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Median Home Value</div>
              <div className="font-medium">${(selectedStateData.medianHomeValue / 1000).toFixed(0)}K</div>
            </div>
            <div>
              <div className="text-xs text-muted">1-Year Appreciation</div>
              <div className={`font-medium ${selectedStateData.appreciation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {selectedStateData.appreciation >= 0 ? "+" : ""}{selectedStateData.appreciation}%
              </div>
            </div>
          </div>

          <Link
            href={`/state/${selectedStateData.abbreviation.toLowerCase()}`}
            className="block w-full py-3 bg-primary text-white text-center rounded-xl font-medium hover:bg-primary-dark transition-colors"
          >
            View Cities & Counties ({selectedStateData.cityCount})
          </Link>
        </div>
      )}

      {/* Default Card */}
      {!selectedStateData && (
        <div className="bg-white border border-border rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Find Your Next STR Investment</h3>
          <p className="text-muted text-sm">
            Select a state on the map to view STR opportunity scores, regulations, rental income data, and investment analysis.
          </p>
        </div>
      )}
    </div>
  );
}
