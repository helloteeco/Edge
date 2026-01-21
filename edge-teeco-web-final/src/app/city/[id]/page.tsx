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
    const text = `Check out ${city?.name}, ${city?.stateCode} on Edge by Teeco!\n\nMarket Score: ${city?.marketScore}/100\nDeal Grade: ${getRPRGrade(city?.rpr || 0).grade}\nMonthly Revenue: $${city?.strMonthlyRevenue.toLocaleString()}\nMedian Price: $${city?.medianHomeValue.toLocaleString()}\n\n${window.location.href}`;
    
    if (navigator.share) {
      navigator.share({ title: `${city?.name} STR Analysis`, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      alert("Analysis copied to clipboard!");
    }
  };

  if (!city) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
        <h1 className="text-2xl font-bold">City not found</h1>
        <Link href="/" className="text-primary mt-4 inline-block">← Back to Map</Link>
      </div>
    );
  }

  const getVerdict = (score: number) => {
    if (score >= 80) return { text: "STRONG BUY", color: "bg-emerald-600", emoji: "🚀" };
    if (score >= 70) return { text: "BUY", color: "bg-emerald-500", emoji: "✅" };
    if (score >= 60) return { text: "HOLD", color: "bg-yellow-500", emoji: "⚠️" };
    return { text: "AVOID", color: "bg-red-500", emoji: "❌" };
  };

  const getRPRGrade = (rpr: number) => {
    if (rpr >= 0.20) return { grade: "A+", color: "bg-emerald-600", label: "GREAT DEAL" };
    if (rpr >= 0.18) return { grade: "A", color: "bg-emerald-500", label: "GREAT DEAL" };
    if (rpr >= 0.15) return { grade: "B+", color: "bg-emerald-400", label: "GOOD DEAL" };
    if (rpr >= 0.12) return { grade: "C", color: "bg-yellow-500", label: "OKAY DEAL" };
    return { grade: "F", color: "bg-red-500", label: "BAD DEAL" };
  };

  const verdict = getVerdict(city.marketScore);
  const rprGrade = getRPRGrade(city.rpr);

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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href={`/state/${city.stateCode.toLowerCase()}`} className="text-muted text-sm hover:text-primary mb-2 inline-block">
            ← Back to {city.stateCode}
          </Link>
          <h1 className="text-2xl font-bold">{city.name}</h1>
          <p className="text-muted">{city.county}, {city.stateCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 text-xl hover:scale-110 transition-transform"
            title="Share Analysis"
          >
            📤
          </button>
          <button
            onClick={toggleSave}
            className="p-2 text-2xl hover:scale-110 transition-transform"
          >
            {isSaved ? "❤️" : "🤍"}
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-white border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">STR Opportunity Score</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${verdict.color}`}>
            {verdict.text}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{city.marketScore}</div>
            <div className="text-sm text-muted">/100</div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: "Demand", value: city.scores.demand },
              { label: "Affordability", value: city.scores.affordability },
              { label: "Regulation", value: city.scores.regulation },
              { label: "Seasonality", value: city.scores.seasonality },
              { label: "Saturation", value: city.scores.saturation },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs text-muted w-20 flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-0">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-6 flex-shrink-0">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Will This Deal Work? */}
      <div className="bg-white border border-border rounded-xl p-4 mb-4">
        <h3 className="font-semibold mb-4">Will This Deal Work?</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* RPR Gauge */}
          <div className="text-center p-4 bg-surface rounded-xl">
            <div className="text-sm text-muted mb-1">Money You Make vs. Price You Pay</div>
            <div className={`text-3xl font-bold text-white rounded-lg py-2 ${rprGrade.color}`}>
              {rprGrade.grade}
            </div>
            <div className="text-xs text-muted mt-2">{rprGrade.label}</div>
            <div className="text-xs text-muted">RPR: {(city.rpr * 100).toFixed(1)}%</div>
          </div>

          {/* DSI Gauge */}
          <div className="text-center p-4 bg-surface rounded-xl">
            <div className="text-sm text-muted mb-1">Can You Pay the Bills?</div>
            <div className={`text-3xl font-bold text-white rounded-lg py-2 ${city.dsi ? "bg-emerald-600" : "bg-red-500"}`}>
              {city.dsi ? "✓" : "✗"}
            </div>
            <div className="text-xs text-muted mt-2">{city.dsi ? "YES" : "Risky"}</div>
            <div className="text-xs text-muted">{city.dsi ? "Income covers mortgage" : "May struggle with payments"}</div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className={`rounded-xl p-4 ${city.dsi && city.rpr >= 0.15 ? "bg-emerald-50 border border-emerald-200" : city.dsi ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"}`}>
          <div className="font-semibold mb-1">THE BOTTOM LINE {verdict.emoji}</div>
          <p className="text-sm">
            {city.dsi && city.rpr >= 0.18
              ? "This is a great deal! You'll make good money and easily pay your bills."
              : city.dsi && city.rpr >= 0.15
              ? "Good deal! You'll make decent money and cover your expenses."
              : city.dsi && city.rpr >= 0.12
              ? "Okay deal. It pays the bills but returns could be better."
              : !city.dsi
              ? "Skip this one. You might struggle to cover your expenses."
              : "Marginal deal. Consider negotiating a lower price."}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Avg ADR</div>
          <div className="font-semibold text-lg">${city.avgADR}</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Occupancy</div>
          <div className="font-semibold text-lg">{city.occupancy}%</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Monthly Revenue</div>
          <div className="font-semibold text-lg text-emerald-600">${city.strMonthlyRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <div className="text-xs text-muted">Median Price</div>
          <div className="font-semibold text-lg">${(city.medianHomeValue / 1000).toFixed(0)}K</div>
        </div>
      </div>

      {/* Income by Property Size */}
      <div className="bg-white border border-border rounded-xl p-4 mb-4">
        <h3 className="font-semibold mb-3">📊 Income by Property Size</h3>
        <p className="text-sm text-muted mb-3">Monthly revenue estimates by bedroom count</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(incomeBySize).map(([size, income]) => (
            <div
              key={size}
              className={`text-center p-3 rounded-xl ${size === bestSize[0] ? "bg-emerald-100 border-2 border-emerald-500" : "bg-surface"}`}
            >
              <div className="text-sm font-medium">{size}</div>
              <div className={`font-semibold ${size === bestSize[0] ? "text-emerald-600" : ""}`}>
                ${income.toLocaleString()}
              </div>
              {size === bestSize[0] && <div className="text-xs text-emerald-600">⭐ Best</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Amenity Recommendations */}
      <div className="bg-white border border-border rounded-xl p-4 mb-4">
        <h3 className="font-semibold mb-3">🏠 Top Amenities for This Market</h3>
        <p className="text-sm text-muted mb-3">Add these to boost your revenue</p>
        <div className="space-y-2">
          {amenities.map((amenity, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-surface rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                  amenity.priority === "MUST HAVE" ? "bg-emerald-600" :
                  amenity.priority === "HIGH IMPACT" ? "bg-blue-500" : "bg-gray-500"
                }`}>
                  {amenity.priority}
                </span>
                <span className="font-medium">{amenity.name}</span>
              </div>
              <span className="text-emerald-600 font-semibold">+{amenity.boost}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Saturation Risk */}
      <div className="bg-white border border-border rounded-xl p-4 mb-4">
        <h3 className="font-semibold mb-3">📈 Market Saturation</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted">Competition Level</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
            city.saturation < 30 ? "bg-emerald-600" :
            city.saturation < 50 ? "bg-yellow-500" :
            city.saturation < 70 ? "bg-orange-500" : "bg-red-500"
          }`}>
            {city.saturation < 30 ? "LOW" :
             city.saturation < 50 ? "MODERATE" :
             city.saturation < 70 ? "HIGH" : "VERY HIGH"}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              city.saturation < 30 ? "bg-emerald-500" :
              city.saturation < 50 ? "bg-yellow-500" :
              city.saturation < 70 ? "bg-orange-500" : "bg-red-500"
            }`}
            style={{ width: `${city.saturation}%` }}
          />
        </div>
        <p className="text-sm text-muted mt-2">
          {city.saturation < 30
            ? "Low competition - great opportunity to enter this market!"
            : city.saturation < 50
            ? "Moderate competition - room for well-positioned properties."
            : city.saturation < 70
            ? "High competition - focus on unique amenities to stand out."
            : "Very high competition - consider other markets."}
        </p>
      </div>

      {/* Your Next Steps */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-primary mb-3">🎯 Your Next Steps</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <div className="font-medium">Search for {bestSize[0]} properties</div>
              <div className="text-sm text-muted">Best income potential at ${bestSize[1].toLocaleString()}/month</div>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <div className="font-medium">Add a {amenities[0]?.name}</div>
              <div className="text-sm text-muted">Boost revenue by +{amenities[0]?.boost}%</div>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <div className="font-medium">Target ${Math.round(city.strMonthlyRevenue * 1.25).toLocaleString()}/month</div>
              <div className="text-sm text-muted">Top 25% performer income goal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Regulation Info */}
      <div className="bg-white border border-border rounded-xl p-4 mb-4">
        <h3 className="font-semibold mb-2">📋 Regulation Status</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
            city.regulation === "Legal" ? "bg-emerald-600" : "bg-yellow-600"
          }`}>
            {city.regulation}
          </span>
        </div>
        <p className="text-sm text-muted">
          {city.regulation === "Legal"
            ? "Short-term rentals are allowed in this area. Always verify local ordinances before purchasing."
            : "Some restrictions apply. Research local permit requirements and zoning laws carefully."}
        </p>
      </div>

      {/* CTA */}
      <div className="bg-surface rounded-xl p-6 text-center">
        <h3 className="font-semibold mb-2">Ready to Invest?</h3>
        <p className="text-sm text-muted mb-4">
          Get personalized guidance from our STR mentorship program.
        </p>
        <Link
          href="/funding"
          className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
        >
          Explore Funding Options
        </Link>
      </div>
    </div>
  );
}
