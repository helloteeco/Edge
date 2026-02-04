"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";

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
}

interface StateShareData {
  type: "state";
  id: string;
  name: string;
  grade: string;
  score: number;
  cityCount: number;
  topCity: string;
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

function ShareContent() {
  const searchParams = useSearchParams();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#e5e3da" }}>
        <div className="animate-pulse text-lg" style={{ color: "#787060" }}>Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: "#e5e3da" }}>
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
    const cocColor = data.coc >= 20 ? "#16a34a" : data.coc >= 15 ? "#ca8a04" : "#dc2626";
    const cocBg = data.coc >= 20 ? "#f0fdf4" : data.coc >= 15 ? "#fefce8" : "#fef2f2";
    
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#e5e3da" }}>
        <div className="max-w-lg mx-auto p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Edge</span>
              <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: "#2b2823", color: "#ffffff" }}>by Teeco</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "#ffffff" }}>
              <span className="text-sm font-medium" style={{ color: "#2b2823" }}>STR Investment Analysis</span>
            </div>
          </div>

          {/* Property Card */}
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h1 className="text-xl font-bold mb-2" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
              {data.address}
            </h1>
            <p className="mb-4" style={{ color: "#787060" }}>
              {data.city}, {data.state} • {data.bedrooms} BR / {data.bathrooms} BA
            </p>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
                <div className="text-2xl font-bold" style={{ color: "#16a34a", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {formatCurrency(data.revenue)}/yr
                </div>
                <div className="text-sm" style={{ color: "#787060" }}>Projected Revenue</div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: cocBg }}>
                <div className="text-2xl font-bold" style={{ color: cocColor, fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.coc.toFixed(1)}%
                </div>
                <div className="text-sm" style={{ color: "#787060" }}>Cash-on-Cash</div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
              <span style={{ color: "#787060" }}>Occupancy</span>
              <span className="font-medium" style={{ color: "#2b2823" }}>{data.occupancy}%</span>
            </div>
            <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
              <span style={{ color: "#787060" }}>Avg Daily Rate</span>
              <span className="font-medium" style={{ color: "#2b2823" }}>${data.adr}/night</span>
            </div>
            {data.purchasePrice && (
              <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
                <span style={{ color: "#787060" }}>Purchase Price</span>
                <span className="font-medium" style={{ color: "#2b2823" }}>{formatCurrency(data.purchasePrice)}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link 
              href="/calculator"
              className="inline-block w-full px-6 py-4 rounded-xl font-medium text-white mb-3 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              Analyze Your Own Property
            </Link>
            <p className="text-sm" style={{ color: "#787060" }}>
              Your unfair advantage in STR investing
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render City Share
  if (data.type === "city") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#e5e3da" }}>
        <div className="max-w-lg mx-auto p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Edge</span>
              <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: "#2b2823", color: "#ffffff" }}>by Teeco</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "#ffffff" }}>
              <span className="text-sm font-medium" style={{ color: "#2b2823" }}>STR Market Analysis</span>
            </div>
          </div>

          {/* Market Card */}
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.name}
                </h1>
                <p style={{ color: "#787060" }}>{data.state}</p>
              </div>
              <div 
                className="px-4 py-2 rounded-xl font-bold text-lg"
                style={{ ...getGradeStyle(data.grade), fontFamily: "Source Serif Pro, Georgia, serif" }}
              >
                {data.grade}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#e5e3da" }}>
                <div className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.score}/100
                </div>
                <div className="text-sm" style={{ color: "#787060" }}>Market Score</div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
                <div className="text-2xl font-bold" style={{ color: "#16a34a", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {formatCurrency(data.revenue * 12)}/yr
                </div>
                <div className="text-sm" style={{ color: "#787060" }}>Avg Revenue</div>
              </div>
            </div>

            <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
              <span style={{ color: "#787060" }}>Median Home Price</span>
              <span className="font-medium" style={{ color: "#2b2823" }}>{formatCurrency(data.price)}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link 
              href={`/city/${data.id}`}
              className="inline-block w-full px-6 py-4 rounded-xl font-medium text-white mb-3 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              View Full Market Details
            </Link>
            <p className="text-sm" style={{ color: "#787060" }}>
              Your unfair advantage in STR investing
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render State Share
  if (data.type === "state") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#e5e3da" }}>
        <div className="max-w-lg mx-auto p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Edge</span>
              <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: "#2b2823", color: "#ffffff" }}>by Teeco</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "#ffffff" }}>
              <span className="text-sm font-medium" style={{ color: "#2b2823" }}>STR State Analysis</span>
            </div>
          </div>

          {/* State Card */}
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.name}
                </h1>
                <p style={{ color: "#787060" }}>{data.id}</p>
              </div>
              <div 
                className="px-4 py-2 rounded-xl font-bold text-lg"
                style={{ ...getGradeStyle(data.grade), fontFamily: "Source Serif Pro, Georgia, serif" }}
              >
                {data.grade}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#e5e3da" }}>
                <div className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.score}/100
                </div>
                <div className="text-sm" style={{ color: "#787060" }}>Market Score</div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#e5e3da" }}>
                <div className="text-2xl font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                  {data.cityCount}
                </div>
                <div className="text-sm" style={{ color: "#787060" }}>Markets Analyzed</div>
              </div>
            </div>

            <div className="flex justify-between py-3 border-t" style={{ borderColor: "#e8e5df" }}>
              <span style={{ color: "#787060" }}>Top Market</span>
              <span className="font-medium" style={{ color: "#2b2823" }}>{data.topCity}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link 
              href={`/state/${data.id.toLowerCase()}`}
              className="inline-block w-full px-6 py-4 rounded-xl font-medium text-white mb-3 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#2b2823" }}
            >
              Explore {data.name} Markets
            </Link>
            <p className="text-sm" style={{ color: "#787060" }}>
              Your unfair advantage in STR investing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function SharePage() {
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
