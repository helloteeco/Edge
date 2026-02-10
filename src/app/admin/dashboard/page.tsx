"use client";

import { useState, useEffect, useCallback } from "react";

interface DashboardData {
  users: { count: number; data: Array<{ email: string; created_at: string; last_login_at: string }> };
  quizLeads: { count: number; data: Array<{ id: number; email: string; quiz_answers: Record<string, string>; recommended_methods: string[]; created_at: string }> };
  coachingLeads: { count: number; data: Array<{ id: number; email: string; budget: string; timeline: string; experience: string; qualified: boolean; source: string; created_at: string }> };
  savedProperties: { count: number };
  cachedResults: { count: number };
  analysisLog: { count: number; data: Array<{ id: number; address: string; city: string; state: string; bedrooms: number; created_at: string }> };
  marketData: { count: number };
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "coaching" | "quiz" | "users" | "analyses">("overview");

  const fetchData = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/dashboard?password=${encodeURIComponent(pw)}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Incorrect password");
          setAuthenticated(false);
          return;
        }
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

  const handleLogin = () => {
    if (!password) return;
    fetchData(password);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!authenticated || !password) return;
    const interval = setInterval(() => fetchData(password), 30000);
    return () => clearInterval(interval);
  }, [authenticated, password, fetchData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

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
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl mb-3 focus:outline-none focus:ring-2"
            style={{ backgroundColor: '#f5f5f0', border: error ? '2px solid #ef4444' : '1px solid #d8d6cd', color: '#2b2823' }}
          />
          {error && <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold transition-colors"
            style={{ backgroundColor: loading ? '#9a9488' : '#2b2823', color: '#ffffff' }}
          >
            {loading ? 'Loading...' : 'Access Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: "Total Users", value: data.users.count, icon: "👥", color: "#2b2823" },
    { label: "Coaching Leads", value: data.coachingLeads.count, icon: "🎓", color: "#16a34a" },
    { label: "Quiz Leads", value: data.quizLeads.count, icon: "📋", color: "#2563eb" },
    { label: "Analyses Logged", value: data.analysisLog.count, icon: "📊", color: "#9333ea" },
    { label: "Cached Results", value: data.cachedResults.count, icon: "💾", color: "#d97706" },
    { label: "Saved Properties", value: data.savedProperties.count, icon: "❤️", color: "#dc2626" },
    { label: "Market Data Points", value: data.marketData.count, icon: "🗺️", color: "#0891b2" },
  ];

  const qualifiedLeads = data.coachingLeads.data.filter(l => l.qualified);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "coaching" as const, label: `Coaching (${data.coachingLeads.count})`, icon: "🎓" },
    { id: "quiz" as const, label: `Quiz (${data.quizLeads.count})`, icon: "📋" },
    { id: "users" as const, label: `Users (${data.users.count})`, icon: "👥" },
    { id: "analyses" as const, label: `Analyses (${data.analysisLog.count})`, icon: "🔍" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Edge Admin Dashboard</h1>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Real-time analytics &amp; lead management</p>
              </div>
            </div>
            <button
              onClick={() => fetchData(password)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl p-4"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{kpi.icon}</span>
                <span className="text-xs font-medium" style={{ color: '#787060' }}>{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Qualified Leads Alert */}
        {qualifiedLeads.length > 0 && (
          <div
            className="rounded-xl p-4 mb-6 flex items-center gap-3"
            style={{ backgroundColor: '#f0fdf4', border: '2px solid #22c55e' }}
          >
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-semibold" style={{ color: '#166534' }}>
                {qualifiedLeads.length} Qualified Lead{qualifiedLeads.length > 1 ? "s" : ""}!
              </p>
              <p className="text-sm" style={{ color: '#15803d' }}>
                {qualifiedLeads.map(l => l.email).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? '#2b2823' : '#ffffff',
                color: activeTab === tab.id ? '#ffffff' : '#2b2823',
                border: activeTab === tab.id ? 'none' : '1px solid #d8d6cd',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Recent Coaching Leads */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
              <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Recent Coaching Leads</h3>
              </div>
              {data.coachingLeads.data.length === 0 ? (
                <div className="p-8 text-center" style={{ color: '#787060' }}>No coaching leads yet</div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#e5e3da' }}>
                  {data.coachingLeads.data.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: '#2b2823' }}>{lead.email}</span>
                          {lead.qualified && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>Qualified</span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs" style={{ color: '#787060' }}>💰 {lead.budget}</span>
                          <span className="text-xs" style={{ color: '#787060' }}>📅 {lead.timeline}</span>
                          <span className="text-xs" style={{ color: '#787060' }}>🎯 {lead.experience}</span>
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: '#9a9488' }}>{formatDate(lead.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Quiz Leads */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
              <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Recent Quiz Leads</h3>
              </div>
              {data.quizLeads.data.length === 0 ? (
                <div className="p-8 text-center" style={{ color: '#787060' }}>No quiz leads yet</div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#e5e3da' }}>
                  {data.quizLeads.data.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{lead.email}</span>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {lead.recommended_methods?.slice(0, 3).map((m, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}>{m}</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: '#9a9488' }}>{formatDate(lead.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Analyses */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
              <div className="p-4 border-b" style={{ borderColor: '#e5e3da' }}>
                <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Recent Calculator Analyses</h3>
              </div>
              {data.analysisLog.data.length === 0 ? (
                <div className="p-8 text-center" style={{ color: '#787060' }}>No analyses yet — will populate as users run the calculator</div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#e5e3da' }}>
                  {data.analysisLog.data.slice(0, 10).map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{log.address || `${log.city}, ${log.state}`}</span>
                        <span className="text-xs ml-2" style={{ color: '#787060' }}>{log.bedrooms}BR</span>
                      </div>
                      <span className="text-xs" style={{ color: '#9a9488' }}>{formatDate(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "coaching" && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e3da' }}>
              <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>All Coaching Leads</h3>
              <span className="text-sm" style={{ color: '#787060' }}>{data.coachingLeads.count} total</span>
            </div>
            {data.coachingLeads.data.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#787060' }}>
                <p className="text-lg mb-2">🎓</p>
                <p>No coaching leads yet.</p>
                <p className="text-sm mt-1">Leads appear when users complete the AI assistant intake survey.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f0' }}>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Email</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Budget</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Timeline</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Experience</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Qualified</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Source</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                    {data.coachingLeads.data.map((lead) => (
                      <tr key={lead.id}>
                        <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{lead.email}</td>
                        <td className="p-3" style={{ color: '#2b2823' }}>{lead.budget}</td>
                        <td className="p-3" style={{ color: '#2b2823' }}>{lead.timeline}</td>
                        <td className="p-3" style={{ color: '#2b2823' }}>{lead.experience}</td>
                        <td className="p-3">
                          {lead.qualified ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>Yes</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#e5e3da', color: '#787060' }}>No</span>
                          )}
                        </td>
                        <td className="p-3" style={{ color: '#787060' }}>{lead.source}</td>
                        <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{formatDate(lead.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e3da' }}>
              <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>All Quiz Leads</h3>
              <span className="text-sm" style={{ color: '#787060' }}>{data.quizLeads.count} total</span>
            </div>
            {data.quizLeads.data.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#787060' }}>
                <p className="text-lg mb-2">📋</p>
                <p>No quiz leads yet.</p>
                <p className="text-sm mt-1">Leads appear when users complete the funding quiz.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f0' }}>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Email</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Top Recommendations</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Quiz Answers</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                    {data.quizLeads.data.map((lead) => (
                      <tr key={lead.id}>
                        <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{lead.email}</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {lead.recommended_methods?.slice(0, 3).map((m, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}>{m}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="flex gap-1 flex-wrap">
                            {Object.entries(lead.quiz_answers || {}).map(([, v], i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#f5f5f0', color: '#787060' }}>{String(v)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{formatDate(lead.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e3da' }}>
              <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>All Users</h3>
              <span className="text-sm" style={{ color: '#787060' }}>{data.users.count} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f0' }}>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Email</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Signed Up</th>
                    <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                  {data.users.data.map((user, i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{user.email}</td>
                      <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{formatDate(user.created_at)}</td>
                      <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{formatDate(user.last_login_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "analyses" && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e3da' }}>
              <h3 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Calculator Analyses</h3>
              <span className="text-sm" style={{ color: '#787060' }}>{data.analysisLog.count} total</span>
            </div>
            {data.analysisLog.data.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#787060' }}>
                <p className="text-lg mb-2">📊</p>
                <p>No analyses logged yet.</p>
                <p className="text-sm mt-1">Analyses will appear as users run the Deal Analyzer calculator.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f0' }}>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Address</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>City</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>State</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>BR</th>
                      <th className="text-left p-3 font-medium" style={{ color: '#787060' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#e5e3da' }}>
                    {data.analysisLog.data.map((log) => (
                      <tr key={log.id}>
                        <td className="p-3 font-medium" style={{ color: '#2b2823' }}>{log.address || "—"}</td>
                        <td className="p-3" style={{ color: '#2b2823' }}>{log.city}</td>
                        <td className="p-3" style={{ color: '#787060' }}>{log.state}</td>
                        <td className="p-3" style={{ color: '#787060' }}>{log.bedrooms}</td>
                        <td className="p-3 whitespace-nowrap" style={{ color: '#9a9488' }}>{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
