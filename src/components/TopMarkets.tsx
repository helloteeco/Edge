"use client";

import Link from "next/link";
import { cityData } from "@/data/helpers";

export function TopMarkets() {
  const topCities = [...cityData]
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, 10);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-emerald-500';
      case 'A': return 'bg-emerald-400';
      case 'B+': return 'bg-teal-500';
      case 'B': return 'bg-teal-400';
      case 'C': return 'bg-amber-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 75) return "text-emerald-500";
    if (score >= 65) return "text-teal-600";
    if (score >= 55) return "text-teal-500";
    if (score >= 45) return "text-amber-600";
    if (score >= 35) return "text-orange-500";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Top 10 Markets</h2>
          <p className="text-sm text-slate-500">Highest STR investment grades nationwide</p>
        </div>
        <Link 
          href="/search" 
          className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
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
            className="group bg-white border border-slate-200 rounded-xl p-3 sm:p-4 hover:shadow-lg hover:border-slate-300 transition-all duration-200"
          >
            {/* Rank Badge */}
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                index < 3 ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {index + 1}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold text-white ${getGradeColor(city.grade)}`}>
                {city.grade}
              </span>
            </div>
            
            {/* City Info */}
            <div className="mb-3">
              <div className="font-semibold text-slate-900 text-sm truncate group-hover:text-teal-600 transition-colors">
                {city.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {city.county}, {city.stateCode}
              </div>
            </div>
            
            {/* Score */}
            <div className="flex items-end justify-between">
              <div>
                <div className={`text-2xl font-bold ${getScoreColor(city.marketScore)}`}>
                  {city.marketScore}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Score</div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Scoring Explanation */}
      <div className="bg-slate-50 rounded-xl p-4 text-sm">
        <div className="font-medium text-slate-700 mb-2">How We Score Markets</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
          <div>💰 Cash-on-Cash: 35pts</div>
          <div>🏠 Affordability: 25pts</div>
          <div>⚖️ STR Legality: 15pts</div>
          <div>🤝 Landlord Friendly: 10pts</div>
          <div>📊 Low Saturation: 10pts</div>
          <div>📈 Appreciation: 5pts</div>
        </div>
      </div>
    </div>
  );
}
