"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCityById } from "@/data/helpers";

export default function CityPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [isSaved, setIsSaved] = useState(false);

  const city = getCityById(id);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedCities") || "[]");
    setIsSaved(saved.includes(city?.id));
  }, [city?.id]);

  const toggleSave = () => {
    const saved = JSON.parse(localStorage.getItem("savedCities") || "[]");
    let updated;
    if (isSaved) {
      updated = saved.filter((cid: string) => cid !== city?.id);
    } else {
      updated = [...saved, city?.id];
    }
    localStorage.setItem("savedCities", JSON.stringify(updated));
    setIsSaved(!isSaved);
  };

  const handleShare = () => {
    const text = `Check out ${city?.name}, ${city?.stateCode} on Edge by Teeco!\n\nGrade: ${city?.grade}\nScore: ${city?.marketScore}/100\nMonthly Revenue: $${city?.strMonthlyRevenue.toLocaleString()}\nMedian Price: $${city?.medianHomeValue.toLocaleString()}\n\n${window.location.href}`;
    
    if (navigator.share) {
      navigator.share({ title: `${city?.name} STR Analysis`, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      alert("Analysis copied to clipboard!");
    }
  };

  if (!city) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏙️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">City not found</h1>
          <Link href="/" className="text-teal-600 font-medium hover:text-teal-700">
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

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

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return { text: 'STRONG BUY', emoji: '🚀' };
      case 'buy': return { text: 'BUY', emoji: '✅' };
      case 'hold': return { text: 'HOLD', emoji: '⚠️' };
      case 'caution': return { text: 'CAUTION', emoji: '⚠️' };
      default: return { text: 'AVOID', emoji: '❌' };
    }
  };

  const verdictInfo = getVerdictText(city.verdict);

  // Find best bedroom size
  const incomeBySize = city.incomeBySize || { "1BR": 2000, "2BR": 2800, "3BR": 3500, "4BR": 4200, "5BR": 4800, "6BR+": 5500 };
  const bestSize = Object.entries(incomeBySize).reduce((a, b) => a[1] > b[1] ? a : b);

  // Top amenity
  const amenities = city.amenityDelta || [
    { name: "Hot Tub", boost: 22, priority: "MUST HAVE" },
    { name: "Pool", boost: 18, priority: "HIGH IMPACT" },
    { name: "Game Room", boost: 15, priority: "HIGH IMPACT" },
    { name: "Fire Pit", boost: 12, priority: "NICE TO HAVE" },
    { name: "EV Charger", boost: 8, priority: "NICE TO HAVE" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href={`/state/${city.stateCode.toLowerCase()}`} className="inline-flex items-center gap-1 text-teal-200 text-sm hover:text-white mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {city.stateCode}
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{city.name}</h1>
              <p className="text-teal-200">{city.county}, {city.stateCode}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getGradeColor(city.grade)}`}>
                  {verdictInfo.text}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                  city.regulation === "Legal" ? "bg-emerald-500" : "bg-amber-500"
                }`}>
                  {city.regulation}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                title="Share Analysis"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={toggleSave}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                aria-label={isSaved ? "Remove from saved" : "Save city"}
              >
                <span className="text-xl">{isSaved ? "❤️" : "🤍"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Overall Grade & Score */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">STR Investment Grade</h3>
            <span className="text-sm text-slate-500">Transparent Scoring</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-4 sm:flex-col sm:text-center">
              <div className={`w-20 h-20 ${getGradeColor(city.grade)} rounded-2xl flex flex-col items-center justify-center text-white shadow-lg`}>
                <div className="text-3xl font-bold">{city.grade}</div>
              </div>
              <div className="sm:mt-2">
                <div className="text-2xl font-bold text-slate-900">{city.marketScore}/100</div>
                <div className="text-sm text-slate-500">{verdictInfo.emoji} {verdictInfo.text}</div>
              </div>
            </div>
            
            {/* Transparent Score Breakdown */}
            <div className="flex-1 space-y-3 w-full">
              <div className="text-sm font-medium text-slate-700 mb-2">Score Breakdown</div>
              
              {/* Cash-on-Cash */}
              <div className="flex items-center gap-3">
                <span className="text-sm">💰</span>
                <span className="text-sm text-slate-600 w-32">Cash-on-Cash</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(city.scoring.cashOnCash.score / 35) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-12 text-right">{city.scoring.cashOnCash.score}/35</span>
              </div>
              
              {/* Affordability */}
              <div className="flex items-center gap-3">
                <span className="text-sm">🏠</span>
                <span className="text-sm text-slate-600 w-32">Affordability</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(city.scoring.affordability.score / 25) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-12 text-right">{city.scoring.affordability.score}/25</span>
              </div>
              
              {/* Legality */}
              <div className="flex items-center gap-3">
                <span className="text-sm">⚖️</span>
                <span className="text-sm text-slate-600 w-32">STR Legality</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(city.scoring.legality.score / 15) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-12 text-right">{city.scoring.legality.score}/15</span>
              </div>
              
              {/* Landlord Friendly */}
              <div className="flex items-center gap-3">
                <span className="text-sm">🤝</span>
                <span className="text-sm text-slate-600 w-32">Landlord Friendly</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(city.scoring.landlordFriendly.score / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-12 text-right">{city.scoring.landlordFriendly.score}/10</span>
              </div>
              
              {/* Market Headroom */}
              <div className="flex items-center gap-3">
                <span className="text-sm">📊</span>
                <span className="text-sm text-slate-600 w-32">Market Headroom</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${(city.scoring.marketHeadroom.score / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-12 text-right">{city.scoring.marketHeadroom.score}/10</span>
              </div>
              
              {/* Appreciation */}
              <div className="flex items-center gap-3">
                <span className="text-sm">📈</span>
                <span className="text-sm text-slate-600 w-32">Appreciation</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${(city.scoring.appreciation.score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-12 text-right">{city.scoring.appreciation.score}/5</span>
              </div>
            </div>
          </div>
          
          {/* Score Details */}
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">Cash-on-Cash</div>
              <div className="font-semibold text-slate-900">{city.scoring.cashOnCash.value.toFixed(1)}%</div>
              <div className="text-xs text-slate-400">{city.scoring.cashOnCash.rating}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">Median Home</div>
              <div className="font-semibold text-slate-900">${(city.medianHomeValue / 1000).toFixed(0)}K</div>
              <div className="text-xs text-slate-400">{city.scoring.affordability.rating}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">Headroom</div>
              <div className="font-semibold text-slate-900">{city.scoring.marketHeadroom.score}/10</div>
              <div className="text-xs text-slate-400">{city.scoring.marketHeadroom.rating}</div>
            </div>
          </div>
        </div>

        {/* Will This Deal Work? */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-card">
          <h3 className="font-semibold text-slate-900 mb-4">Will This Deal Work?</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Grade Gauge */}
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-sm text-slate-500 mb-2">Investment Grade</div>
              <div className={`text-4xl font-bold text-white rounded-xl py-3 ${getGradeColor(city.grade)} shadow-sm`}>
                {city.grade}
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-2">{city.scoring.cashOnCash.rating}</div>
              <div className="text-xs text-slate-400 mt-1">CoC: {city.scoring.cashOnCash.value.toFixed(1)}%</div>
            </div>

            {/* DSI Gauge */}
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-sm text-slate-500 mb-2">Can You Pay the Bills?</div>
              <div className={`text-4xl font-bold text-white rounded-xl py-3 ${city.dsi ? "bg-emerald-500" : "bg-red-500"} shadow-sm`}>
                {city.dsi ? "✓" : "✗"}
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-2">{city.dsi ? "YES" : "Risky"}</div>
              <div className="text-xs text-slate-400 mt-1">{city.dsi ? "Income covers mortgage" : "May struggle with payments"}</div>
            </div>
          </div>

          {/* Bottom Line */}
          <div className={`rounded-xl p-4 ${
            city.grade === 'A+' || city.grade === 'A' ? "bg-emerald-50 border border-emerald-200" :
            city.grade === 'B+' || city.grade === 'B' ? "bg-teal-50 border border-teal-200" :
            city.grade === 'C' ? "bg-amber-50 border border-amber-200" :
            "bg-red-50 border border-red-200"
          }`}>
            <div className="font-semibold text-slate-900 mb-1">THE BOTTOM LINE {verdictInfo.emoji}</div>
            <p className="text-sm text-slate-600">
              {city.grade === 'A+' || city.grade === 'A'
                ? "Excellent opportunity! Strong cash flow potential with favorable market conditions."
                : city.grade === 'B+' || city.grade === 'B'
                ? "Good opportunity. Solid fundamentals but may require careful property selection."
                : city.grade === 'C'
                ? "Marginal opportunity. Returns may be limited - consider negotiating or other markets."
                : city.grade === 'D'
                ? "Below average. Significant challenges may impact profitability."
                : "Not recommended. High risk factors outweigh potential returns."}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Avg ADR", value: `$${city.avgADR}`, icon: "💵" },
            { label: "Occupancy", value: `${city.occupancy}%`, icon: "📅" },
            { label: "Monthly Revenue", value: `$${city.strMonthlyRevenue.toLocaleString()}`, icon: "💰", highlight: true },
            { label: "Median Price", value: `$${(city.medianHomeValue / 1000).toFixed(0)}K`, icon: "🏠" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className={`font-bold text-lg ${stat.highlight ? "text-emerald-600" : "text-slate-900"}`}>{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Income by Property Size */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-card">
          <h3 className="font-semibold text-slate-900 mb-1">📊 Income by Property Size</h3>
          <p className="text-sm text-slate-500 mb-4">Monthly revenue estimates by bedroom count</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(incomeBySize).map(([size, income]) => (
              <div
                key={size}
                className={`text-center p-3 rounded-xl transition-all ${
                  size === bestSize[0] 
                    ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm" 
                    : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="text-sm font-semibold text-slate-700">{size}</div>
                <div className={`font-bold ${size === bestSize[0] ? "text-emerald-600" : "text-slate-900"}`}>
                  ${income.toLocaleString()}
                </div>
                {size === bestSize[0] && <div className="text-xs text-emerald-600 font-medium">⭐ Best</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Amenity Recommendations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-card">
          <h3 className="font-semibold text-slate-900 mb-1">🏠 Top Amenities for This Market</h3>
          <p className="text-sm text-slate-500 mb-4">Add these to boost your revenue</p>
          <div className="space-y-2">
            {amenities.map((amenity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${
                    amenity.priority === "MUST HAVE" ? "bg-emerald-500" :
                    amenity.priority === "HIGH IMPACT" ? "bg-blue-500" : "bg-slate-400"
                  }`}>
                    {amenity.priority}
                  </span>
                  <span className="font-medium text-slate-700">{amenity.name}</span>
                </div>
                <span className="text-emerald-600 font-bold">+{amenity.boost}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Next Steps */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-teal-800 mb-4">🎯 Your Next Steps</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">1</span>
              <div>
                <div className="font-semibold text-slate-900">Search for {bestSize[0]} properties</div>
                <div className="text-sm text-slate-500">Best income potential at ${bestSize[1].toLocaleString()}/month</div>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">2</span>
              <div>
                <div className="font-semibold text-slate-900">Add a {amenities[0]?.name}</div>
                <div className="text-sm text-slate-500">Boost revenue by +{amenities[0]?.boost}%</div>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">3</span>
              <div>
                <div className="font-semibold text-slate-900">Target ${Math.round(city.strMonthlyRevenue * 1.25).toLocaleString()}/month</div>
                <div className="text-sm text-slate-500">Top 25% performer income goal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Regulation Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-card">
          <h3 className="font-semibold text-slate-900 mb-3">📋 Regulation Status</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${
              city.regulation === "Legal" ? "bg-emerald-500" : "bg-amber-500"
            }`}>
              {city.regulation}
            </span>
            <span className="text-sm text-slate-500">({city.scoring.legality.rating})</span>
          </div>
          <p className="text-sm text-slate-500">
            {city.regulation === "Legal"
              ? "Short-term rentals are allowed in this area. Always verify local ordinances before purchasing."
              : "Some restrictions apply. Research local permit requirements and zoning laws carefully."}
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-center text-white">
          <h3 className="font-semibold text-lg mb-2">Ready to Invest?</h3>
          <p className="text-teal-100 text-sm mb-4">
            Get personalized guidance from our STR mentorship program.
          </p>
          <Link
            href="https://teeco.co/fund-your-financial-freedom"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-white hover:bg-slate-100 text-teal-700 rounded-xl font-semibold transition-colors shadow-lg"
          >
            Explore Funding Options
          </Link>
        </div>
      </div>
    </div>
  );
}
