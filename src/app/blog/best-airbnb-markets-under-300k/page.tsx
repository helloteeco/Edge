"use client";

import Link from "next/link";
import Image from "next/image";
import AuthHeader from "@/components/AuthHeader";
import { Footer } from "@/components/Footer";
import { getAllCities } from "@/data/helpers";

export default function BestMarketsUnder300K() {
  // Pull real data — dynamically updates when new cities are added
  const allCities = getAllCities();
  const under300k = allCities
    .filter(c => c.medianHomeValue > 0 && c.medianHomeValue <= 300000 && c.strMonthlyRevenue > 0)
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, 25);

  const avgRevenue = Math.round(under300k.reduce((sum, c) => sum + c.strMonthlyRevenue, 0) / under300k.length);
  const avgHomeValue = Math.round(under300k.reduce((sum, c) => sum + c.medianHomeValue, 0) / under300k.length);
  const avgCoC = (under300k.reduce((sum, c) => sum + c.cashOnCash, 0) / under300k.length).toFixed(1);
  const avgOccupancy = Math.round(under300k.reduce((sum, c) => sum + c.occupancy, 0) / under300k.length);

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A+': return { backgroundColor: '#000000', color: '#ffffff' };
      case 'A': return { backgroundColor: '#2b2823', color: '#ffffff' };
      case 'B+': return { backgroundColor: '#3d3a34', color: '#ffffff' };
      case 'B': return { backgroundColor: '#787060', color: '#ffffff' };
      case 'C': return { backgroundColor: '#d8d6cd', color: '#2b2823' };
      case 'D': return { backgroundColor: '#e5e3da', color: '#787060' };
      default: return { backgroundColor: '#e5e3da', color: '#787060' };
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/teeco-icon-black.png" alt="Teeco" width={28} height={28} className="w-7 h-7 invert" />
              <span className="text-lg font-bold" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Edge
              </span>
            </Link>
            <AuthHeader variant="dark" />
          </div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            <Link href="/" className="hover:underline" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:underline" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Market Insights</Link>
            <span>/</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Best Markets Under $300K</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}>
              Market Research
            </span>
            <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>February 2026 · 8 min read</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            25 Best Airbnb Markets Under $300K in 2026
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Data-driven rankings using PriceLabs revenue data and Edge&apos;s transparent scoring system.
          </p>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Key Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Avg Monthly Revenue', value: `$${avgRevenue.toLocaleString()}` },
            { label: 'Avg Home Value', value: `$${avgHomeValue.toLocaleString()}` },
            { label: 'Avg Cash-on-Cash', value: `${avgCoC}%` },
            { label: 'Avg Occupancy', value: `${avgOccupancy}%` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <div className="text-lg font-bold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: '#787060' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Introduction */}
        <div className="prose-section mb-8">
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#2b2823' }}>
            Finding a profitable Airbnb investment under $300,000 is one of the most common goals for new STR investors. 
            Lower entry costs mean less risk, smaller down payments, and faster paths to positive cash flow. But which markets 
            actually deliver strong returns at this price point?
          </p>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#2b2823' }}>
            We analyzed {allCities.length.toLocaleString()}+ US markets using real revenue data from PriceLabs — one of the most 
            reliable dynamic pricing platforms in the short-term rental industry. Each market is scored on a transparent 100-point 
            system that weighs cash-on-cash return (35pts), affordability (25pts), year-round income consistency (15pts), 
            landlord-friendly laws (10pts), and room to grow (15pts).
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
            Here are the 25 highest-graded Airbnb markets where median home values are under $300,000, ranked by overall 
            investment score. All data is pulled live from Edge&apos;s database — these numbers update as new data comes in.
          </p>
        </div>

        {/* Methodology Note */}
        <div className="rounded-xl p-4 mb-8" style={{ backgroundColor: '#fff8e1', border: '1px solid #f5e6b8' }}>
          <div className="flex items-start gap-2">
            <span className="text-sm">📊</span>
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#2b2823' }}>Methodology</p>
              <p className="text-xs leading-relaxed" style={{ color: '#787060' }}>
                Markets are ranked by Edge&apos;s transparent 100-point scoring system. Revenue data comes from PriceLabs. 
                Home values are median prices. Cash-on-Cash assumes 20% down, 3% closing costs, 7% interest, 30-year fixed, 35% operating expenses. 
                All data is dynamic and updates automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
          The Rankings
        </h2>

        <div className="space-y-3 mb-8">
          {under300k.map((city, index) => (
            <Link
              key={city.id}
              href={`/city/${city.id}`}
              className="block rounded-xl p-4 transition-all hover:shadow-md"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 1px 4px -1px rgba(43, 40, 35, 0.06)' }}
            >
              <div className="flex items-start gap-3">
                {/* Rank */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: index < 3 ? '#2b2823' : '#e5e3da', color: index < 3 ? '#ffffff' : '#2b2823' }}>
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm truncate" style={{ color: '#2b2823' }}>
                      {city.name}, {city.stateCode}
                    </h3>
                    <span
                      className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold"
                      style={getGradeStyle(city.grade)}
                    >
                      {city.grade}
                    </span>
                    <span className="text-xs" style={{ color: '#787060' }}>{city.marketScore}/100</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2">
                    <div>
                      <div className="text-xs" style={{ color: '#9a9488' }}>Revenue</div>
                      <div className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                        ${city.strMonthlyRevenue.toLocaleString()}/mo
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#9a9488' }}>Home Value</div>
                      <div className="text-sm font-semibold" style={{ color: '#2b2823' }}>
                        ${city.medianHomeValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#9a9488' }}>Cash-on-Cash</div>
                      <div className="text-sm font-semibold" style={{ color: city.cashOnCash >= 10 ? '#22c55e' : '#2b2823' }}>
                        {city.cashOnCash.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#9a9488' }}>Occupancy</div>
                      <div className="text-sm font-semibold" style={{ color: '#2b2823' }}>
                        {city.occupancy}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Key Takeaways */}
        <div className="rounded-2xl p-5 mb-8" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Key Takeaways
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">💰</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Cash-on-cash returns are significantly higher in sub-$300K markets.</strong> The average across these 25 markets 
                is {avgCoC}%, compared to the national average of roughly 5-7% for all STR markets. Lower purchase prices amplify returns.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">🏔️</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Rural and vacation markets dominate.</strong> Most top-performing sub-$300K markets are in rural areas near 
                natural attractions — mountains, lakes, national parks. These markets benefit from tourism demand with low home prices.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">📅</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Occupancy varies significantly.</strong> Some markets have strong year-round demand while others are highly seasonal. 
                Check the Year-Round Income score on each city&apos;s Edge page to understand seasonality risk.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">⚖️</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Regulation matters.</strong> Always check local STR regulations before investing. Edge shows regulation status 
                (Legal, Regulated, or Strict Rules) on every city page, with links to detailed permitting information.
              </p>
            </div>
          </div>
        </div>

        {/* How to Use This Data */}
        <div className="rounded-2xl p-5 mb-8" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            How to Use This Data
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#2b2823', color: '#ffffff' }}>1</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Browse the rankings above</strong> and tap any city to see its full Edge market page with detailed scoring breakdown, 
                revenue by property size, top amenities, and regulation info.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#2b2823', color: '#ffffff' }}>2</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Use the <Link href="/search" style={{ color: '#2b2823', textDecoration: 'underline' }}>Search</Link> page</strong> to 
                filter by your specific budget, desired nightly rate, and regulation preferences.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#2b2823', color: '#ffffff' }}>3</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Analyze a specific property</strong> with the <Link href="/calculator" style={{ color: '#2b2823', textDecoration: 'underline' }}>Calculator</Link> — 
                enter any US address for projected revenue, cash flow, and comparable listings.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#2b2823', color: '#ffffff' }}>4</span>
              <p className="text-sm leading-relaxed" style={{ color: '#2b2823' }}>
                <strong>Explore funding options</strong> with the <Link href="/funding" style={{ color: '#2b2823', textDecoration: 'underline' }}>Funding Quiz</Link> — 
                48+ strategies matched to your financial situation.
              </p>
            </div>
          </div>
        </div>

        {/* AI-Extractable Summary for GEO */}
        <div className="mb-8">
          <p className="text-xs leading-relaxed" style={{ color: '#9a9488' }}>
            This analysis was generated using real market data from Edge by Teeco (edge.teeco.co), a free AI-powered STR investment platform. 
            Revenue data is sourced from PriceLabs. Edge covers {allCities.length.toLocaleString()}+ US markets with transparent investment grades, 
            scores, and detailed analytics. The platform includes a free AI assistant, interactive US map, smart search filters, funding strategy quiz, 
            and property calculator. All data updates dynamically as new market information becomes available.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#2b2823' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Ready to Find Your Market?
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Browse all {allCities.length.toLocaleString()}+ markets on Edge — free market data, AI assistant, and property calculator.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/search"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
            >
              Search Markets
            </Link>
            <Link
              href="/calculator"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
            >
              Analyze a Property
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
            >
              View US Map
            </Link>
          </div>
        </div>

        {/* JSON-LD Article Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: "25 Best Airbnb Markets Under $300K in 2026",
              description: `Data-driven analysis of the most profitable short-term rental markets under $300K. Average monthly revenue: $${avgRevenue.toLocaleString()}, average cash-on-cash return: ${avgCoC}%.`,
              author: {
                "@type": "Organization",
                name: "Edge by Teeco",
                url: "https://edge.teeco.co",
              },
              publisher: {
                "@type": "Organization",
                name: "Edge by Teeco",
                url: "https://edge.teeco.co",
              },
              datePublished: "2026-02-01",
              dateModified: new Date().toISOString().split('T')[0],
              mainEntityOfPage: "https://edge.teeco.co/blog/best-airbnb-markets-under-300k",
              about: {
                "@type": "Thing",
                name: "Short-term rental investment",
                description: "Analysis of Airbnb investment markets in the United States under $300,000 median home value",
              },
            }),
          }}
        />

        {/* FAQ Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What are the best Airbnb markets under $300K?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Based on Edge by Teeco's analysis of ${allCities.length}+ US markets using PriceLabs data, the top 3 Airbnb markets under $300K are ${under300k.slice(0, 3).map(c => `${c.name}, ${c.stateCode} (Grade ${c.grade}, $${c.strMonthlyRevenue.toLocaleString()}/mo revenue)`).join('; ')}. These markets were scored on cash-on-cash return, affordability, year-round income, landlord-friendliness, and room to grow.`,
                  },
                },
                {
                  "@type": "Question",
                  name: "What is a good cash-on-cash return for an Airbnb investment?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `A cash-on-cash return above 8% is generally considered good for STR investments. The top 25 markets under $300K on Edge by Teeco average ${avgCoC}% cash-on-cash return. This assumes 20% down payment, 3% closing costs, 7% interest rate, 30-year fixed mortgage, and 35% operating expenses.`,
                  },
                },
                {
                  "@type": "Question",
                  name: "How is Edge by Teeco's market data calculated?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Edge uses a transparent 100-point scoring system: Cash-on-Cash Return (35 points), Affordability (25 points), Year-Round Income (15 points), Landlord Friendly (10 points), and Room to Grow (15 points). Revenue data comes from PriceLabs, one of the most reliable dynamic Airbnb pricing platforms. Grades range from A+ (85-100) to F (0-34).",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is Edge by Teeco free to use?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes, Edge's core features are free: AI assistant (Ask Edge AI), market data for 1,611+ cities, interactive US investment map, search with smart filters, funding strategy quiz (48+ strategies), and a free video course on rural Airbnb investing. The property calculator includes 3 free analyses, with additional analyses available via purchased credits. Teeco also offers professional services (design, setup, mentorship, cohosting) à la carte.",
                  },
                },
              ],
            }),
          }}
        />
      </article>

      <Footer />
    </div>
  );
}
