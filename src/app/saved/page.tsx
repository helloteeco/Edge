"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cityData, stateData } from "@/data/helpers";

// Type for saved property reports
interface SavedReport {
  id: string;
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  guestCount: number;
  annualRevenue: number;
  cashFlow: number;
  cashOnCash: number;
  purchasePrice: number;
  notes: string;
  savedAt: number;
}

export default function SavedPage() {
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [savedStates, setSavedStates] = useState<string[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'markets'>('reports');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    const cities = JSON.parse(localStorage.getItem("savedCities") || "[]");
    const states = JSON.parse(localStorage.getItem("savedStates") || "[]");
    const reports = JSON.parse(localStorage.getItem("savedReports") || "[]");
    setSavedCities(cities);
    setSavedStates(states);
    setSavedReports(reports);
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

  const removeSavedReport = (reportId: string) => {
    const updated = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updated);
    localStorage.setItem("savedReports", JSON.stringify(updated));
  };

  const updateReportNotes = (reportId: string, notes: string) => {
    const updated = savedReports.map(r => 
      r.id === reportId ? { ...r, notes } : r
    );
    setSavedReports(updated);
    localStorage.setItem("savedReports", JSON.stringify(updated));
    setEditingNoteId(null);
  };

  const startEditingNote = (report: SavedReport) => {
    setEditingNoteId(report.id);
    setNoteText(report.notes || "");
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isMarketsEmpty = savedCityData.length === 0 && savedStateData.length === 0;
  const isReportsEmpty = savedReports.length === 0;

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
              <span className="text-xl">💾</span>
            </div>
            <h1 
              className="text-2xl font-bold"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Saved
            </h1>
          </div>
          <p className="ml-13" style={{ color: '#787060' }}>Your saved reports and bookmarked markets</p>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'reports' ? 'bg-[#2b2823] text-white' : 'bg-white text-[#787060] hover:bg-gray-100'
              }`}
            >
              📊 Property Reports ({savedReports.length})
            </button>
            <button
              onClick={() => setActiveTab('markets')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'markets' ? 'bg-[#2b2823] text-white' : 'bg-white text-[#787060] hover:bg-gray-100'
              }`}
            >
              ❤️ Markets ({savedCityData.length + savedStateData.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Property Reports Tab */}
        {activeTab === 'reports' && (
          <>
            {isReportsEmpty ? (
              <div 
                className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
              >
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: '#e5e3da' }}
                >
                  <span className="text-4xl">📊</span>
                </div>
                <h3 
                  className="text-xl font-semibold mb-2"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  No saved reports yet
                </h3>
                <p className="mb-6 max-w-sm mx-auto" style={{ color: '#787060' }}>
                  Analyze a property in the calculator and click &quot;Save Report&quot; to save it here with your notes.
                </p>
                <Link
                  href="/calculator"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Analyze a Property
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {savedReports.sort((a, b) => b.savedAt - a.savedAt).map((report) => (
                  <div
                    key={report.id}
                    className="rounded-xl overflow-hidden"
                    style={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #d8d6cd',
                      boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
                    }}
                  >
                    {/* Report Header */}
                    <div className="p-4 flex items-start gap-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                        style={{ backgroundColor: report.cashOnCash >= 8 ? '#dcfce7' : report.cashOnCash >= 5 ? '#fef3c7' : '#fee2e2' }}
                      >
                        <span 
                          className="text-lg font-bold"
                          style={{ color: report.cashOnCash >= 8 ? '#16a34a' : report.cashOnCash >= 5 ? '#ca8a04' : '#dc2626' }}
                        >
                          {report.cashOnCash.toFixed(1)}%
                        </span>
                        <span className="text-[10px]" style={{ color: '#787060' }}>CoC</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate" style={{ color: '#2b2823' }}>
                          {report.address}
                        </div>
                        <div className="text-sm" style={{ color: '#787060' }}>
                          {report.city}, {report.state} • {report.bedrooms}BR/{report.bathrooms}BA • Sleeps {report.guestCount}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          <span style={{ color: '#16a34a' }}>{formatCurrency(report.annualRevenue)}/yr</span>
                          <span style={{ color: report.cashFlow >= 0 ? '#16a34a' : '#dc2626' }}>
                            {formatCurrency(report.cashFlow)} cash flow
                          </span>
                          <span style={{ color: '#787060' }}>{formatCurrency(report.purchasePrice)} purchase</span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#9a9488' }}>
                          Saved {formatDate(report.savedAt)}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/calculator?address=${encodeURIComponent(report.address)}&bedrooms=${report.bedrooms}&bathrooms=${report.bathrooms}&guests=${report.guestCount}`}
                          className="p-2 rounded-lg transition-all hover:bg-gray-100"
                          style={{ color: '#787060' }}
                          title="Re-analyze"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => removeSavedReport(report.id)}
                          className="p-2 rounded-lg transition-all hover:bg-gray-100"
                          style={{ color: '#787060' }}
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Notes Section */}
                    <div className="px-4 pb-4">
                      {editingNoteId === report.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add your notes about this property..."
                            className="w-full p-3 rounded-lg border text-sm resize-none"
                            style={{ borderColor: '#d8d6cd', minHeight: '80px' }}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateReportNotes(report.id, noteText)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium"
                              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                            >
                              Save Note
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium"
                              style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => startEditingNote(report)}
                          className="p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                          style={{ backgroundColor: '#f8f8f8', border: '1px dashed #d8d6cd' }}
                        >
                          {report.notes ? (
                            <p className="text-sm whitespace-pre-wrap" style={{ color: '#2b2823' }}>{report.notes}</p>
                          ) : (
                            <p className="text-sm italic" style={{ color: '#9a9488' }}>
                              📝 Click to add notes about this property...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Markets Tab */}
        {activeTab === 'markets' && (
          <>
            {isMarketsEmpty ? (
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
          </>
        )}
      </div>
    </div>
  );
}
