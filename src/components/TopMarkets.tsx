"use client";

import Link from "next/link";
import { cityData } from "@/data/helpers";

export function TopMarkets() {
  const topCities = [...cityData]
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, 10);

  // Grade colors using Teeco brand palette
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A+': return { backgroundColor: '#000000', color: '#ffffff' };
      case 'A': return { backgroundColor: '#2b2823', color: '#ffffff' };
      case 'B+': return { backgroundColor: '#3d3a34', color: '#ffffff' };
      case 'B': return { backgroundColor: '#787060', color: '#ffffff' };
      case 'C': return { backgroundColor: '#d8d6cd', color: '#2b2823' };
      case 'D': return { backgroundColor: '#e5e3da', color: '#787060', border: '1px solid #d8d6cd' };
      default: return { backgroundColor: '#e5e3da', color: '#787060', border: '1px dashed #787060' };
    }
  };

  const getScoreStyle = (score: number) => {
    if (score >= 85) return { color: '#000000' };
    if (score >= 75) return { color: '#2b2823' };
    if (score >= 65) return { color: '#3d3a34' };
    if (score >= 55) return { color: '#787060' };
    return { color: '#9a9488' };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 
            className="text-xl sm:text-2xl font-semibold mb-1"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Top 10 Markets
          </h2>
          <p className="text-sm" style={{ color: '#787060' }}>
            Highest STR investment grades nationwide
          </p>
        </div>
        <Link 
          href="/search" 
          className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: '#2b2823' }}
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {topCities.map((city, index) => (
          <Link
            key={city.id}
            href={`/city/${city.id}`}
            className="group rounded-xl p-4 transition-all duration-300"
            style={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #d8d6cd',
              boxShadow: '0 1px 2px 0 rgba(43, 40, 35, 0.04)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(43, 40, 35, 0.12)';
              e.currentTarget.style.borderColor = '#787060';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(43, 40, 35, 0.04)';
              e.currentTarget.style.borderColor = '#d8d6cd';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Rank Badge */}
            <div className="flex items-center justify-between mb-3">
              <span 
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                style={{ 
                  backgroundColor: index < 3 ? '#2b2823' : '#e5e3da',
                  color: index < 3 ? '#ffffff' : '#787060'
                }}
              >
                {index + 1}
              </span>
              <span 
                className="px-2 py-0.5 rounded-md text-xs font-bold"
                style={getGradeStyle(city.grade)}
              >
                {city.grade}
              </span>
            </div>
            
            {/* City Info */}
            <div className="mb-3">
              <div 
                className="font-semibold text-sm truncate transition-colors"
                style={{ color: '#2b2823' }}
              >
                {city.name}
              </div>
              <div className="text-xs truncate" style={{ color: '#787060' }}>
                {city.county}, {city.stateCode}
              </div>
            </div>
            
            {/* Score */}
            <div className="flex items-end justify-between">
              <div>
                <div 
                  className="text-2xl font-bold"
                  style={{ 
                    ...getScoreStyle(city.marketScore),
                    fontFamily: 'Source Serif Pro, Georgia, serif'
                  }}
                >
                  {city.marketScore}
                </div>
                <div 
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: '#787060' }}
                >
                  Score
                </div>
              </div>
              <svg 
                className="w-5 h-5 transition-colors" 
                style={{ color: '#d8d6cd' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Scoring Explanation */}
      <div 
        className="rounded-xl p-5 text-sm"
        style={{ backgroundColor: 'rgba(43, 40, 35, 0.03)', border: '1px solid #d8d6cd' }}
      >
        <div 
          className="font-semibold mb-3"
          style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
        >
          How We Score Markets
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs" style={{ color: '#787060' }}>
          <div className="flex flex-col">
            <span>💰 Cash-on-Cash</span>
            <strong style={{ color: '#2b2823' }}>35 pts</strong>
            <span className="text-[10px]">Money you make back</span>
          </div>
          <div className="flex flex-col">
            <span>🏠 Affordability</span>
            <strong style={{ color: '#2b2823' }}>25 pts</strong>
            <span className="text-[10px]">Can you afford it?</span>
          </div>
          <div className="flex flex-col">
            <span>📅 Year-Round Income</span>
            <strong style={{ color: '#2b2823' }}>15 pts</strong>
            <span className="text-[10px]">Money in slow months?</span>
          </div>
          <div className="flex flex-col">
            <span>🤝 Landlord Friendly</span>
            <strong style={{ color: '#2b2823' }}>10 pts</strong>
            <span className="text-[10px]">Laws on your side?</span>
          </div>
          <div className="flex flex-col">
            <span>📈 Room to Grow</span>
            <strong style={{ color: '#2b2823' }}>15 pts</strong>
            <span className="text-[10px]">Space for more rentals?</span>
          </div>
        </div>
        <p className="text-xs mt-3 pt-3" style={{ color: '#9a9080', borderTop: '1px solid #e5e3da' }}>
          This score helps you filter markets - it does not replace checking the actual deal.
        </p>
      </div>
    </div>
  );
}
