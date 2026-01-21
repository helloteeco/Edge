"use client";

import Link from "next/link";
import { cityData } from "@/data/helpers";

export function TopMarkets() {
  const topCities = [...cityData]
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, 10);

  const getRPRGrade = (rpr: number) => {
    if (rpr >= 0.20) return { grade: "A+", color: "bg-emerald-500", bgLight: "bg-emerald-50" };
    if (rpr >= 0.18) return { grade: "A", color: "bg-emerald-500", bgLight: "bg-emerald-50" };
    if (rpr >= 0.15) return { grade: "B+", color: "bg-green-500", bgLight: "bg-green-50" };
    if (rpr >= 0.12) return { grade: "C", color: "bg-amber-500", bgLight: "bg-amber-50" };
    return { grade: "F", color: "bg-red-500", bgLight: "bg-red-50" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Top 10 Markets</h2>
          <p className="text-sm text-slate-500">Highest STR opportunity scores nationwide</p>
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
        {topCities.map((city, index) => {
          const grade = getRPRGrade(city.rpr);
          return (
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
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold text-white ${grade.color}`}>
                  {grade.grade}
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
          );
        })}
      </div>
    </div>
  );
}
