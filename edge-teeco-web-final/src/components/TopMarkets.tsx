"use client";

import Link from "next/link";
import { cityData } from "@/data/helpers";

export function TopMarkets() {
  const topCities = [...cityData]
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, 10);

  const getRPRGrade = (rpr: number) => {
    if (rpr >= 0.20) return { grade: "A+", color: "bg-emerald-600" };
    if (rpr >= 0.18) return { grade: "A", color: "bg-emerald-500" };
    if (rpr >= 0.15) return { grade: "B+", color: "bg-emerald-400" };
    if (rpr >= 0.12) return { grade: "C", color: "bg-yellow-500" };
    return { grade: "F", color: "bg-red-500" };
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Top 10 Markets</h2>
        <p className="text-sm text-muted">Highest STR opportunity scores</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {topCities.map((city, index) => (
          <Link
            key={city.id}
            href={`/city/${city.id}`}
            className="bg-white border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="text-xs text-muted mb-1">#{index + 1}</div>
            <div className="font-medium text-sm truncate">{city.name}</div>
            <div className="text-xs text-muted truncate">{city.county}, {city.stateCode}</div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-lg font-bold text-primary">{city.marketScore}</div>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${getRPRGrade(city.rpr).color}`}>
                {getRPRGrade(city.rpr).grade}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
