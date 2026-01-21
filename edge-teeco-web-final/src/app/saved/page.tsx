"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cityData, stateData } from "@/data/helpers";

export default function SavedPage() {
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [savedStates, setSavedStates] = useState<string[]>([]);

  useEffect(() => {
    const cities = JSON.parse(localStorage.getItem("savedCities") || "[]");
    const states = JSON.parse(localStorage.getItem("savedStates") || "[]");
    setSavedCities(cities);
    setSavedStates(states);
  }, []);

  const removeSavedCity = (cityId: string) => {
    const updated = savedCities.filter(id => id !== cityId);
    setSavedCities(updated);
    localStorage.setItem("savedCities", JSON.stringify(updated));
  };

  const removeSavedState = (stateCode: string) => {
    const updated = savedStates.filter(code => code !== stateCode);
    setSavedStates(updated);
    localStorage.setItem("savedStates", JSON.stringify(updated));
  };

  const savedCityData = cityData.filter(city => savedCities.includes(city.id));
  const savedStateData = stateData.filter(state => savedStates.includes(state.abbreviation));

  const getVerdict = (score: number) => {
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-600" };
    if (score >= 70) return { text: "BUY", color: "bg-emerald-500" };
    if (score >= 60) return { text: "HOLD", color: "bg-yellow-500" };
    return { text: "AVOID", color: "bg-red-500" };
  };

  const isEmpty = savedCityData.length === 0 && savedStateData.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Saved Markets</h1>
        <p className="text-muted text-sm">Your bookmarked investment opportunities</p>
      </div>

      {isEmpty ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❤️</div>
          <h3 className="text-lg font-semibold mb-2">No saved markets yet</h3>
          <p className="text-muted mb-6">
            Tap the heart icon on any market to save it here for quick access.
          </p>
          <Link
            href="/search"
            className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
          >
            Explore Markets
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Saved States */}
          {savedStateData.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">States ({savedStateData.length})</h2>
              <div className="space-y-3">
                {savedStateData.map((state) => (
                  <div
                    key={state.abbreviation}
                    className="bg-white border border-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <Link href={`/state/${state.abbreviation.toLowerCase()}`} className="flex-1">
                      <div className="font-medium">{state.name}</div>
                      <div className="text-sm text-muted">{state.cityCount} markets</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white mt-2 ${getVerdict(state.marketScore).color}`}>
                        {getVerdict(state.marketScore).text}
                      </span>
                    </Link>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{state.marketScore}</div>
                        <div className="text-xs text-muted">Score</div>
                      </div>
                      <button
                        onClick={() => removeSavedState(state.abbreviation)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Cities */}
          {savedCityData.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Cities & Counties ({savedCityData.length})</h2>
              <div className="space-y-3">
                {savedCityData.map((city) => (
                  <div
                    key={city.id}
                    className="bg-white border border-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <Link href={`/city/${city.id}`} className="flex-1">
                      <div className="font-medium">{city.name}</div>
                      <div className="text-sm text-muted">{city.county}, {city.stateCode}</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white mt-2 ${getVerdict(city.marketScore).color}`}>
                        {getVerdict(city.marketScore).text}
                      </span>
                    </Link>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{city.marketScore}</div>
                        <div className="text-xs text-muted">Score</div>
                      </div>
                      <button
                        onClick={() => removeSavedCity(city.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
