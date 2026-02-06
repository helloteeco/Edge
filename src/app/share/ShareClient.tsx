"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

// Types for different share data
interface DealShareData {
  type: "deal";
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  revenue: number;
  occupancy: number;
  adr: number;
  coc: number;
  purchasePrice?: number;
  grade?: string;
  comparablesCount?: number;
  marketAvgRevenue?: number;
}

interface CityShareData {
  type: "city";
  id: string;
  name: string;
  state: string;
  grade: string;
  score: number;
  revenue: number;
  price: number;
  appreciation?: number;
  listingsCount?: number;
}

interface StateShareData {
  type: "state";
  id: string;
  name: string;
  grade: string;
  score: number;
  cityCount: number;
  topCity: string;
  avgRevenue?: number;
}

type ShareData = DealShareData | CityShareData | StateShareData;

function decodeShareData(encoded: string): ShareData | null {
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded);
  } catch (e) {
    console.error("Failed to decode share data:", e);
    return null;
  }
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function getGradeStyle(grade: string) {
  switch (grade) {
    case 'A+': return { backgroundColor: '#000000', color: '#ffffff' };
    case 'A': return { backgroundColor: '#2b2823', color: '#ffffff' };
    case 'B+': return { backgroundColor: '#3d3a34', color: '#ffffff' };
    case 'B': return { backgroundColor: '#787060', color: '#ffffff' };
    case 'C': return { backgroundColor: '#d8d6cd', color: '#2b2823' };
    case 'D': return { backgroundColor: '#e5e3da', color: '#787060' };
    default: return { backgroundColor: '#e5e3da', color: '#787060' };
  }
}

function calculateDealGrade(coc: number): string {
  if (coc >= 25) return 'A+';
  if (coc >= 20) return 'A';
  if (coc >= 15) return 'B+';
  if (coc >= 10) return 'B';
  if (coc >= 5) return 'C';
  return 'D';
}

// Grade badge — large and prominent
function GradeBadge({ grade, size = "normal" }: { grade: string; size?: "small" | "normal" | "large" }) {
  const sizeClasses = {
    small: "text-base px-3 py-1.5",
    normal: "text-xl px-5 py-2.5",
    large: "text-3xl px-6 py-3",
  };
  return (
    <div
      className={`rounded-2xl font-extrabold tracking-tight ${sizeClasses[size]}`}
      style={{ ...getGradeStyle(grade), fontFamily: "Source Serif Pro, Georgia, serif" }}
    >
      {grade}
    </div>
  );
}

// Metric row for clean stat display
function MetricRow({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-4" style={{ borderBottom: "1px solid #eae8e3" }}>
      <span className="text-base" style={{ color: "#787060" }}>{label}</span>
      <span
        className={`text-base ${bold ? "font-bold" : "font-semibold"}`}
        style={{ color: valueColor || "#2b2823" }}
      >
        {value}
      </span>
    </div>
  );
}

function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const encoded = searchParams.get("d");
    if (encoded) {
      const decoded = decodeShareData(encoded);
      setData(decoded);
    }
    setLoading(false);
  }, [searchParams]);

  const handleClose = () => {
    router.push("/calculator");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f4f0" }}>
        <div className="animate-pulse text-lg" style={{ color: "#787060" }}>Loading analysis...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative" style={{ backgroundColor: "#f5f4f0" }}>
        <h1 className="text-2xl font-bold mb-4" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
          Link Expired
        </h1>
        <p className="mb-8 text-center text-base" style={{ color: "#787060", maxWidth: "320px", lineHeight: "1.6" }}>
          This analysis link is no longer available. Run a free analysis on any US address in seconds.
        </p>
        <Link
          href="/calculator"
          className="px-8 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:opacity-90"
          style={{ backgroundColor: "#2b2823" }}
        >
          Run Free Analysis
        </Link>
      </div>
    );
  }

  // ==========================================================================
  // DEAL SHARE — Premium property analysis landing page
  // ==========================================================================
  if (data.type === "deal") {
    const grade = data.grade || calculateDealGrade(data.coc);
    const cocColor = data.coc >= 20 ? "#16a34a" : data.coc >= 10 ? "#ca8a04" : "#dc2626";
    const monthlyRevenue = Math.round(data.revenue / 12);
    const dailyRevenue = Math.round(data.revenue / 365);
    const compsCount = data.comparablesCount || 0;

    return (
      <div className="min-h-screen" style={{ backgroundColor: "#f5f4f0" }}>
        <div className="max-w-lg mx-auto px-5 py-10">

          {/* Brand Header */}
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                Edge
              </span>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: "#2b2823", color: "#d8d6cd" }}
              >
                by Teeco
              </span>
            </Link>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#787060" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Property Header Card */}
          <div
            className="rounded-3xl p-7 mb-6"
            style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          >
            {/* Address + Grade */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h1
                  className="text-2xl font-extrabold leading-tight mb-2 tracking-tight"
                  style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}
                >
                  {data.address}
                </h1>
                <p className="text-base" style={{ color: "#787060" }}>
                  {data.city}, {data.state} &middot; {data.bedrooms} Bed / {data.bathrooms} Bath
                </p>
              </div>
              <GradeBadge grade={grade} size="normal" />
            </div>

            {/* Revenue Hero */}
            <div
              className="rounded-2xl p-6 mb-6 text-center"
              style={{ backgroundColor: "#f0fdf4" }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: "#16a34a" }}>
                Projected Annual Revenue
              </p>
              <p
                className="text-5xl font-extrabold tracking-tight"
                style={{ color: "#16a34a", fontFamily: "Source Serif Pro, Georgia, serif", lineHeight: 1.1 }}
              >
                {formatCurrencyFull(data.revenue)}
                <span className="text-xl font-semibold">/yr</span>
              </p>
            </div>

            {/* Key Metrics Grid — 3 columns, bold numbers */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#f5f4f0" }}>
                <p className="text-2xl font-extrabold tracking-tight" style={{ color: cocColor, fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.coc.toFixed(1)}%
                </p>
                <p className="text-xs mt-1" style={{ color: "#787060" }}>Cash-on-Cash</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#f5f4f0" }}>
                <p className="text-2xl font-extrabold tracking-tight" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.occupancy}%
                </p>
                <p className="text-xs mt-1" style={{ color: "#787060" }}>Occupancy</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#f5f4f0" }}>
                <p className="text-2xl font-extrabold tracking-tight" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  ${data.adr}
                </p>
                <p className="text-xs mt-1" style={{ color: "#787060" }}>Avg/Night</p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div>
              <MetricRow label="Monthly Revenue" value={formatCurrencyFull(monthlyRevenue)} valueColor="#16a34a" bold />
              <MetricRow label="Daily Earning Potential" value={`${formatCurrencyFull(dailyRevenue)}/day`} />
              {data.purchasePrice && data.purchasePrice > 0 && (
                <MetricRow label="Purchase Price" value={formatCurrencyFull(data.purchasePrice)} />
              )}
              {compsCount > 0 && (
                <MetricRow label="Comparable Listings" value={`${compsCount} analyzed`} valueColor="#16a34a" />
              )}
            </div>
          </div>

          {/* Data Confidence Banner */}
          {compsCount > 0 && (
            <div
              className="rounded-2xl p-5 mb-6 flex items-start gap-3"
              style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
            >
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: "#16a34a" }} />
              <p className="text-sm leading-relaxed" style={{ color: "#787060" }}>
                Revenue estimate based on <span className="font-semibold" style={{ color: "#2b2823" }}>{compsCount} comparable short-term rentals</span> within the area, including occupancy rates, nightly rates, and seasonal demand patterns.
              </p>
            </div>
          )}

          {/* CTA Section — generous spacing */}
          <div className="space-y-4 mb-8">
            <Link
              href="/calculator"
              className="block w-full px-6 py-5 rounded-2xl font-bold text-white text-center text-lg transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              Analyze Any US Address — Free
            </Link>
            <Link
              href="/"
              className="block w-full px-6 py-4 rounded-2xl font-semibold text-center text-base transition-all hover:opacity-80"
              style={{ backgroundColor: "#ffffff", color: "#2b2823", border: "1.5px solid #e8e5df" }}
            >
              Explore Top STR Markets
            </Link>
          </div>

          {/* Footer */}
          <p className="text-center text-sm" style={{ color: "#a09890" }}>
            edge.teeco.co &middot; Your unfair advantage in STR investing
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // CITY SHARE — Premium market analysis landing page
  // ==========================================================================
  if (data.type === "city") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#f5f4f0" }}>
        <div className="max-w-lg mx-auto px-5 py-10">

          {/* Brand Header */}
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                Edge
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#2b2823", color: "#d8d6cd" }}>
                by Teeco
              </span>
            </Link>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#787060" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Market Card */}
          <div
            className="rounded-3xl p-7 mb-6"
            style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1
                  className="text-3xl font-extrabold leading-tight tracking-tight"
                  style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}
                >
                  {data.name}
                </h1>
                <p className="text-lg mt-1" style={{ color: "#787060" }}>{data.state}</p>
              </div>
              <GradeBadge grade={data.grade} size="normal" />
            </div>

            {/* Score + Revenue Hero */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#f5f4f0" }}>
                <p
                  className="text-4xl font-extrabold tracking-tight"
                  style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}
                >
                  {data.score}<span className="text-lg font-semibold" style={{ color: "#787060" }}>/100</span>
                </p>
                <p className="text-sm mt-1" style={{ color: "#787060" }}>Market Score</p>
              </div>
              <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#f0fdf4" }}>
                <p
                  className="text-4xl font-extrabold tracking-tight"
                  style={{ color: "#16a34a", fontFamily: "Source Serif Pro, Georgia, serif" }}
                >
                  {formatCurrency(data.revenue * 12)}
                </p>
                <p className="text-sm mt-1" style={{ color: "#787060" }}>Avg Revenue/yr</p>
              </div>
            </div>

            {/* Stats */}
            <div>
              <MetricRow label="Median Home Price" value={formatCurrencyFull(data.price)} bold />
              {data.appreciation && (
                <MetricRow label="Year-over-Year Growth" value={`+${data.appreciation}%`} valueColor="#16a34a" />
              )}
              {data.listingsCount && (
                <MetricRow label="Active STR Listings" value={data.listingsCount.toLocaleString()} />
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4 mb-8">
            <Link
              href={`/city/${data.id}`}
              className="block w-full px-6 py-5 rounded-2xl font-bold text-white text-center text-lg transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              View Full Market Details
            </Link>
            <Link
              href="/calculator"
              className="block w-full px-6 py-4 rounded-2xl font-semibold text-center text-base transition-all hover:opacity-80"
              style={{ backgroundColor: "#ffffff", color: "#2b2823", border: "1.5px solid #e8e5df" }}
            >
              Analyze Your Own Property — Free
            </Link>
          </div>

          <p className="text-center text-sm" style={{ color: "#a09890" }}>
            edge.teeco.co &middot; Your unfair advantage in STR investing
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STATE SHARE — Premium state analysis landing page
  // ==========================================================================
  if (data.type === "state") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#f5f4f0" }}>
        <div className="max-w-lg mx-auto px-5 py-10">

          {/* Brand Header */}
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                Edge
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#2b2823", color: "#d8d6cd" }}>
                by Teeco
              </span>
            </Link>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#787060" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* State Card */}
          <div
            className="rounded-3xl p-7 mb-6"
            style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1
                  className="text-3xl font-extrabold leading-tight tracking-tight"
                  style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}
                >
                  {data.name}
                </h1>
                <p className="text-base mt-1" style={{ color: "#787060" }}>{data.cityCount} markets analyzed</p>
              </div>
              <GradeBadge grade={data.grade} size="normal" />
            </div>

            {/* Score Hero */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#f5f4f0" }}>
                <p
                  className="text-4xl font-extrabold tracking-tight"
                  style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}
                >
                  {data.score}<span className="text-lg font-semibold" style={{ color: "#787060" }}>/100</span>
                </p>
                <p className="text-sm mt-1" style={{ color: "#787060" }}>State Score</p>
              </div>
              <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: "#f5f4f0" }}>
                <p
                  className="text-4xl font-extrabold tracking-tight"
                  style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}
                >
                  {data.cityCount}
                </p>
                <p className="text-sm mt-1" style={{ color: "#787060" }}>Markets</p>
              </div>
            </div>

            {/* Stats */}
            <div>
              <MetricRow label="Top Market" value={data.topCity} bold />
              {data.avgRevenue && (
                <MetricRow label="Avg Annual Revenue" value={formatCurrencyFull(data.avgRevenue)} valueColor="#16a34a" />
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4 mb-8">
            <Link
              href={`/state/${data.id.toLowerCase()}`}
              className="block w-full px-6 py-5 rounded-2xl font-bold text-white text-center text-lg transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              Explore {data.name} Markets
            </Link>
            <Link
              href="/calculator"
              className="block w-full px-6 py-4 rounded-2xl font-semibold text-center text-base transition-all hover:opacity-80"
              style={{ backgroundColor: "#ffffff", color: "#2b2823", border: "1.5px solid #e8e5df" }}
            >
              Analyze Any US Address — Free
            </Link>
          </div>

          <p className="text-center text-sm" style={{ color: "#a09890" }}>
            edge.teeco.co &middot; Your unfair advantage in STR investing
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function ShareClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f4f0" }}>
        <div className="animate-pulse text-lg" style={{ color: "#787060" }}>Loading analysis...</div>
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
