"use client";

import { useState, useEffect, useCallback } from "react";

// Simple bar chart component
function BarChart({ data, labelKey, valueKey, color = "#2d6a4f", maxBars = 10 }: {
  data: any[];
  labelKey: string;
  valueKey: string;
  color?: string;
  maxBars?: number;
}) {
  const sliced = data.slice(0, maxBars);
  const max = Math.max(...sliced.map(d => d[valueKey]), 1);
  
  return (
    <div className="space-y-2">
      {sliced.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 text-xs text-gray-500 text-right truncate" title={item[labelKey]}>
            {item[labelKey]}
          </div>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item[valueKey] / max) * 100}%`,
                backgroundColor: color,
                minWidth: item[valueKey] > 0 ? "24px" : "0",
              }}
            />
          </div>
          <div className="w-10 text-xs font-semibold text-gray-700 text-right">
            {item[valueKey]}
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div className="text-center text-gray-400 py-8 text-sm">No data yet — analyses will appear here as users run them</div>
      )}
    </div>
  );
}

// KPI card
function KpiCard({ label, value, subtitle, icon }: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// Section wrapper
function Section({ title, children, className = "" }: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async (pwd: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          setError("Invalid password");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const json = await res.json();
      setData(json);
      setIsAuthenticated(true);
      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(password);
  };

  const handleRefresh = () => {
    fetchData(password);
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => fetchData(password), 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, password, fetchData]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edge Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Internal Dashboard</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Access Dashboard"}
          </button>
        </form>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const { summary, charts, recentAnalyses, users, savedProperties } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edge Analytics Dashboard</h1>
            <p className="text-xs text-gray-400">
              {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : "Loading..."}
              {" · "}Auto-refreshes every 60s
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Users" value={summary.totalUsers} icon="👥" subtitle="Registered accounts" />
          <KpiCard label="Analyses Logged" value={summary.totalAnalyses} icon="📊" subtitle="From analysis_log" />
          <KpiCard label="Cached Results" value={summary.totalCachedAnalyses} icon="⚡" subtitle="In property_cache" />
          <KpiCard label="Saved Properties" value={summary.totalSavedProperties} icon="💾" subtitle="By users" />
          <KpiCard label="Shared Analyses" value={summary.totalSharedAnalyses} icon="🔗" subtitle="Share links created" />
          <KpiCard label="Credit Purchases" value={summary.totalCreditPurchases} icon="💳" subtitle={summary.totalRevenuePurchased > 0 ? `$${(summary.totalRevenuePurchased / 100).toFixed(0)} revenue` : "Tracking"} />
        </div>

        {/* Revenue Metrics (only show if we have analysis data) */}
        {summary.avgRevenue > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Avg Annual Revenue" value={`$${summary.avgRevenue.toLocaleString()}`} icon="💰" subtitle="Across all analyses" />
            <KpiCard label="Avg Nightly Rate" value={`$${summary.avgAdr}`} icon="🌙" subtitle="ADR" />
            <KpiCard label="Avg Occupancy" value={`${summary.avgOccupancy}%`} icon="📈" subtitle="Occupancy rate" />
            <KpiCard label="Revenue P50 / P90" value={`$${Math.round(summary.revenueP50 / 1000)}K / $${Math.round(summary.revenueP90 / 1000)}K`} icon="📊" subtitle="Median / Top 10%" />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Analyses by State">
            <BarChart data={charts.topStates} labelKey="state" valueKey="count" color="#2d6a4f" />
          </Section>
          <Section title="Top Cities Analyzed">
            <BarChart data={charts.topCities} labelKey="city" valueKey="count" color="#1b4332" />
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Section title="Bedroom Distribution">
            <BarChart data={charts.bedroomDistribution} labelKey="bedrooms" valueKey="count" color="#40916c" />
          </Section>
          <Section title="Data Provider">
            <BarChart data={charts.dataProviders} labelKey="provider" valueKey="count" color="#52b788" />
          </Section>
          <Section title="Daily Analysis Volume">
            <BarChart data={charts.dailyAnalyses} labelKey="date" valueKey="count" color="#74c69d" maxBars={14} />
          </Section>
        </div>

        {/* Recent Analyses Table */}
        <Section title="Recent Analyses" className="overflow-x-auto">
          {recentAnalyses.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Address</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">City</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">ST</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">BR</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">Revenue</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">ADR</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">Occ%</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">Comps</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">Strength</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Provider</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">When</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-900 max-w-[200px] truncate" title={a.address}>{a.address}</td>
                    <td className="py-2 px-2 text-gray-600">{a.city}</td>
                    <td className="py-2 px-2 text-gray-600">{a.state}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{a.bedrooms}</td>
                    <td className="py-2 px-2 text-right font-semibold text-green-700">
                      {a.annualRevenue ? `$${Number(a.annualRevenue).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600">
                      {a.adr ? `$${Math.round(Number(a.adr))}` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600">
                      {a.occupancy ? `${Number(a.occupancy).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600">{a.compCount || "—"}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        a.compStrength >= 70 ? "bg-green-100 text-green-700" :
                        a.compStrength >= 40 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {a.compStrength || 0}/100
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-500">{a.dataProvider || "—"}</td>
                    <td className="py-2 px-2 text-gray-400 whitespace-nowrap">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p className="text-lg mb-2">No analyses logged yet</p>
              <p className="text-sm">Analyses will appear here as users run them on edge.teeco.co</p>
            </div>
          )}
        </Section>

        {/* Users Table */}
        <Section title={`Users (${users.length})`} className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-500">Email</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500">Joined</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500">Last Login</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500">Credits Used</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500">Credits Limit</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-500">Unlimited</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-900 font-medium">{u.email}</td>
                  <td className="py-2 px-2 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 px-2 text-gray-500">{new Date(u.lastLogin).toLocaleDateString()}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{u.creditsUsed}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{u.creditsLimit}</td>
                  <td className="py-2 px-2 text-center">
                    {u.isUnlimited ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">YES</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Saved Properties */}
        {savedProperties.length > 0 && (
          <Section title={`Saved Properties (${savedProperties.length})`} className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Address</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">User</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">Annual Revenue</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">CoC Return</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Saved</th>
                </tr>
              </thead>
              <tbody>
                {savedProperties.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-900">{p.address}</td>
                    <td className="py-2 px-2 text-gray-500">{p.userEmail}</td>
                    <td className="py-2 px-2 text-right font-semibold text-green-700">
                      {p.annualRevenue ? `$${Number(p.annualRevenue).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600">
                      {p.cashOnCash ? `${Number(p.cashOnCash).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2 px-2 text-gray-400">{new Date(p.savedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-8">
          Edge by Teeco · Internal Analytics Dashboard · Data refreshes automatically
        </div>
      </div>
    </div>
  );
}
