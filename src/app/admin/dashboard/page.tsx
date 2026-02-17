"use client";

import { useState, useEffect, useCallback } from "react";

interface DashboardData {
  users: { count: number; data: Array<{ email: string; created_at: string; last_login_at: string; credits_used?: number; credits_limit?: number; is_unlimited?: boolean }> };
  quizLeads: { count: number; data: Array<{ id: number; email: string; quiz_answers: Record<string, string>; recommended_methods: string[]; created_at: string }> };
  coachingLeads: { count: number; data: Array<{ id: number; email: string; budget: string; timeline: string; experience: string; qualified: boolean; source: string; created_at: string }> };
  savedProperties: { count: number };
  cachedResults: { count: number };
  analysisLog: { count: number; data: Array<{ id: number; address: string; city: string; state: string; bedrooms: number; annual_revenue?: number; adr?: number; occupancy?: number; revenue_source?: string; data_provider?: string; user_email?: string; was_saved?: boolean; was_shared?: boolean; is_instant?: boolean; analysis_type?: string; created_at: string }> };
  marketData: { count: number };
  analytics?: {
    revenue: {
      totalRevenue: number;
      totalCreditsPurchased: number;
      totalCreditsUsed: number;
      totalCreditsRemaining: number;
      purchaseCount: number;
      avgRevenuePerPurchaser: number;
      recentPurchases: Array<{ user_email: string; credits_added: number; amount_paid: number; purchased_at: string }>;
    };
    conversion: {
      totalUsers: number;
      usersWhoAnalyzed: number;
      usersWhoPurchased: number;
      usersWhoSaved: number;
      usersWhoShared: number;
      unlimitedUsers: number;
      freeToAnalysisRate: number;
      analysisToPurchaseRate: number;
      overallConversionRate: number;
    };
    dataSource: {
      priceLabsAnalyses: number;
      airbnbAnalyses: number;
      cachedAnalyses: number;
      totalAnalyses: number;
      priceLabsPercent: number;
      cacheHitRate: number;
      estimatedPriceLabsCost: number;
      estimatedTotalAPICost: number;
      costSavedByCache: number;
    };
    popularMarkets: Array<{ count: number; city: string; state: string }>;
    bedroomBreakdown: Array<{ bedrooms: number; count: number }>;
    dailyActivity: Array<{ date: string; analyses: number; signups: number }>;
    engagement: {
      avgAnalysesPerUser: number;
      saveRate: number;
      shareRate: number;
    };
    cacheHealth: {
      propertyCacheCount: number;
      marketDataCount: number;
      airbnbCompCacheCount: number;
      priceLabsMarkets: number;
      airbnbMarkets: number;
      expiredCache: number;
      totalSharedLinks: number;
    };
    fundingQuiz: {
      count: number;
      data: Array<{ email: string; investment_budget: string; credit_score: string; experience: string; timeline: string; created_at: string }>;
    };
    billingCycle?: {
      cycleStart: string;
      daysSinceCycleStart: number;
      daysRemaining: number;
      totalAnalyses: number;
      priceLabsCalls: number;
      airbnbCalls: number;
      cachedCalls: number;
      freePreviewCount: number;
      paidAnalyses: number;
      refunds: number;
      priceLabsBaseFee: number;
      priceLabsIncludedSearches: number;
      priceLabsOverageRate: number;
      searchesUsed: number;
      searchesRemaining: number;
      overageSearches: number;
      overageCost: number;
      currentBill: number;
      projectedMonthlySearches: number;
      projectedBill: number;
      cycleRevenue: number;
      cycleProfitLoss: number;
      dailyBreakdown: Array<{ date: string; pricelabs: number; airbnb: number; cached: number; freePreview: number; paid: number }>;
    };
  };
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const fetchData = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/dashboard?password=${encodeURIComponent(pw)}`);
      if (!res.ok) {
        if (res.status === 401) { setError("Incorrect password"); setAuthenticated(false); return; }
        throw new Error("Failed to fetch");
      }
      const json = await res.json();
      setData(json);
      setAuthenticated(true);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => { if (!password) return; fetchData(password); };

  useEffect(() => {
    if (!authenticated || !password) return;
    const interval = setInterval(() => fetchData(password), 30000);
    return () => clearInterval(interval);
  }, [authenticated, password, fetchData]);

  const fmt = (d: string) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const fmtShort = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e3da' }}>
        <div className="w-full max-w-sm p-8 rounded-2xl" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 4px 20px rgba(43, 40, 35, 0.1)' }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#2b2823' }}>
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Edge Admin</h1>
            <p className="text-sm mt-1" style={{ color: '#787060' }}>Enter password to access dashboard</p>
          </div>
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Password" className="w-full px-4 py-3 rounded-xl mb-3 focus:outline-none focus:ring-2" style={{ backgroundColor: '#f5f5f0', border: error ? '2px solid #ef4444' : '1px solid #d8d6cd', color: '#2b2823' }} />
          {error && <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{error}</p>}
          <button onClick={handleLogin} disabled={loading} className="w-full py-3 rounded-xl font-semibold transition-colors" style={{ backgroundColor: loading ? '#9a9488' : '#2b2823', color: '#ffffff' }}>{loading ? 'Loading...' : 'Access Dashboard'}</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const a = data.analytics;

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "conversion", label: "Conversion", icon: "🎯" },
    { id: "costs", label: "Costs & Data", icon: "💰" },
    { id: "markets", label: "Markets", icon: "🗺️" },
    { id: "users", label: `Users (${data.users.count})`, icon: "👥" },
    { id: "analyses", label: `Analyses (${data.analysisLog.count})`, icon: "🔍" },
    { id: "leads", label: "Leads", icon: "🎓" },
    { id: "cache", label: "Cache Health", icon: "💾" },
    { id: "billing", label: "Billing Cycle", icon: "📋" },
  ];

  // Mini bar chart component
  const MiniBar = ({ data: barData, maxVal, color }: { data: number[]; maxVal: number; color: string }) => (
    <div className="flex items-end gap-[2px] h-12">
      {barData.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm" style={{ backgroundColor: v > 0 ? color : '#e5e3da', height: maxVal > 0 ? `${Math.max((v / maxVal) * 100, 4)}%` : '4%', minWidth: '3px' }} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}><span className="text-xl">⚡</span></div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#fff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Edge Admin Dashboard</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Business analytics &amp; performance tracking</p>
              </div>
            </div>
            <button onClick={() => fetchData(password)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>↻ Refresh</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Top KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: "Users", value: data.users.count, icon: "👥", color: "#2b2823" },
            { label: "Analyses", value: data.analysisLog.count, icon: "📊", color: "#9333ea" },
            { label: "Revenue", value: `$${(a?.revenue.totalRevenue || 0).toFixed(0)}`, icon: "💵", color: "#16a34a" },
            { label: "Purchases", value: a?.revenue.purchaseCount || 0, icon: "🛒", color: "#2563eb" },
            { label: "Conversion", value: `${a?.conversion.overallConversionRate || 0}%`, icon: "🎯", color: "#d97706" },
            { label: "Cache Hit", value: `${a?.dataSource.cacheHitRate || 0}%`, icon: "⚡", color: "#0891b2" },
            { label: "API Cost", value: `$${(a?.dataSource.estimatedTotalAPICost || 0).toFixed(2)}`, icon: "💰", color: "#dc2626" },
            { label: "Leads", value: (data.coachingLeads.count + data.quizLeads.count + (a?.fundingQuiz.count || 0)), icon: "🎓", color: "#7c3aed" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl p-3" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{kpi.icon}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#787060' }}>{kpi.label}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors" style={{ backgroundColor: activeTab === tab.id ? '#2b2823' : '#fff', color: activeTab === tab.id ? '#fff' : '#2b2823', border: activeTab === tab.id ? 'none' : '1px solid #d8d6cd' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && a && (
          <div className="space-y-6">
            {/* 30-Day Activity Chart */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-1" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>30-Day Activity</h3>
              <div className="flex gap-4 text-xs mb-3" style={{ color: '#787060' }}>
                <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#9333ea' }} /> Analyses</span>
                <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#2563eb' }} /> Signups</span>
              </div>
              <div className="flex items-end gap-[2px] h-24">
                {a.dailyActivity.map((d, i) => {
                  const maxA = Math.max(...a.dailyActivity.map(x => x.analyses), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-stretch gap-[1px]" title={`${fmtShort(d.date)}: ${d.analyses} analyses, ${d.signups} signups`}>
                      <div className="rounded-t-sm" style={{ backgroundColor: d.analyses > 0 ? '#9333ea' : '#f0ede8', height: `${Math.max((d.analyses / maxA) * 80, 2)}px` }} />
                      <div className="rounded-b-sm" style={{ backgroundColor: d.signups > 0 ? '#2563eb' : '#f0ede8', height: `${Math.max(d.signups * 15, 2)}px` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px]" style={{ color: '#9a9488' }}>
                <span>{fmtShort(a.dailyActivity[0]?.date)}</span>
                <span>{fmtShort(a.dailyActivity[14]?.date)}</span>
                <span>Today</span>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Conversion Funnel Mini */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Conversion Funnel</h3>
                {[
                  { label: "Signed Up", value: a.conversion.totalUsers, pct: 100 },
                  { label: "Ran Analysis", value: a.conversion.usersWhoAnalyzed, pct: a.conversion.freeToAnalysisRate },
                  { label: "Purchased Credits", value: a.conversion.usersWhoPurchased, pct: a.conversion.overallConversionRate },
                  { label: "Saved Property", value: a.conversion.usersWhoSaved, pct: a.conversion.totalUsers > 0 ? Math.round((a.conversion.usersWhoSaved / a.conversion.totalUsers) * 100) : 0 },
                ].map((step, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#2b2823' }}>{step.label}</span>
                      <span style={{ color: '#787060' }}>{step.value} ({step.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ backgroundColor: '#f0ede8' }}>
                      <div className="h-2 rounded-full" style={{ backgroundColor: '#2b2823', width: `${Math.max(step.pct, 2)}%`, opacity: 1 - i * 0.15 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Source Pie */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Data Sources</h3>
                <div className="space-y-3">
                  {[
                    { label: "PriceLabs", count: a.dataSource.priceLabsAnalyses, color: "#2563eb", pct: a.dataSource.priceLabsPercent },
                    { label: "Airbnb Direct", count: a.dataSource.airbnbAnalyses, color: "#f59e0b", pct: a.dataSource.totalAnalyses > 0 ? Math.round((a.dataSource.airbnbAnalyses / a.dataSource.totalAnalyses) * 100) : 0 },
                    { label: "Cached (instant)", count: a.dataSource.cachedAnalyses, color: "#22c55e", pct: a.dataSource.cacheHitRate },
                  ].map((src) => (
                    <div key={src.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: '#2b2823' }}>{src.label}</span>
                        <span style={{ color: '#787060' }}>{src.count} ({src.pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: '#f0ede8' }}>
                        <div className="h-2 rounded-full" style={{ backgroundColor: src.color, width: `${Math.max(src.pct, 2)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t" style={{ borderColor: '#e5e3da' }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#787060' }}>Est. API Cost</span>
                    <span className="font-semibold" style={{ color: '#dc2626' }}>${a.dataSource.estimatedTotalAPICost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span style={{ color: '#787060' }}>Saved by Cache</span>
                    <span className="font-semibold" style={{ color: '#22c55e' }}>${a.dataSource.costSavedByCache.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Top Markets Mini */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Top Markets</h3>
                {a.popularMarkets.length === 0 ? (
                  <p className="text-sm" style={{ color: '#787060' }}>No market data yet</p>
                ) : (
                  <div className="space-y-2">
                    {a.popularMarkets.slice(0, 7).map((m, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-5 text-center" style={{ color: '#9a9488' }}>{i + 1}</span>
                          <span className="text-sm" style={{ color: '#2b2823' }}>{m.city}, {m.state}</span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0ede8', color: '#2b2823' }}>{m.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Analyses */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Recent Analyses</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f0' }}>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Address</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Market</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>BR</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Revenue</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Source</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>User</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                    {data.analysisLog.data.slice(0, 15).map((log) => (
                      <tr key={log.id}>
                        <td className="p-3 font-medium max-w-[200px] truncate" style={{ color: '#2b2823' }}>{log.address || "—"}</td>
                        <td className="p-3" style={{ color: '#2b2823' }}>{log.city}, {log.state}</td>
                        <td className="p-3" style={{ color: '#787060' }}>{log.bedrooms}</td>
                        <td className="p-3 font-medium" style={{ color: '#16a34a' }}>{log.annual_revenue ? `$${(log.annual_revenue / 1000).toFixed(0)}k` : "—"}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                            backgroundColor: (log.data_provider === 'pricelabs' || log.revenue_source === 'pricelabs') ? '#dbeafe' : log.is_instant ? '#dcfce7' : '#fef3c7',
                            color: (log.data_provider === 'pricelabs' || log.revenue_source === 'pricelabs') ? '#1e40af' : log.is_instant ? '#166534' : '#92400e'
                          }}>
                            {log.is_instant ? 'cached' : (log.data_provider || log.revenue_source || 'unknown')}
                          </span>
                        </td>
                        <td className="p-3 max-w-[150px] truncate" style={{ color: '#787060' }}>{log.user_email || "anon"}</td>
                        <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== CONVERSION TAB ===== */}
        {activeTab === "conversion" && a && (
          <div className="space-y-6">
            {/* Funnel Visualization */}
            <div className="rounded-xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>User Conversion Funnel</h3>
              <div className="space-y-4">
                {[
                  { label: "Total Users (Signed Up)", value: a.conversion.totalUsers, pct: 100, color: "#2b2823", desc: "All registered accounts" },
                  { label: "Ran at Least 1 Analysis", value: a.conversion.usersWhoAnalyzed, pct: a.conversion.freeToAnalysisRate, color: "#9333ea", desc: `${a.conversion.freeToAnalysisRate}% activation rate` },
                  { label: "Purchased Credits", value: a.conversion.usersWhoPurchased, pct: a.conversion.overallConversionRate, color: "#16a34a", desc: `${a.conversion.analysisToPurchaseRate}% of analyzers converted` },
                  { label: "Saved a Property", value: a.conversion.usersWhoSaved, pct: a.conversion.totalUsers > 0 ? Math.round((a.conversion.usersWhoSaved / a.conversion.totalUsers) * 100) : 0, color: "#dc2626", desc: `${a.engagement.saveRate}% save rate among analyzers` },
                  { label: "Shared an Analysis", value: a.conversion.usersWhoShared, pct: a.conversion.totalUsers > 0 ? Math.round((a.conversion.usersWhoShared / a.conversion.totalUsers) * 100) : 0, color: "#2563eb", desc: `${a.engagement.shareRate}% share rate among analyzers` },
                ].map((step, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#2b2823' }}>{step.label}</span>
                        <span className="text-xs ml-2" style={{ color: '#787060' }}>{step.desc}</span>
                      </div>
                      <span className="text-lg font-bold" style={{ color: step.color }}>{step.value}</span>
                    </div>
                    <div className="h-6 rounded-lg overflow-hidden" style={{ backgroundColor: '#f0ede8' }}>
                      <div className="h-6 rounded-lg flex items-center pl-2 transition-all" style={{ backgroundColor: step.color, width: `${Math.max(step.pct, 3)}%`, opacity: 0.85 }}>
                        {step.pct > 10 && <span className="text-xs font-semibold text-white">{step.pct}%</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Avg Analyses per User", value: a.engagement.avgAnalysesPerUser.toFixed(1), desc: "Among users who analyzed", icon: "📊" },
                { label: "Avg Revenue per Purchaser", value: `$${a.revenue.avgRevenuePerPurchaser.toFixed(2)}`, desc: "Average credit purchase value", icon: "💵" },
                { label: "Unlimited Users", value: a.conversion.unlimitedUsers, desc: "Users with unlimited credits", icon: "♾️" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                  <span className="text-2xl">{m.icon}</span>
                  <div className="text-2xl font-bold mt-2" style={{ color: '#2b2823' }}>{m.value}</div>
                  <div className="text-sm font-medium" style={{ color: '#2b2823' }}>{m.label}</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Recent Purchases */}
            {a.revenue.recentPurchases.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                  <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Recent Credit Purchases</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f0' }}>
                        <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>User</th>
                        <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Credits</th>
                        <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Amount</th>
                        <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                      {a.revenue.recentPurchases.map((p, i) => (
                        <tr key={i}>
                          <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{p.user_email}</td>
                          <td className="p-3" style={{ color: '#9333ea' }}>+{p.credits_added}</td>
                          <td className="p-3 font-medium" style={{ color: '#16a34a' }}>${(p.amount_paid / 100).toFixed(2)}</td>
                          <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(p.purchased_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== COSTS & DATA TAB ===== */}
        {activeTab === "costs" && a && (
          <div className="space-y-6">
            {/* Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total API Cost", value: `$${a.dataSource.estimatedTotalAPICost.toFixed(2)}`, desc: `${a.dataSource.priceLabsAnalyses} PriceLabs calls × $0.50`, color: "#dc2626", icon: "💸" },
                { label: "Saved by Cache", value: `$${a.dataSource.costSavedByCache.toFixed(2)}`, desc: `${a.dataSource.cachedAnalyses} cached hits avoided API calls`, color: "#22c55e", icon: "💰" },
                { label: "Cache Hit Rate", value: `${a.dataSource.cacheHitRate}%`, desc: `${a.dataSource.cachedAnalyses} of ${a.dataSource.totalAnalyses} analyses served from cache`, color: "#0891b2", icon: "⚡" },
                { label: "Revenue Earned", value: `$${a.revenue.totalRevenue.toFixed(2)}`, desc: `${a.revenue.purchaseCount} purchases, ${a.revenue.totalCreditsPurchased} credits sold`, color: "#16a34a", icon: "📈" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                  <span className="text-2xl">{c.icon}</span>
                  <div className="text-2xl font-bold mt-2" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-sm font-medium" style={{ color: '#2b2823' }}>{c.label}</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>{c.desc}</div>
                </div>
              ))}
            </div>

            {/* Profit/Loss */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Profit / Loss Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: '#787060' }}>Revenue</div>
                  <div className="text-xl font-bold" style={{ color: '#16a34a' }}>+${a.revenue.totalRevenue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: '#787060' }}>API Costs</div>
                  <div className="text-xl font-bold" style={{ color: '#dc2626' }}>-${a.dataSource.estimatedTotalAPICost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: '#787060' }}>Net (excl. hosting)</div>
                  <div className="text-xl font-bold" style={{ color: (a.revenue.totalRevenue - a.dataSource.estimatedTotalAPICost) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {(a.revenue.totalRevenue - a.dataSource.estimatedTotalAPICost) >= 0 ? '+' : ''}${(a.revenue.totalRevenue - a.dataSource.estimatedTotalAPICost).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Source Breakdown */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Data Source Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "PriceLabs (licensed)", count: a.dataSource.priceLabsAnalyses, pct: a.dataSource.priceLabsPercent, color: "#2563eb", cost: `$${(a.dataSource.priceLabsAnalyses * 0.50).toFixed(2)}` },
                  { label: "Airbnb Direct (free)", count: a.dataSource.airbnbAnalyses, pct: a.dataSource.totalAnalyses > 0 ? Math.round((a.dataSource.airbnbAnalyses / a.dataSource.totalAnalyses) * 100) : 0, color: "#f59e0b", cost: "$0.00" },
                  { label: "Cached (instant, free)", count: a.dataSource.cachedAnalyses, pct: a.dataSource.cacheHitRate, color: "#22c55e", cost: "$0.00" },
                ].map((src) => (
                  <div key={src.label} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: src.color }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#2b2823' }}>{src.label}</span>
                        <span style={{ color: '#787060' }}>{src.count} ({src.pct}%) — {src.cost}</span>
                      </div>
                      <div className="h-2 rounded-full mt-1" style={{ backgroundColor: '#f0ede8' }}>
                        <div className="h-2 rounded-full" style={{ backgroundColor: src.color, width: `${Math.max(src.pct, 2)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credits Overview */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Credits Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Sold", value: a.revenue.totalCreditsPurchased, color: "#9333ea" },
                  { label: "Total Used", value: a.revenue.totalCreditsUsed, color: "#dc2626" },
                  { label: "Remaining", value: a.revenue.totalCreditsRemaining, color: "#22c55e" },
                  { label: "Unlimited Users", value: a.conversion.unlimitedUsers, color: "#2563eb" },
                ].map((c) => (
                  <div key={c.label} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
                    <div className="text-xs" style={{ color: '#787060' }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== BILLING CYCLE TAB ===== */}
        {activeTab === "billing" && a && a.billingCycle && (() => {
          const b = a.billingCycle;
          const usagePct = Math.min(100, Math.round((b.searchesUsed / b.priceLabsIncludedSearches) * 100));
          const cycleStart = new Date(b.cycleStart);
          const cycleEnd = new Date(cycleStart);
          cycleEnd.setDate(cycleEnd.getDate() + 30);
          return (
          <div className="space-y-6">
            {/* Billing Period Header */}
            <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg" style={{ color: '#fff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>PriceLabs Billing Cycle</h3>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Day {b.daysSinceCycleStart} of 30</div>
                  <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{b.daysRemaining} days remaining</div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <div className="h-2 rounded-full" style={{ backgroundColor: b.daysSinceCycleStart > 25 ? '#f59e0b' : '#22c55e', width: `${Math.round((b.daysSinceCycleStart / 30) * 100)}%` }} />
              </div>
            </div>

            {/* Search Usage Meter */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>PriceLabs Search Usage</h3>
                <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: usagePct >= 90 ? '#fef2f2' : usagePct >= 70 ? '#fffbeb' : '#f0fdf4', color: usagePct >= 90 ? '#dc2626' : usagePct >= 70 ? '#d97706' : '#16a34a' }}>
                  {b.searchesUsed} / {b.priceLabsIncludedSearches}
                </span>
              </div>
              <div className="h-4 rounded-full mb-3" style={{ backgroundColor: '#f0ede8' }}>
                <div className="h-4 rounded-full transition-all" style={{ backgroundColor: usagePct >= 90 ? '#dc2626' : usagePct >= 70 ? '#f59e0b' : '#22c55e', width: `${Math.min(usagePct, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: '#787060' }}>
                <span>{b.searchesRemaining} searches remaining</span>
                <span>{usagePct}% used</span>
              </div>
              {b.overageSearches > 0 && (
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <span className="text-sm font-medium" style={{ color: '#dc2626' }}>⚠️ {b.overageSearches} overage searches — ${b.overageCost.toFixed(2)} extra this cycle</span>
                </div>
              )}
            </div>

            {/* Current Bill & Projections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Current Bill", value: `$${b.currentBill.toFixed(2)}`, desc: `Base $249 + $${b.overageCost.toFixed(2)} overage`, color: "#dc2626", icon: "💸" },
                { label: "Projected Bill", value: `$${b.projectedBill.toFixed(2)}`, desc: `~${b.projectedMonthlySearches} searches at current pace`, color: "#f59e0b", icon: "📈" },
                { label: "Cycle Revenue", value: `$${b.cycleRevenue.toFixed(2)}`, desc: `From credit pack purchases`, color: "#16a34a", icon: "💵" },
                { label: "Cycle P/L", value: `${b.cycleProfitLoss >= 0 ? '+' : ''}$${b.cycleProfitLoss.toFixed(2)}`, desc: `Revenue minus PriceLabs bill`, color: b.cycleProfitLoss >= 0 ? "#16a34a" : "#dc2626", icon: b.cycleProfitLoss >= 0 ? "✅" : "⚠️" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                  <span className="text-2xl">{c.icon}</span>
                  <div className="text-2xl font-bold mt-2" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-sm font-medium" style={{ color: '#2b2823' }}>{c.label}</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>{c.desc}</div>
                </div>
              ))}
            </div>

            {/* Usage Breakdown */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>This Cycle Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Analyses", value: b.totalAnalyses, color: "#2b2823" },
                  { label: "PriceLabs Calls", value: b.priceLabsCalls, color: "#2563eb" },
                  { label: "Free Previews", value: b.freePreviewCount, color: "#f59e0b" },
                  { label: "Paid Analyses", value: b.paidAnalyses, color: "#16a34a" },
                  { label: "Airbnb Calls", value: b.airbnbCalls, color: "#ec4899" },
                  { label: "Cache Hits", value: b.cachedCalls, color: "#0891b2" },
                  { label: "Refunds", value: b.refunds, color: "#dc2626" },
                  { label: "Net Billable", value: Math.max(0, b.priceLabsCalls - b.cachedCalls), color: "#9333ea" },
                ].map((m) => (
                  <div key={m.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: '#faf9f7' }}>
                    <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-xs mt-1" style={{ color: '#787060' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Activity */}
            {b.dailyBreakdown && b.dailyBreakdown.length > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <h3 className="font-semibold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Daily Usage This Cycle</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e3da' }}>
                        <th className="text-left py-2 px-2" style={{ color: '#787060' }}>Date</th>
                        <th className="text-center py-2 px-2" style={{ color: '#2563eb' }}>PriceLabs</th>
                        <th className="text-center py-2 px-2" style={{ color: '#ec4899' }}>Airbnb</th>
                        <th className="text-center py-2 px-2" style={{ color: '#0891b2' }}>Cached</th>
                        <th className="text-center py-2 px-2" style={{ color: '#f59e0b' }}>Free</th>
                        <th className="text-center py-2 px-2" style={{ color: '#16a34a' }}>Paid</th>
                        <th className="text-center py-2 px-2" style={{ color: '#dc2626' }}>Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.dailyBreakdown.map((day: { date: string; pricelabs: number; airbnb: number; cached: number; freePreview: number; paid: number }) => (
                        <tr key={day.date} style={{ borderBottom: '1px solid #f0ede8' }}>
                          <td className="py-2 px-2 font-medium" style={{ color: '#2b2823' }}>{new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                          <td className="text-center py-2 px-2" style={{ color: '#2563eb' }}>{day.pricelabs}</td>
                          <td className="text-center py-2 px-2" style={{ color: '#ec4899' }}>{day.airbnb}</td>
                          <td className="text-center py-2 px-2" style={{ color: '#0891b2' }}>{day.cached}</td>
                          <td className="text-center py-2 px-2" style={{ color: '#f59e0b' }}>{day.freePreview}</td>
                          <td className="text-center py-2 px-2" style={{ color: '#16a34a' }}>{day.paid}</td>
                          <td className="text-center py-2 px-2 font-medium" style={{ color: '#dc2626' }}>${(day.pricelabs * 0.50).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #2b2823' }}>
                        <td className="py-2 px-2 font-bold" style={{ color: '#2b2823' }}>Total</td>
                        <td className="text-center py-2 px-2 font-bold" style={{ color: '#2563eb' }}>{b.priceLabsCalls}</td>
                        <td className="text-center py-2 px-2 font-bold" style={{ color: '#ec4899' }}>{b.airbnbCalls}</td>
                        <td className="text-center py-2 px-2 font-bold" style={{ color: '#0891b2' }}>{b.cachedCalls}</td>
                        <td className="text-center py-2 px-2 font-bold" style={{ color: '#f59e0b' }}>{b.freePreviewCount}</td>
                        <td className="text-center py-2 px-2 font-bold" style={{ color: '#16a34a' }}>{b.paidAnalyses}</td>
                        <td className="text-center py-2 px-2 font-bold" style={{ color: '#dc2626' }}>${(b.priceLabsCalls * 0.50).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Cost Alert Thresholds */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Cost Thresholds</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Included searches (no overage)", threshold: 500, current: b.searchesUsed, status: b.searchesUsed <= 500 },
                  { label: "Break-even (revenue covers bill)", threshold: `$${b.currentBill.toFixed(0)}`, current: `$${b.cycleRevenue.toFixed(0)}`, status: b.cycleRevenue >= b.currentBill },
                  { label: "Free preview daily cap", threshold: "75/day", current: `${b.freePreviewCount} total`, status: true },
                ].map((t) => (
                  <div key={t.label} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: t.status ? '#f0fdf4' : '#fef2f2' }}>
                    <span style={{ color: '#2b2823' }}>{t.label}</span>
                    <span className="font-medium" style={{ color: t.status ? '#16a34a' : '#dc2626' }}>{t.status ? '✅' : '⚠️'} {String(t.current)} / {String(t.threshold)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          );
        })()}

        {/* ===== MARKETS TAB ===== */}
        {activeTab === "markets" && a && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Popular Markets */}
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                  <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Most Searched Markets</h3>
                </div>
                <div className="p-4 space-y-2">
                  {a.popularMarkets.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: '#787060' }}>No market data yet</p>
                  ) : a.popularMarkets.map((m, i) => {
                    const maxCount = a.popularMarkets[0]?.count || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-bold w-6 text-right" style={{ color: i < 3 ? '#2b2823' : '#9a9488' }}>{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium" style={{ color: '#2b2823' }}>{m.city}, {m.state}</span>
                            <span style={{ color: '#787060' }}>{m.count} searches</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: '#f0ede8' }}>
                            <div className="h-1.5 rounded-full" style={{ backgroundColor: i < 3 ? '#2b2823' : '#9a9488', width: `${(m.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bedroom Breakdown */}
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                  <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Bedroom Preferences</h3>
                </div>
                <div className="p-4 space-y-3">
                  {a.bedroomBreakdown.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: '#787060' }}>No data yet</p>
                  ) : a.bedroomBreakdown.map((b) => {
                    const maxBr = a.bedroomBreakdown[0]?.count || 1;
                    return (
                      <div key={b.bedrooms} className="flex items-center gap-3">
                        <span className="text-sm font-bold w-12" style={{ color: '#2b2823' }}>{b.bedrooms} BR</span>
                        <div className="flex-1">
                          <div className="h-6 rounded-lg overflow-hidden" style={{ backgroundColor: '#f0ede8' }}>
                            <div className="h-6 rounded-lg flex items-center pl-2" style={{ backgroundColor: '#9333ea', width: `${(b.count / maxBr) * 100}%`, opacity: 0.8 }}>
                              <span className="text-xs font-semibold text-white">{b.count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === "users" && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e3da' }}>
              <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>All Users</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: '#787060' }}>{data.users.count} total</span>
                <button onClick={() => downloadCSV(`edge-users-${new Date().toISOString().slice(0,10)}.csv`, ["Email", "Credits Used", "Credits Limit", "Unlimited", "Signed Up", "Last Login"], data.users.data.map(u => [u.email, String(u.credits_used ?? 0), String(u.credits_limit ?? 3), u.is_unlimited ? "Yes" : "No", fmt(u.created_at), fmt(u.last_login_at)]))} className="px-3 py-1 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: '#2b2823', color: '#fff' }}>⬇ CSV</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f0' }}>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Email</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Credits Used</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Credits Limit</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Unlimited</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Signed Up</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                  {data.users.data.map((user, i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{user.email}</td>
                      <td className="p-3" style={{ color: '#9333ea' }}>{user.credits_used ?? 0}</td>
                      <td className="p-3" style={{ color: '#787060' }}>{user.credits_limit ?? 3}</td>
                      <td className="p-3">
                        {user.is_unlimited ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>Yes</span>
                        ) : (
                          <span className="text-xs" style={{ color: '#9a9488' }}>No</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(user.created_at)}</td>
                      <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(user.last_login_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ANALYSES TAB ===== */}
        {activeTab === "analyses" && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e3da' }}>
              <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>All Calculator Analyses</h3>
              <span className="text-sm" style={{ color: '#787060' }}>{data.analysisLog.count} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f0' }}>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Address</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Market</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>BR</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Revenue</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>ADR</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Occ%</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Source</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Type</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>User</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Saved</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Shared</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                  {data.analysisLog.data.map((log) => (
                    <tr key={log.id}>
                      <td className="p-3 font-medium max-w-[180px] truncate" style={{ color: '#2b2823' }}>{log.address || "—"}</td>
                      <td className="p-3 whitespace-nowrap" style={{ color: '#2b2823' }}>{log.city}, {log.state}</td>
                      <td className="p-3" style={{ color: '#787060' }}>{log.bedrooms}</td>
                      <td className="p-3 font-medium" style={{ color: '#16a34a' }}>{log.annual_revenue ? `$${(log.annual_revenue / 1000).toFixed(0)}k` : "—"}</td>
                      <td className="p-3" style={{ color: '#787060' }}>{log.adr ? `$${log.adr}` : "—"}</td>
                      <td className="p-3" style={{ color: '#787060' }}>{log.occupancy ? `${log.occupancy}%` : "—"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          backgroundColor: (log.data_provider === 'pricelabs' || log.revenue_source === 'pricelabs') ? '#dbeafe' : log.is_instant ? '#dcfce7' : '#fef3c7',
                          color: (log.data_provider === 'pricelabs' || log.revenue_source === 'pricelabs') ? '#1e40af' : log.is_instant ? '#166534' : '#92400e'
                        }}>
                          {log.is_instant ? 'cached' : (log.data_provider || log.revenue_source || '—')}
                        </span>
                      </td>
                      <td className="p-3 text-xs" style={{ color: '#787060' }}>{log.analysis_type || "—"}</td>
                      <td className="p-3 max-w-[120px] truncate" style={{ color: '#787060' }}>{log.user_email || "anon"}</td>
                      <td className="p-3">{log.was_saved ? "✓" : ""}</td>
                      <td className="p-3">{log.was_shared ? "✓" : ""}</td>
                      <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== LEADS TAB ===== */}
        {activeTab === "leads" && (
          <div className="space-y-6">
            {/* Coaching Leads */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e3da' }}>
                <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Coaching Leads ({data.coachingLeads.count})</h3>
                <div className="flex items-center gap-2">
                  {data.coachingLeads.data.filter(l => l.qualified).length > 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                      🔥 {data.coachingLeads.data.filter(l => l.qualified).length} Qualified
                    </span>
                  )}
                  {data.coachingLeads.data.length > 0 && (
                    <button onClick={() => downloadCSV(`edge-coaching-leads-${new Date().toISOString().slice(0,10)}.csv`, ["Email", "Budget", "Timeline", "Experience", "Qualified", "Date"], data.coachingLeads.data.map(l => [l.email, l.budget, l.timeline, l.experience, l.qualified ? "Yes" : "No", fmt(l.created_at)]))} className="px-3 py-1 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: '#2b2823', color: '#fff' }}>⬇ CSV</button>
                  )}
                </div>
              </div>
              {data.coachingLeads.data.length === 0 ? (
                <div className="p-8 text-center" style={{ color: '#787060' }}>No coaching leads yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ backgroundColor: '#f5f5f0' }}>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Email</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Budget</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Timeline</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Experience</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Qualified</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                    </tr></thead>
                    <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                      {data.coachingLeads.data.map((lead) => (
                        <tr key={lead.id}>
                          <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{lead.email}</td>
                          <td className="p-3" style={{ color: '#2b2823' }}>{lead.budget}</td>
                          <td className="p-3" style={{ color: '#2b2823' }}>{lead.timeline}</td>
                          <td className="p-3" style={{ color: '#2b2823' }}>{lead.experience}</td>
                          <td className="p-3">{lead.qualified ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>Yes</span> : <span className="text-xs" style={{ color: '#9a9488' }}>No</span>}</td>
                          <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(lead.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quiz Leads */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Quiz Leads ({data.quizLeads.count})</h3>
              </div>
              {data.quizLeads.data.length === 0 ? (
                <div className="p-8 text-center" style={{ color: '#787060' }}>No quiz leads yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ backgroundColor: '#f5f5f0' }}>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Email</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Recommendations</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                    </tr></thead>
                    <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                      {data.quizLeads.data.map((lead) => (
                        <tr key={lead.id}>
                          <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{lead.email}</td>
                          <td className="p-3"><div className="flex gap-1 flex-wrap">{lead.recommended_methods?.slice(0, 3).map((m, i) => (<span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}>{m}</span>))}</div></td>
                          <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(lead.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Funding Quiz Submissions */}
            {a && a.fundingQuiz.data.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                  <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Funding Quiz Submissions ({a.fundingQuiz.count})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ backgroundColor: '#f5f5f0' }}>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Email</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Budget</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Credit Score</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Experience</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Timeline</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                    </tr></thead>
                    <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                      {a.fundingQuiz.data.map((sub, i) => (
                        <tr key={i}>
                          <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{sub.email}</td>
                          <td className="p-3" style={{ color: '#2b2823' }}>{sub.investment_budget}</td>
                          <td className="p-3" style={{ color: '#2b2823' }}>{sub.credit_score}</td>
                          <td className="p-3" style={{ color: '#2b2823' }}>{sub.experience}</td>
                          <td className="p-3" style={{ color: '#2b2823' }}>{sub.timeline}</td>
                          <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{fmt(sub.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== CACHE HEALTH TAB ===== */}
        {activeTab === "cache" && a && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Property Cache", value: a.cacheHealth.propertyCacheCount, icon: "🏠" },
                { label: "Market Data", value: a.cacheHealth.marketDataCount, icon: "📈" },
                { label: "Airbnb Comps", value: a.cacheHealth.airbnbCompCacheCount, icon: "🏡" },
                { label: "PriceLabs Markets", value: a.cacheHealth.priceLabsMarkets, icon: "📊" },
                { label: "Airbnb Markets", value: a.cacheHealth.airbnbMarkets, icon: "🌐" },
                { label: "Expired Entries", value: a.cacheHealth.expiredCache, icon: "⏰" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
                  <span className="text-xl">{c.icon}</span>
                  <div className="text-xl font-bold mt-1" style={{ color: '#2b2823' }}>{c.value}</div>
                  <div className="text-xs" style={{ color: '#787060' }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Cache Efficiency</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ color: '#787060' }}>Cache Hit Rate</div>
                  <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{a.dataSource.cacheHitRate}%</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>{a.dataSource.cachedAnalyses} of {a.dataSource.totalAnalyses} served instantly</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ color: '#787060' }}>Money Saved</div>
                  <div className="text-3xl font-bold" style={{ color: '#16a34a' }}>${a.dataSource.costSavedByCache.toFixed(2)}</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>API calls avoided by caching</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ color: '#787060' }}>Shared Links</div>
                  <div className="text-3xl font-bold" style={{ color: '#2563eb' }}>{a.cacheHealth.totalSharedLinks}</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>Analysis reports shared</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold mb-2" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Cache Duration</h3>
              <p className="text-sm" style={{ color: '#787060' }}>Property cache and market data entries expire after <strong style={{ color: '#2b2823' }}>60 days</strong>. The weekly cron job (Mondays 6 AM UTC) refreshes the top 5 markets automatically.</p>
              {a.cacheHealth.expiredCache > 0 && (
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
                  <p className="text-sm" style={{ color: '#92400e' }}>⚠️ {a.cacheHealth.expiredCache} expired cache entries found. These will be refreshed on next user search or weekly cron run.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
