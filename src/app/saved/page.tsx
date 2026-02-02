"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cityData, stateData } from "@/data/helpers";
import {
  SaveIcon,
  DocumentIcon,
  MapIcon,
  CalculatorIcon,
  RefreshIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  HeartIcon,
  CloudSyncIcon,
  HomeEquityIcon,
} from "@/components/Icons";
import AuthModal from "@/components/AuthModal";

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

// Type for analysis history (from calculator recent searches)
interface AnalysisHistory {
  address: string;
  annualRevenue: number;
  adr: number;
  occupancy: number;
  timestamp: number;
  bedrooms?: number;
  bathrooms?: number;
  guestCount?: number;
}

export default function SavedPage() {
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [savedStates, setSavedStates] = useState<string[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'markets' | 'history'>('reports');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const authEmail = localStorage.getItem("edge_auth_email");
    const authToken = localStorage.getItem("edge_auth_token");
    const authExpiry = localStorage.getItem("edge_auth_expiry");
    
    const hasValidSession = authEmail && authToken && authExpiry && 
      Date.now() < parseInt(authExpiry, 10);
    
    if (hasValidSession) {
      setIsAuthenticated(true);
      setUserEmail(authEmail);
    }
  }, []);

  // Load saved data
  const loadSavedData = useCallback(async () => {
    // Load local market data (cities/states) - these are not user-specific
    const cities = JSON.parse(localStorage.getItem("savedCities") || "[]");
    const states = JSON.parse(localStorage.getItem("savedStates") || "[]");
    
    // Load analysis history from calculator recent searches
    const recentSearches = JSON.parse(localStorage.getItem("edge_recent_searches") || "[]");
    const historyData: AnalysisHistory[] = recentSearches.map((s: { address: string; annualRevenue: number; adr: number; occupancy: number; timestamp: number; cachedBedrooms?: number; cachedBathrooms?: number; cachedGuestCount?: number }) => ({
      address: s.address,
      annualRevenue: s.annualRevenue,
      adr: s.adr,
      occupancy: s.occupancy,
      timestamp: s.timestamp,
      bedrooms: s.cachedBedrooms,
      bathrooms: s.cachedBathrooms,
      guestCount: s.cachedGuestCount,
    }));
    setAnalysisHistory(historyData);
    
    setSavedCities(cities);
    setSavedStates(states);
    
    // Only load property reports if authenticated (user-specific data)
    if (!isAuthenticated || !userEmail) {
      setSavedReports([]);
      return;
    }
    
    // Fetch from server when authenticated
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/saved-properties?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (data.success && data.properties) {
        // Use server data directly (user-specific)
        const serverReports = data.properties.map((p: { id: string; address: string; savedAt: number; notes?: string; result?: { annualRevenue?: number; cashOnCash?: number; monthlyNetCashFlow?: number; bedrooms?: number; bathrooms?: number; guestCount?: number } }) => ({
          id: p.id,
          address: p.address,
          city: p.address.split(',')[1]?.trim() || '',
          state: p.address.split(',')[2]?.trim() || '',
          bedrooms: p.result?.bedrooms || 0,
          bathrooms: p.result?.bathrooms || 0,
          guestCount: p.result?.guestCount || 0,
          annualRevenue: p.result?.annualRevenue || 0,
          cashFlow: p.result?.monthlyNetCashFlow || 0,
          cashOnCash: p.result?.cashOnCash || 0,
          purchasePrice: 0,
          notes: p.notes || '',
          savedAt: p.savedAt,
        }));
        
        setSavedReports(serverReports);
        setLastSyncTime(Date.now());
      } else {
        setSavedReports([]);
      }
    } catch (error) {
      console.error("Error fetching from server:", error);
      setSavedReports([]);
    }
    setIsSyncing(false);
  }, [isAuthenticated, userEmail]);

  useEffect(() => {
    loadSavedData();
  }, [loadSavedData]);

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

  const removeSavedReport = async (reportId: string) => {
    const updated = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updated);
    localStorage.setItem("savedReports", JSON.stringify(updated));
    
    // Sync with server if authenticated
    if (isAuthenticated && userEmail) {
      try {
        await fetch('/api/saved-properties', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, propertyId: reportId }),
        });
      } catch (error) {
        console.error("Error deleting from server:", error);
      }
    }
  };

  const updateReportNotes = async (reportId: string, notes: string) => {
    const updated = savedReports.map(r => 
      r.id === reportId ? { ...r, notes } : r
    );
    setSavedReports(updated);
    localStorage.setItem("savedReports", JSON.stringify(updated));
    setEditingNoteId(null);
    
    // Sync with server if authenticated
    if (isAuthenticated && userEmail) {
      try {
        await fetch('/api/saved-properties', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, propertyId: reportId, notes }),
        });
      } catch (error) {
        console.error("Error updating notes on server:", error);
      }
    }
  };

  const startEditingNote = (report: SavedReport) => {
    setEditingNoteId(report.id);
    setNoteText(report.notes || "");
  };

  const handleSignOut = () => {
    localStorage.removeItem("edge_auth_email");
    localStorage.removeItem("edge_auth_token");
    localStorage.removeItem("edge_auth_expiry");
    setIsAuthenticated(false);
    setUserEmail(null);
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
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}
              >
                <SaveIcon className="w-5 h-5" color="#16a34a" />
              </div>
              <h1 
                className="text-2xl font-bold"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Saved
              </h1>
            </div>
            
            {/* Auth Status */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium" style={{ color: '#2b2823' }}>{userEmail}</div>
                  <div className="text-xs flex items-center gap-1" style={{ color: '#787060' }}>
                    {isSyncing ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Synced across devices
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-gray-100"
                  style={{ color: '#787060', border: '1px solid #d8d6cd' }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In to Sync
              </button>
            )}
          </div>
          <p className="ml-13" style={{ color: '#787060' }}>
            {isAuthenticated 
              ? "Your saved reports sync across all your devices" 
              : "Your saved reports and bookmarked markets"}
          </p>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('reports')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'reports' 
                  ? 'shadow-sm' 
                  : 'hover:bg-gray-50'
              }`}
              style={activeTab === 'reports' 
                ? { backgroundColor: '#2b2823', color: '#ffffff' } 
                : { backgroundColor: '#ffffff', color: '#787060', border: '1px solid #d8d6cd' }
              }
            >
              <DocumentIcon className="w-4 h-4" color={activeTab === 'reports' ? '#ffffff' : '#787060'} />
              Property Reports ({savedReports.length})
            </button>
            <button
              onClick={() => setActiveTab('markets')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'markets' 
                  ? 'shadow-sm' 
                  : 'hover:bg-gray-50'
              }`}
              style={activeTab === 'markets' 
                ? { backgroundColor: '#2b2823', color: '#ffffff' } 
                : { backgroundColor: '#ffffff', color: '#787060', border: '1px solid #d8d6cd' }
              }
            >
              <HeartIcon className="w-4 h-4" color={activeTab === 'markets' ? '#ffffff' : '#787060'} />
              Markets ({savedCityData.length + savedStateData.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'history' 
                  ? 'shadow-sm' 
                  : 'hover:bg-gray-50'
              }`}
              style={activeTab === 'history' 
                ? { backgroundColor: '#2b2823', color: '#ffffff' } 
                : { backgroundColor: '#ffffff', color: '#787060', border: '1px solid #d8d6cd' }
              }
            >
              <svg className="w-4 h-4" fill="none" stroke={activeTab === 'history' ? '#ffffff' : '#787060'} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History ({analysisHistory.length})
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
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: '#f5f5f0', border: '1px solid #e5e3da' }}
                >
                  <DocumentIcon className="w-10 h-10" color="#787060" />
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#2b2823', color: '#ffffff', boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.3)' }}
                >
                  <CalculatorIcon className="w-5 h-5" color="#ffffff" />
                  Analyze a Property
                  <ArrowRightIcon className="w-4 h-4" color="#ffffff" />
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
                    
                    {/* Notes Section - Improved UI */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="#787060" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#787060' }}>Your Notes</span>
                      </div>
                      {editingNoteId === report.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add your personal notes about this property...

• What did you like about it?
• Any concerns or red flags?
• Next steps to take?"
                            className="w-full p-4 rounded-xl border-2 text-sm resize-none focus:outline-none focus:border-gray-400 transition-colors"
                            style={{ borderColor: '#d8d6cd', minHeight: '120px', backgroundColor: '#fafafa' }}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateReportNotes(report.id, noteText)}
                              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
                              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                            >
                              Save Note
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100"
                              style={{ backgroundColor: '#f5f5f0', color: '#787060' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => startEditingNote(report)}
                          className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-sm group"
                          style={{ backgroundColor: report.notes ? '#fffbeb' : '#f8f8f8', border: report.notes ? '1px solid #fcd34d' : '1px dashed #d8d6cd' }}
                        >
                          {report.notes ? (
                            <div className="flex items-start gap-2">
                              <span className="text-amber-500">📝</span>
                              <p className="text-sm whitespace-pre-wrap flex-1" style={{ color: '#2b2823' }}>{report.notes}</p>
                              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#787060' }}>Edit</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">📝</span>
                              <p className="text-sm" style={{ color: '#9a9488' }}>
                                Click to add your personal notes...
                              </p>
                              <span className="text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#787060' }}>+ Add Note</span>
                            </div>
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
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
              >
                <HeartIcon className="w-10 h-10" color="#f87171" />
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: '#2b2823', color: '#ffffff', boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.3)' }}
              >
                <MapIcon className="w-5 h-5" color="#ffffff" />
                Explore Markets
                <ArrowRightIcon className="w-4 h-4" color="#ffffff" />
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
                    <MapIcon className="w-5 h-5" color="#2b2823" />
                    States ({savedStateData.length})
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
                      <HomeEquityIcon className="w-5 h-5" color="#2b2823" />
                      Cities & Counties ({savedCityData.length})
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

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {analysisHistory.length === 0 ? (
              <div 
                className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
              >
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: '#f5f5f0', border: '1px solid #e5e3da' }}
                >
                  <svg className="w-10 h-10" fill="none" stroke="#787060" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 
                  className="text-xl font-semibold mb-2"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  No analysis history yet
                </h3>
                <p className="mb-6 max-w-sm mx-auto" style={{ color: '#787060' }}>
                  Your recent property analyses will appear here. Start by analyzing a property in the calculator.
                </p>
                <Link
                  href="/calculator"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#2b2823', color: '#ffffff', boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.3)' }}
                >
                  <CalculatorIcon className="w-5 h-5" color="#ffffff" />
                  Analyze a Property
                  <ArrowRightIcon className="w-4 h-4" color="#ffffff" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm mb-4" style={{ color: '#787060' }}>
                  Recent analyses from this device. Save a report to sync it across devices.
                </p>
                {analysisHistory.sort((a, b) => b.timestamp - a.timestamp).map((item, index) => (
                  <div
                    key={`${item.address}-${index}`}
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #d8d6cd',
                      boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
                    }}
                  >
                    <div 
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ backgroundColor: '#f0fdf4' }}
                    >
                      <span className="text-lg font-bold" style={{ color: '#16a34a' }}>
                        {formatCurrency(item.annualRevenue / 1000)}K
                      </span>
                      <span className="text-[10px]" style={{ color: '#787060' }}>/yr</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: '#2b2823' }}>
                        {item.address}
                      </div>
                      <div className="text-sm" style={{ color: '#787060' }}>
                        {item.bedrooms ? `${item.bedrooms}BR` : ''}{item.bathrooms ? `/${item.bathrooms}BA` : ''}
                        {item.guestCount ? ` • Sleeps ${item.guestCount}` : ''}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm">
                        <span style={{ color: '#787060' }}>${item.adr?.toFixed(0) || '—'} ADR</span>
                        <span style={{ color: '#787060' }}>{(item.occupancy * 100)?.toFixed(0) || '—'}% Occ</span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: '#9a9488' }}>
                        Analyzed {formatDate(item.timestamp)}
                      </div>
                    </div>
                    
                    <Link
                      href={`/calculator?address=${encodeURIComponent(item.address)}${item.bedrooms ? `&bedrooms=${item.bedrooms}` : ''}${item.bathrooms ? `&bathrooms=${item.bathrooms}` : ''}${item.guestCount ? `&guests=${item.guestCount}` : ''}`}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                    >
                      Re-analyze
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(email) => {
          setIsAuthenticated(true);
          setUserEmail(email);
          localStorage.setItem("edge_auth_email", email);
          setShowAuthModal(false);
          loadSavedData();
        }}
        title="Sign in to Sync"
        subtitle="Sign in to sync your saved reports across all your devices. No password needed."
      />
    </div>
  );
}
