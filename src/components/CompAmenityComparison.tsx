"use client";

import React, { useMemo, useState } from "react";

// Revenue-impacting amenities ranked by guest demand and pricing power
const AMENITY_CATEGORIES = {
  "Revenue Boosters": {
    icon: "💰",
    amenities: [
      { key: "hot tub", label: "Hot Tub", boost: "+15-25% ADR" },
      { key: "pool", label: "Pool", boost: "+10-20% ADR" },
      { key: "sauna", label: "Sauna", boost: "+10-15% ADR" },
      { key: "game room", label: "Game Room", boost: "+5-10% ADR" },
      { key: "ev charger", label: "EV Charger", boost: "+5-8% ADR" },
      { key: "fireplace", label: "Fireplace", boost: "+5-10% ADR" },
      { key: "fire pit", label: "Fire Pit", boost: "+5-8% ADR" },
      { key: "gym", label: "Gym/Fitness", boost: "+3-5% ADR" },
      { key: "bbq", label: "BBQ Grill", boost: "+3-5% ADR" },
      { key: "outdoor dining", label: "Outdoor Dining", boost: "+3-5% ADR" },
    ],
  },
  "Guest Essentials": {
    icon: "⭐",
    amenities: [
      { key: "wifi", label: "WiFi", boost: "Expected" },
      { key: "kitchen", label: "Full Kitchen", boost: "Expected" },
      { key: "washer", label: "Washer", boost: "Expected" },
      { key: "dryer", label: "Dryer", boost: "Expected" },
      { key: "air conditioning", label: "A/C", boost: "Expected" },
      { key: "heating", label: "Heating", boost: "Expected" },
      { key: "tv", label: "TV", boost: "Expected" },
      { key: "coffee", label: "Coffee Maker", boost: "Expected" },
      { key: "parking", label: "Free Parking", boost: "Expected" },
      { key: "self check-in", label: "Self Check-in", boost: "Expected" },
    ],
  },
  "Booking Drivers": {
    icon: "📈",
    amenities: [
      { key: "pet", label: "Pet Friendly", boost: "+10-15% bookings" },
      { key: "workspace", label: "Workspace/Desk", boost: "+5-10% bookings" },
      { key: "crib", label: "Crib/High Chair", boost: "+5-8% bookings" },
      { key: "accessible", label: "Accessible", boost: "+3-5% bookings" },
      { key: "lake", label: "Lake/Water Access", boost: "+10-20% bookings" },
      { key: "mountain view", label: "Mountain View", boost: "+5-15% bookings" },
      { key: "waterfront", label: "Waterfront", boost: "+15-25% bookings" },
      { key: "ski", label: "Ski-in/Ski-out", boost: "+20-30% bookings" },
    ],
  },
};

// Normalize amenity string for matching
function normalizeAmenity(amenity: string): string {
  return amenity.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

// Check if a comp has a specific amenity
function hasAmenity(compAmenities: string[], searchKey: string): boolean {
  const normalized = compAmenities.map(normalizeAmenity);
  const key = searchKey.toLowerCase();
  return normalized.some(
    (a) =>
      a.includes(key) ||
      // Handle common variations
      (key === "wifi" && (a.includes("wi-fi") || a.includes("wireless") || a.includes("internet"))) ||
      (key === "pool" && a.includes("pool") && !a.includes("pool table")) ||
      (key === "hot tub" && (a.includes("hot tub") || a.includes("jacuzzi") || a.includes("spa"))) ||
      (key === "bbq" && (a.includes("bbq") || a.includes("barbecue") || a.includes("grill"))) ||
      (key === "parking" && a.includes("parking")) ||
      (key === "tv" && (a.includes("tv") || a.includes("television") || a.includes("netflix") || a.includes("streaming"))) ||
      (key === "coffee" && (a.includes("coffee") || a.includes("espresso") || a.includes("keurig"))) ||
      (key === "pet" && (a.includes("pet") || a.includes("dog"))) ||
      (key === "workspace" && (a.includes("workspace") || a.includes("desk") || a.includes("office"))) ||
      (key === "crib" && (a.includes("crib") || a.includes("high chair") || a.includes("baby"))) ||
      (key === "accessible" && (a.includes("accessible") || a.includes("wheelchair"))) ||
      (key === "self check-in" && (a.includes("self check") || a.includes("keypad") || a.includes("smart lock") || a.includes("lockbox"))) ||
      (key === "ev charger" && (a.includes("ev charger") || a.includes("electric vehicle"))) ||
      (key === "fire pit" && a.includes("fire pit")) ||
      (key === "fireplace" && a.includes("fireplace")) ||
      (key === "game room" && (a.includes("game") || a.includes("arcade") || a.includes("ping pong") || a.includes("foosball") || a.includes("billiard") || a.includes("pool table"))) ||
      (key === "gym" && (a.includes("gym") || a.includes("fitness") || a.includes("exercise"))) ||
      (key === "sauna" && a.includes("sauna")) ||
      (key === "lake" && (a.includes("lake") || a.includes("pond"))) ||
      (key === "mountain view" && a.includes("mountain")) ||
      (key === "waterfront" && (a.includes("waterfront") || a.includes("beachfront") || a.includes("ocean"))) ||
      (key === "ski" && a.includes("ski"))
  );
}

interface CompAmenityComparisonProps {
  comparables: {
    id: string;
    name: string;
    amenities?: string[];
    nightPrice: number;
    rating: number;
    isSuperhost?: boolean;
  }[];
  excludedCompIds?: Set<string | number>;
}

export default function CompAmenityComparison({
  comparables,
  excludedCompIds = new Set(),
}: CompAmenityComparisonProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Revenue Boosters");
  const [showAllComps, setShowAllComps] = useState(false);

  // Filter to included comps only
  const includedComps = useMemo(
    () => comparables.filter((c) => !excludedCompIds.has(c.id) && c.amenities && c.amenities.length > 0),
    [comparables, excludedCompIds]
  );

  // Analyze amenities across all included comps
  const analysis = useMemo(() => {
    if (includedComps.length === 0) return null;

    const results: Record<
      string,
      {
        categoryIcon: string;
        amenities: {
          key: string;
          label: string;
          boost: string;
          compCount: number;
          percentage: number;
          topCompHasIt: boolean;
        }[];
      }
    > = {};

    // Sort comps by revenue (nightPrice * rating as proxy)
    const sortedComps = [...includedComps].sort(
      (a, b) => b.nightPrice * (b.rating || 4) - a.nightPrice * (a.rating || 4)
    );
    const topComp = sortedComps[0];

    for (const [catName, catData] of Object.entries(AMENITY_CATEGORIES)) {
      results[catName] = {
        categoryIcon: catData.icon,
        amenities: catData.amenities.map((amenity) => {
          const compCount = includedComps.filter((c) =>
            hasAmenity(c.amenities || [], amenity.key)
          ).length;
          return {
            key: amenity.key,
            label: amenity.label,
            boost: amenity.boost,
            compCount,
            percentage: Math.round((compCount / includedComps.length) * 100),
            topCompHasIt: topComp ? hasAmenity(topComp.amenities || [], amenity.key) : false,
          };
        }),
      };
    }

    // Find missing opportunities (amenities that top earners have but <50% of comps have)
    const opportunities = Object.values(results)
      .flatMap((cat) => cat.amenities)
      .filter((a) => a.topCompHasIt && a.percentage < 50)
      .sort((a, b) => b.percentage - a.percentage);

    // Find must-haves (amenities that 80%+ of comps have)
    const mustHaves = Object.values(results)
      .flatMap((cat) => cat.amenities)
      .filter((a) => a.percentage >= 80);

    return { categories: results, opportunities, mustHaves, topComp, totalComps: includedComps.length };
  }, [includedComps]);

  if (!analysis || includedComps.length === 0) {
    return null;
  }

  const displayComps = showAllComps ? includedComps : includedComps.slice(0, 6);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              🏠 Amenity Comparison
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              What top-performing comps offer — {analysis.totalComps} listings analyzed
            </p>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          {/* Must-Haves */}
          <div>
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">
              Must-Haves ({analysis.mustHaves.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {analysis.mustHaves.slice(0, 6).map((a) => (
                <span
                  key={a.key}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800"
                >
                  ✓ {a.label}
                </span>
              ))}
              {analysis.mustHaves.length > 6 && (
                <span className="text-[10px] text-gray-500">+{analysis.mustHaves.length - 6} more</span>
              )}
            </div>
          </div>

          {/* Opportunities */}
          <div>
            <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-wider mb-1.5">
              Edge Opportunities ({analysis.opportunities.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {analysis.opportunities.slice(0, 4).map((a) => (
                <span
                  key={a.key}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-800"
                >
                  ★ {a.label}
                  <span className="ml-1 text-orange-600">{a.boost}</span>
                </span>
              ))}
              {analysis.opportunities.length === 0 && (
                <span className="text-[10px] text-gray-500">No gaps found — comps are well-matched</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {Object.entries(AMENITY_CATEGORIES).map(([catName, catData]) => (
          <button
            key={catName}
            onClick={() => setExpandedCategory(expandedCategory === catName ? null : catName)}
            className={`flex-1 min-w-0 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              expandedCategory === catName
                ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {catData.icon} {catName}
          </button>
        ))}
      </div>

      {/* Amenity Grid */}
      {expandedCategory && analysis.categories[expandedCategory] && (
        <div className="px-4 py-3">
          {/* Comp column headers */}
          <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
            <div className="w-28 flex-shrink-0 text-[10px] font-semibold text-gray-500 uppercase">
              Amenity
            </div>
            {displayComps.map((comp, idx) => (
              <div
                key={comp.id}
                className="w-10 flex-shrink-0 text-center"
                title={comp.name}
              >
                <div
                  className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx === 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {idx + 1}
                </div>
              </div>
            ))}
            <div className="w-14 flex-shrink-0 text-center text-[10px] font-semibold text-gray-500">
              % Have
            </div>
          </div>

          {/* Amenity rows */}
          {analysis.categories[expandedCategory].amenities.map((amenity) => (
            <div
              key={amenity.key}
              className={`flex items-center gap-1 py-1.5 border-b border-gray-50 last:border-0 ${
                amenity.percentage >= 80
                  ? "bg-green-50/30"
                  : amenity.percentage === 0
                  ? "bg-gray-50/30"
                  : ""
              }`}
            >
              <div className="w-28 flex-shrink-0">
                <p className="text-xs font-medium text-gray-800 truncate">{amenity.label}</p>
                <p className="text-[9px] text-gray-400">{amenity.boost}</p>
              </div>
              {displayComps.map((comp) => {
                const has = hasAmenity(comp.amenities || [], amenity.key);
                return (
                  <div key={comp.id} className="w-10 flex-shrink-0 text-center">
                    {has ? (
                      <span className="text-green-600 text-sm">✓</span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </div>
                );
              })}
              <div className="w-14 flex-shrink-0 text-center">
                <span
                  className={`text-xs font-semibold ${
                    amenity.percentage >= 80
                      ? "text-green-600"
                      : amenity.percentage >= 50
                      ? "text-amber-600"
                      : amenity.percentage > 0
                      ? "text-orange-500"
                      : "text-gray-300"
                  }`}
                >
                  {amenity.percentage}%
                </span>
              </div>
            </div>
          ))}

          {/* Show more comps toggle */}
          {includedComps.length > 6 && (
            <button
              onClick={() => setShowAllComps(!showAllComps)}
              className="w-full mt-2 py-1.5 text-xs text-blue-600 font-medium hover:text-blue-700"
            >
              {showAllComps
                ? "Show fewer comps"
                : `Show all ${includedComps.length} comps`}
            </button>
          )}
        </div>
      )}

      {/* Bottom Insight */}
      {analysis.topComp && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-500">
            <span className="font-semibold text-gray-700">Top earner:</span>{" "}
            {analysis.topComp.name?.slice(0, 40)}
            {(analysis.topComp.name?.length || 0) > 40 ? "..." : ""} — $
            {analysis.topComp.nightPrice}/night
            {analysis.topComp.isSuperhost && (
              <span className="ml-1 text-amber-600">⭐ Superhost</span>
            )}
            {analysis.topComp.rating > 0 && (
              <span className="ml-1">({analysis.topComp.rating}★)</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
