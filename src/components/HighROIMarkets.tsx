"use client";

import Link from "next/link";
import { cityData } from "@/data/helpers";
import { TrendUpIcon, DollarIcon, HomeEquityIcon } from "@/components/Icons";

export function HighROIMarkets() {
  // Filter for high ROI markets: high cash-on-cash, affordable, legal STR
  const highROIMarkets = [...cityData]
    .filter(city => 
      city.regulation === "Legal" && // Only legal markets
      city.medianHomeValue < 350000 && // Affordable entry point
      city.cashOnCash >= 8 // At least 8% cash-on-cash return
    )
    .sort((a, b) => b.cashOnCash - a.cashOnCash) // Sort by highest cash-on-cash
    .slice(0, 6);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  // Get ROI badge style based on cash-on-cash percentage
  const getROIStyle = (cashOnCash: number) => {
    if (cashOnCash >= 15) return { backgroundColor: '#000000', color: '#ffffff' };
    if (cashOnCash >= 12) return { backgroundColor: '#2b2823', color: '#ffffff' };
    if (cashOnCash >= 10) return { backgroundColor: '#3d3a34', color: '#ffffff' };
    if (cashOnCash >= 8) return { backgroundColor: '#787060', color: '#ffffff' };
    return { backgroundColor: '#d8d6cd', color: '#2b2823' };
  };

  return (
    <div 
      className="rounded-2xl p-6 sm:p-8"
      style={{ 
        background: 'linear-gradient(135deg, #1a1815 0%, #2b2823 50%, #1a1815 100%)',
        boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <TrendUpIcon className="w-6 h-6" color="#4ade80" />
        </div>
        <div>
          <h2 
            className="text-xl sm:text-2xl font-semibold mb-1"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            High ROI Markets
          </h2>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Best cash-on-cash returns with affordable entry points
          </p>
        </div>
      </div>

      {/* Why Cash-on-Cash Matters Callout */}
      <div 
        className="rounded-xl p-4 mb-6"
        style={{ 
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          border: '1px solid rgba(74, 222, 128, 0.2)'
        }}
      >
        <div className="flex items-start gap-3">
          <DollarIcon className="w-5 h-5 flex-shrink-0 mt-0.5" color="#4ade80" />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#4ade80' }}>
              Why These Markets?
            </p>
            <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              These markets offer the highest <strong style={{ color: '#ffffff' }}>cash-on-cash returns</strong> with 
              home prices under $350K. Lower entry costs + high rental income = more money in your pocket each month.
            </p>
          </div>
        </div>
      </div>

      {/* Market Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {highROIMarkets.map((city, index) => (
          <Link
            key={city.id}
            href={`/city/${city.id}`}
            className="group rounded-xl p-4 transition-all duration-300"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Top Row: Rank + ROI Badge */}
            <div className="flex items-center justify-between mb-3">
              <span 
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                style={{ 
                  backgroundColor: index < 3 ? '#4ade80' : 'rgba(255, 255, 255, 0.15)',
                  color: index < 3 ? '#000000' : 'rgba(255, 255, 255, 0.7)'
                }}
              >
                {index + 1}
              </span>
              <span 
                className="px-2 py-1 rounded-md text-xs font-bold"
                style={getROIStyle(city.cashOnCash)}
              >
                {city.cashOnCash.toFixed(1)}% ROI
              </span>
            </div>

            {/* City Info */}
            <div className="mb-4">
              <div 
                className="font-semibold text-base truncate"
                style={{ color: '#ffffff' }}
              >
                {city.name}
              </div>
              <div className="text-xs truncate" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {city.county}, {city.stateCode}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs mb-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Home Price
                </div>
                <div className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                  {formatCurrency(city.medianHomeValue)}
                </div>
              </div>
              <div>
                <div className="text-xs mb-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Monthly Rev
                </div>
                <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                  {formatCurrency(city.strMonthlyRevenue)}
                </div>
              </div>
            </div>

            {/* Grade Badge */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Market Grade
                </span>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ 
                    backgroundColor: city.grade.startsWith('A') ? '#2b2823' : '#787060',
                    color: '#ffffff'
                  }}
                >
                  {city.grade}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          Showing markets with 8%+ cash-on-cash return and home prices under $350K
        </p>
        <Link 
          href="/search?sort=cashOnCash" 
          className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: '#4ade80' }}
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
