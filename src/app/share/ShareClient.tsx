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
  grade?: string; // STR Grade
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

// Decode share data from URL
function decodeShareData(encoded: string): ShareData | null {
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded);
  } catch (e) {
    console.error("Failed to decode share data:", e);
    return null;
  }
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Get grade style
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

// Calculate STR grade from CoC return
function calculateDealGrade(coc: number): string {
  if (coc >= 25) return 'A+';
  if (coc >= 20) return 'A';
  if (coc >= 15) return 'B+';
  if (coc >= 10) return 'B';
  if (coc >= 5) return 'C';
  return 'D';
}

// Close button component
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
      style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
      aria-label="Close"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2b2823" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  );
}

// Grade badge component
function GradeBadge({ grade, size = "normal" }: { grade: string; size?: "small" | "normal" | "large" }) {
  const sizeClasses = {
    small: "text-sm px-2 py-1",
    normal: "text-lg px-4 py-2",
    large: "text-2xl px-5 py-3",
  };
  
  return (
    <div 
      className={`rounded-xl font-bold ${sizeClasses[size]}`}
      style={{ ...getGradeStyle(grade), fontFamily: "Source Serif Pro, Georgia, serif" }}
    >
      {grade}
    </div>
  );
}

// Insight pill component
function InsightPill({ icon, label, value, positive }: { icon: string; label: string; value: string; positive?: boolean }) {
  return (
    <div 
      className="flex items-center gap-2 px-3 py-2 rounded-full text-sm"
      style={{ backgroundColor: positive ? "#f0fdf4" : "#f5f5f4" }}
    >
      <span>{icon}</span>
      <span style={{ color: "#787060" }}>{label}</span>
      <span className="font-semibold" style={{ color: positive ? "#16a34a" : "#2b2823" }}>{value}</span>
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
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#e5e3da" }}>
        <div className="animate-pulse text-lg" style={{ color: "#787060" }}>Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative" style={{ backgroundColor: "#e5e3da" }}>
        <CloseButton onClick={handleClose} />
        <h1 className="text-2xl font-bold mb-4" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Invalid Share Link</h1>
        <p className="mb-6" style={{ color: "#787060" }}>This share link is invalid or has expired.</p>
        <Link 
          href="/"
          className="px-6 py-3 rounded-xl font-medium text-white"
          style={{ backgroundColor: "#2b2823" }}
        >
          Go to Edge
        </Link>
      </div>
    );
  }

  // Render Deal Share
  if (data.type === "deal") {
    const grade = data.grade || calculateDealGrade(data.coc);
    const cocColor = data.coc >= 20 ? "#16a34a" : data.coc >= 10 ? "#ca8a04" : "#dc2626";
    const cocBg = data.coc >= 20 ? "#f0fdf4" : data.coc >= 10 ? "#fefce8" : "#fef2f2";
    
    // Calculate some derived insights
    const monthlyRevenue = data.revenue / 12;
    const revenuePerBedroom = data.revenue / data.bedrooms;
    const isHighPerformer = data.coc >= 15;
    
    return (
      <div className="min-h-screen relative" style={{ backgroundColor: "#e5e3da" }}>
        <CloseButton onClick={handleClose} />
        
        <div className="max-w-lg mx-auto px-5 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Edge</span>
              <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: "#2b2823", color: "#ffffff" }}>by Teeco</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "#ffffff" }}>
              <span className="text-sm font-medium" style={{ color: "#2b2823" }}>STR Investment Analysis</span>
            </div>
          </div>

          {/* Property Card */}
          <div className="rounded-2xl p-6 mb-5" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            {/* Header with Grade */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <h1 className="text-xl font-bold mb-1" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.address}
                </h1>
                <p style={{ color: "#787060" }}>
                  {data.city}, {data.state} • {data.bedrooms} BR / {data.bathrooms} BA
                </p>
              </div>
              <GradeBadge grade={grade} />
            </div>

            {/* Key Metrics - Larger and more prominent */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
                <div className="text-3xl font-bold" style={{ color: "#16a34a", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {formatCurrency(data.revenue)}/yr
                </div>
                <div className="text-sm mt-1" style={{ color: "#787060" }}>Projected Revenue</div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: cocBg }}>
                <div className="text-3xl font-bold" style={{ color: cocColor, fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.coc.toFixed(1)}%
                </div>
                <div className="text-sm mt-1" style={{ color: "#787060" }}>Cash-on-Cash</div>
              </div>
            </div>

            {/* Insights Pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {isHighPerformer && (
                <InsightPill icon="⭐" label="" value="High Performer" positive />
              )}
              <InsightPill icon="📊" label="" value={`${formatCurrency(revenuePerBedroom)}/BR`} />
              <InsightPill icon="💰" label="" value={`${formatCurrency(monthlyRevenue)}/mo`} />
            </div>

            {/* Additional Stats */}
            <div className="space-y-0">
              <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                <span style={{ color: "#787060" }}>Occupancy Rate</span>
                <span className="font-semibold" style={{ color: "#2b2823" }}>{data.occupancy}%</span>
              </div>
              <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                <span style={{ color: "#787060" }}>Avg Nightly Rate</span>
                <span className="font-semibold" style={{ color: "#2b2823" }}>${data.adr}/night</span>
              </div>
              {data.purchasePrice && (
                <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                  <span style={{ color: "#787060" }}>Purchase Price</span>
                  <span className="font-semibold" style={{ color: "#2b2823" }}>{formatCurrency(data.purchasePrice)}</span>
                </div>
              )}
              {data.comparablesCount && (
                <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                  <span style={{ color: "#787060" }}>Comparables Analyzed</span>
                  <span className="font-semibold" style={{ color: "#2b2823" }}>{data.comparablesCount} properties</span>
                </div>
              )}
            </div>
          </div>

          {/* Value Proposition */}
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: "rgba(255,255,255,0.6)" }}>
            <p className="text-center text-sm" style={{ color: "#787060" }}>
              📈 Analysis powered by data from <span className="font-semibold" style={{ color: "#2b2823" }}>1,000+ nearby STR listings</span>
            </p>
          </div>

          {/* CTA Section */}
          <div className="space-y-3">
            <Link 
              href="/calculator"
              className="block w-full px-6 py-4 rounded-xl font-semibold text-white text-center transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              Analyze Your Own Property
            </Link>
            <Link 
              href="/"
              className="block w-full px-6 py-3 rounded-xl font-medium text-center transition-all hover:opacity-80"
              style={{ backgroundColor: "#ffffff", color: "#2b2823", border: "1px solid #e8e5df" }}
            >
              Find My First STR Market
            </Link>
          </div>

          {/* Footer */}
          <p className="text-center text-sm mt-6" style={{ color: "#787060" }}>
            Your unfair advantage in STR investing
          </p>
        </div>
      </div>
    );
  }

  // Render City Share
  if (data.type === "city") {
    return (
      <div className="min-h-screen relative" style={{ backgroundColor: "#e5e3da" }}>
        <CloseButton onClick={handleClose} />
        
        <div className="max-w-lg mx-auto px-5 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Edge</span>
              <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: "#2b2823", color: "#ffffff" }}>by Teeco</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "#ffffff" }}>
              <span className="text-sm font-medium" style={{ color: "#2b2823" }}>STR Market Analysis</span>
            </div>
          </div>

          {/* Market Card */}
          <div className="rounded-2xl p-6 mb-5" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.name}
                </h1>
                <p className="text-lg" style={{ color: "#787060" }}>{data.state}</p>
              </div>
              <GradeBadge grade={data.grade} />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#e5e3da" }}>
                <div className="text-3xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.score}/100
                </div>
                <div className="text-sm mt-1" style={{ color: "#787060" }}>Market Score</div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
                <div className="text-3xl font-bold" style={{ color: "#16a34a", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {formatCurrency(data.revenue * 12)}/yr
                </div>
                <div className="text-sm mt-1" style={{ color: "#787060" }}>Avg Revenue</div>
              </div>
            </div>

            {/* Insights */}
            <div className="flex flex-wrap gap-2 mb-5">
              {data.score >= 70 && <InsightPill icon="🔥" label="" value="Hot Market" positive />}
              {data.appreciation && <InsightPill icon="📈" label="" value={`+${data.appreciation}% YoY`} positive />}
            </div>

            {/* Stats */}
            <div className="space-y-0">
              <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                <span style={{ color: "#787060" }}>Median Home Price</span>
                <span className="font-semibold" style={{ color: "#2b2823" }}>{formatCurrency(data.price)}</span>
              </div>
              {data.listingsCount && (
                <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                  <span style={{ color: "#787060" }}>Active STR Listings</span>
                  <span className="font-semibold" style={{ color: "#2b2823" }}>{data.listingsCount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-3">
            <Link 
              href={`/city/${data.id}`}
              className="block w-full px-6 py-4 rounded-xl font-semibold text-white text-center transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              View Full Market Details
            </Link>
            <Link 
              href="/"
              className="block w-full px-6 py-3 rounded-xl font-medium text-center transition-all hover:opacity-80"
              style={{ backgroundColor: "#ffffff", color: "#2b2823", border: "1px solid #e8e5df" }}
            >
              Explore All Markets
            </Link>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#787060" }}>
            Your unfair advantage in STR investing
          </p>
        </div>
      </div>
    );
  }

  // Render State Share
  if (data.type === "state") {
    return (
      <div className="min-h-screen relative" style={{ backgroundColor: "#e5e3da" }}>
        <CloseButton onClick={handleClose} />
        
        <div className="max-w-lg mx-auto px-5 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Edge</span>
              <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: "#2b2823", color: "#ffffff" }}>by Teeco</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "#ffffff" }}>
              <span className="text-sm font-medium" style={{ color: "#2b2823" }}>STR State Analysis</span>
            </div>
          </div>

          {/* State Card */}
          <div className="rounded-2xl p-6 mb-5" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.name}
                </h1>
                <p className="text-lg" style={{ color: "#787060" }}>{data.id}</p>
              </div>
              <GradeBadge grade={data.grade} />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#e5e3da" }}>
                <div className="text-3xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.score}/100
                </div>
                <div className="text-sm mt-1" style={{ color: "#787060" }}>Market Score</div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#e5e3da" }}>
                <div className="text-3xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.cityCount}
                </div>
                <div className="text-sm mt-1" style={{ color: "#787060" }}>Markets Analyzed</div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-0">
              <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                <span style={{ color: "#787060" }}>Top Market</span>
                <span className="font-semibold" style={{ color: "#2b2823" }}>{data.topCity}</span>
              </div>
              {data.avgRevenue && (
                <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                  <span style={{ color: "#787060" }}>Avg State Revenue</span>
                  <span className="font-semibold" style={{ color: "#16a34a" }}>{formatCurrency(data.avgRevenue)}/yr</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-3">
            <Link 
              href={`/state/${data.id.toLowerCase()}`}
              className="block w-full px-6 py-4 rounded-xl font-semibold text-white text-center transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              Explore {data.name} Markets
            </Link>
            <Link 
              href="/"
              className="block w-full px-6 py-3 rounded-xl font-medium text-center transition-all hover:opacity-80"
              style={{ backgroundColor: "#ffffff", color: "#2b2823", border: "1px solid #e8e5df" }}
            >
              View All States
            </Link>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#787060" }}>
            Your unfair advantage in STR investing
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#e5e3da" }}>
        <div className="animate-pulse text-lg" style={{ color: "#787060" }}>Loading...</div>
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
