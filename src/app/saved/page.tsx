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

  const isEmpty = savedCityData.length === 0 && savedStateData.length === 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div 
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #d8d6cd'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#e5e3da' }}
            >
              <span className="text-xl">❤️</span>
            </div>
            <h1 
              className="text-2xl font-bold"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Saved Markets
            </h1>
          </div>
          <p className="ml-13" style={{ color: '#787060' }}>Your bookmarked investment opportunities</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isEmpty ? (
          <div 
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
          >
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#e5e3da' }}
            >
              <span className="text-4xl">❤️</span>
            </div>
            <h3 
              className="text-xl font-semibold mb-2"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              No saved markets yet
            </h3>
            <p className="mb-6 max-w-sm mx-auto" style={{ color: '#787060' }}>
              Tap the heart icon on any market to save it here for quick access.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
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
              <div 
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
              >
                <div 
                  className="text-3xl font-bold"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {savedStateData.length}
                </div>
                <div className="text-sm" style={{ color: '#787060' }}>States Saved</div>
              </div>
              <div 
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
              >
                <div 
                  className="text-3xl font-bold"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {savedCityData.length}
                </div>
                <div className="text-sm" style={{ color: '#787060' }}>Cities Saved</div>
              </div>
            </div>

            {/* Saved States */}
            {savedStateData.length > 0 && (
              <div>
                <h2 
                  className="font-semibold mb-3 flex items-center gap-2"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  <span>🗺️</span> States ({savedStateData.length})
                </h2>
                <div className="space-y-3">
                  {savedStateData.map((state) => (
                    <div
                      key={state.abbreviation}
                      className="rounded-xl p-4 flex items-center gap-4 transition-all duration-300 group"
                      style={{ 
                        backgroundColor: '#ffffff',
                        border: '1px solid #d8d6cd',
                        boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
                      }}
                    >
                      <Link href={`/state/${state.abbreviation.toLowerCase()}`} className="flex-1 flex items-center gap-4">
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
                        <div className="flex-1">
                          <div 
                            className="font-semibold transition-colors"
                            style={{ color: '#2b2823' }}
                          >
                            {state.name}
                          </div>
                          <div className="text-sm" style={{ color: '#787060' }}>{state.cityCount} markets</div>
                          <span 
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold mt-2"
                            style={{ backgroundColor: getVerdictStyle(state.marketScore).bg, color: getVerdictStyle(state.marketScore).color }}
                          >
                            {getVerdictStyle(state.marketScore).text}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeSavedState(state.abbreviation)}
                        className="p-3 rounded-xl transition-all hover:opacity-70"
                        style={{ color: '#787060' }}
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
                <h2 
                  className="font-semibold mb-3 flex items-center gap-2"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  <span>🏙️</span> Cities & Counties ({savedCityData.length})
                </h2>
                <div className="space-y-3">
                  {savedCityData.map((city) => (
                    <div
                      key={city.id}
                      className="rounded-xl p-4 flex items-center gap-4 transition-all duration-300 group"
                      style={{ 
                        backgroundColor: '#ffffff',
                        border: '1px solid #d8d6cd',
                        boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
                      }}
                    >
                      <Link href={`/city/${city.id}`} className="flex-1 flex items-center gap-4">
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
                        <div className="flex-1">
                          <div 
                            className="font-semibold transition-colors"
                            style={{ color: '#2b2823' }}
                          >
                            {city.name}
                          </div>
                          <div className="text-sm" style={{ color: '#787060' }}>{city.county}, {city.stateCode}</div>
                          <span 
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold mt-2"
                            style={{ backgroundColor: getVerdictStyle(city.marketScore).bg, color: getVerdictStyle(city.marketScore).color }}
                          >
                            {getVerdictStyle(city.marketScore).text}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeSavedCity(city.id)}
                        className="p-3 rounded-xl transition-all hover:opacity-70"
                        style={{ color: '#787060' }}
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
