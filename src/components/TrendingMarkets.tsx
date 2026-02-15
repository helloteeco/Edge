"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCityById } from "@/data/helpers";

interface TrendingMarket {
  market_id: string;
  market_type: string;
  save_count: number;
}

export function TrendingMarkets() {
  const [trending, setTrending] = useState<TrendingMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market-saves?action=top&limit=8&marketType=city')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.markets) {
          // Filter to only markets with at least 1 like
          setTrending(data.markets.filter((m: TrendingMarket) => m.save_count > 0));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Don't render if no trending markets yet
  if (!loading && trending.length === 0) return null;

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

  return (
    <div 
      className="mt-8 rounded-2xl p-5 sm:p-6 space-y-5"
      style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #d8d6cd',
        boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
      }}
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" className="flex-shrink-0">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <h2 
            className="text-xl sm:text-2xl font-semibold"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Trending Markets
          </h2>
        </div>
        <p className="text-sm" style={{ color: '#787060' }}>
          Most liked by investors this week
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className="rounded-xl p-4 animate-pulse"
              style={{ backgroundColor: '#f5f4f0', height: '120px' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trending.map((market, index) => {
            const city = getCityById(market.market_id);
            if (!city) return null;
            
            return (
              <Link
                key={market.market_id}
                href={`/city/${market.market_id}`}
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
                {/* Top row: rank + grade + likes */}
                <div className="flex items-center justify-between mb-3">
                  <span 
                    className="px-2 py-0.5 rounded-md text-xs font-bold"
                    style={getGradeStyle(city.grade)}
                  >
                    {city.grade}
                  </span>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                      {market.save_count}
                    </span>
                  </div>
                </div>
                
                {/* City Info */}
                <div className="mb-2">
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
                
                {/* Revenue */}
                <div className="flex items-end justify-between">
                  <div>
                    <div 
                      className="text-base font-bold"
                      style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      ${city.strMonthlyRevenue.toLocaleString()}
                    </div>
                    <div 
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: '#787060' }}
                    >
                      /mo rev
                    </div>
                  </div>
                  <svg 
                    className="w-4 h-4 transition-colors" 
                    style={{ color: '#d8d6cd' }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
