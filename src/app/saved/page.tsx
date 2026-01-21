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
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-500" };
    if (score >= 70) return { text: "BUY", color: "bg-green-500" };
    if (score >= 60) return { text: "HOLD", color: "bg-amber-500" };
    return { text: "AVOID", color: "bg-red-500" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const isEmpty = savedCityData.length === 0 && savedStateData.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">❤️</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Saved Markets</h1>
          </div>
          <p className="text-slate-500 ml-13">Your bookmarked investment opportunities</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isEmpty ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-card">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❤️</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No saved markets yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Tap the heart icon on any market to save it here for quick access.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Explore Markets
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                <div className="text-3xl font-bold text-teal-600">{savedStateData.length}</div>
                <div className="text-sm text-slate-500">States Saved</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                <div className="text-3xl font-bold text-teal-600">{savedCityData.length}</div>
                <div className="text-sm text-slate-500">Cities Saved</div>
              </div>
            </div>

            {/* Saved States */}
            {savedStateData.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span>🗺️</span> States ({savedStateData.length})
                </h2>
                <div className="space-y-3">
                  {savedStateData.map((state) => (
                    <div
                      key={state.abbreviation}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group"
                    >
                      <Link href={`/state/${state.abbreviation.toLowerCase()}`} className="flex-1 flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                          state.marketScore >= 80 ? "bg-emerald-50" : 
                          state.marketScore >= 70 ? "bg-green-50" : 
                          state.marketScore >= 60 ? "bg-amber-50" : "bg-red-50"
                        }`}>
                          <span className={`text-xl font-bold ${getScoreColor(state.marketScore)}`}>
                            {state.marketScore}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                            {state.name}
                          </div>
                          <div className="text-sm text-slate-500">{state.cityCount} markets</div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-white mt-2 ${getVerdict(state.marketScore).color}`}>
                            {getVerdict(state.marketScore).text}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeSavedState(state.abbreviation)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        aria-label="Remove from saved"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Cities */}
            {savedCityData.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span>🏙️</span> Cities & Counties ({savedCityData.length})
                </h2>
                <div className="space-y-3">
                  {savedCityData.map((city) => (
                    <div
                      key={city.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group"
                    >
                      <Link href={`/city/${city.id}`} className="flex-1 flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                          city.marketScore >= 80 ? "bg-emerald-50" : 
                          city.marketScore >= 70 ? "bg-green-50" : 
                          city.marketScore >= 60 ? "bg-amber-50" : "bg-red-50"
                        }`}>
                          <span className={`text-xl font-bold ${getScoreColor(city.marketScore)}`}>
                            {city.marketScore}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                            {city.name}
                          </div>
                          <div className="text-sm text-slate-500">{city.county}, {city.stateCode}</div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-white mt-2 ${getVerdict(city.marketScore).color}`}>
                            {getVerdict(city.marketScore).text}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeSavedCity(city.id)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        aria-label="Remove from saved"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
